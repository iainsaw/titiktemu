import { createServerFn } from "@tanstack/react-start";
import { type Kawasan } from "./vitality-data";

const OPENROUTER_MODELS = [
  "openrouter/free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "nvidia/nemotron-3.5-lightning:free",
  "deepseek/deepseek-r1:free",
];

function cleanAiResponse(text: string): string {
  if (!text) return "";

  // 1. Clear out <think> tags or reasoning blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Remove standard reasoning header sections if present
  if (/here's a thinking process:|thinking process:|analyze user input|formulate response/i.test(cleaned)) {
    const parts = cleaned.split(/\n\s*\n/);
    const validParts = parts.filter(p => 
      !/thinking process|analyze user input|formulate response|extract data|check if any|structure:|top 3 by property|let's list|let's sort|user wants|we need to|let's craft|count sentences/i.test(p)
    );
    if (validParts.length > 0) {
      cleaned = validParts.join("\n\n").trim();
    }
  }

  // 3. Remove leading English scratchpad / prompt restatements
  cleaned = cleaned.replace(/^(?:We need to|Let's craft|Ensure no extra|Count sentences|So recommendation:)[^\n]*\n?/gi, "");
  
  // 4. If AI wraps quoted Indonesian recommendation inside an English reasoning block
  if (/we need to|let's craft|recommendation:/i.test(cleaned)) {
    const matches = Array.from(cleaned.matchAll(/["“]([A-Z0-9\s\.,\(\)\-\%\/\*\#\:\;]{20,})["”]/g));
    if (matches.length > 0) {
      cleaned = matches[matches.length - 1][1];
    }
  }

  // 5. Clean orphan trailing sentences like "That's two sentences." or "Ensure no extra."
  cleaned = cleaned
    .replace(/(?:that's two sentences|ensure no extra|count sentences).*$/gi, "")
    .replace(/^["“']+|["”']+$/g, "")
    .trim();

  return cleaned;
}

async function callOpenRouterWithFallback(
  apiKey: string,
  messages: any[],
  options: { temperature?: number; max_tokens?: number } = {}
) {
  let lastError;
  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Titik Temu AI"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          ...options
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[OpenRouter] Gagal menggunakan model ${model}:`, errorText);
        lastError = new Error(errorText);
        continue;
      }

      const json = await response.json();
      if (json.choices?.[0]?.message?.content) {
        json.choices[0].message.content = cleanAiResponse(json.choices[0].message.content);
      }
      return json;
    } catch (error) {
      console.warn(`[OpenRouter] Exception dengan model ${model}:`, error);
      lastError = error;
    }
  }

  throw new Error("Semua model OpenRouter gagal digunakan. Error terakhir: " + (lastError?.message || lastError));
}

export const generateInsights = createServerFn({ method: "POST" })
  .validator((data: Kawasan[]) => data)
  .handler(async ({ data: kawasans }) => {
    const apiKey = process.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OpenRouter API Key");
    }

    // Summarize the data to send to the AI
    const dataSummary = kawasans.map(k => ({
      nama: k.nama,
      klaster: k.klaster,
      skor_total: Object.values(k.skor).reduce((a, b) => a + b, 0) / Object.values(k.skor).length,
      skor_ekonomi: k.skor.ekonomi,
      skor_layanan: k.skor.layanan,
      skor_properti: k.skor.properti,
      umkm: k.umkm
    }));

    const prompt = `
Anda adalah seorang analis tata kota (urban planner) ahli.
Analisis data kawasan transit berikut di Kota Bandung:
${JSON.stringify(dataSummary, null, 2)}

Tugas Anda:
Berikan TEPAT 1 (satu) insight berupa kalimat observasi tajam berdasarkan data di atas.
Fokus pada perbandingan, anomali, kesenjangan layanan, atau potensi ekonomi (UMKM/Properti).
Insight harus ringkas (maksimal 180 karakter) dan ditulis dengan bahasa Indonesia baku yang mengalir, mudah dipahami investor atau pemerintah (seperti kutipan pengamat). 
Gunakan format **tebal** untuk menyoroti nama lokasi atau angka kunci, dan *miring* untuk penekanan agar kalimat lebih dinamis.
Jangan memakai nomor atau bullet points pada awal kalimat, langsung tulis teks kalimatnya saja.
Contoh output:
Kawasan sekitar **Stasiun Kiaracondong** punya keragaman usaha sangat tinggi (*78*) namun skor layanan hanya *52* — sinyal peluang tersembunyi bagi UMKM dan operator feeder.
`;

    let json;
    try {
      json = await callOpenRouterWithFallback(apiKey, [{ role: "user", content: prompt }], {
        temperature: 0.7,
        max_tokens: 150
      });
    } catch (error) {
      console.error("OpenRouter API error:", error);
      throw new Error("Failed to fetch AI insights");
    }

    const content = json.choices?.[0]?.message?.content || "";
    
    const insight = content.trim().replace(/^["“]+|["”]+$/g, '');
    
    // Fallback if the AI didn't format correctly
    if (!insight) {
      return [
        "Analisis AI tidak tersedia saat ini. Silakan coba lagi."
      ];
    }
    
    return [insight];
  });

export const generateOpportunityInsight = createServerFn({ method: "POST" })
  .validator((data: { kws: Kawasan; role: string }) => data)
  .handler(async ({ data: { kws, role } }) => {
    const apiKey = process.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OpenRouter API Key");
    }

    let persona = "penasihat bisnis UMKM profesional";
    let task = "peluang usaha atau UMKM yang paling menguntungkan untuk dibuka";
    
    if (role === "investor") {
      persona = "ahli real estate dan investor properti";
      task = "jenis properti atau strategi investasi yang paling prospektif";
    } else if (role === "pemerintah") {
      persona = "ahli perencanaan kota dan pembuat kebijakan pemerintah";
      task = "prioritas pembangunan fasilitas atau infrastruktur publik yang paling mendesak untuk ditingkatkan";
    }

    const prompt = `Anda adalah ahli tata kota dan ${persona}.
Kawasan ${kws.nama} memiliki skor (0-100):
Layanan Umum: ${kws.skor.layanan}
Akses Transportasi: ${kws.skor.akses}
Pasar Properti: ${kws.skor.properti}
Keragaman Ekonomi: ${kws.skor.ekonomi}
Kepadatan Penduduk: ${kws.penduduk ? Math.round(kws.kepadatan || 0) + ' / km²' : 'Tidak diketahui'}.

INSTRUKSI KETAT:
- Berikan 1 rekomendasi spesifik ${task} di area ini beserta alasan logisnya.
- TULIS SELURUH JAWABAN DALAM BAHASA INDONESIA BAKU YANG PROFESIONAL.
- DILARANG MENULISKAN PROSES BERPIKIR (REASONING), TEKS BAHASA INGGRIS, ATAU META-COMMENT SEPERTI "We need to", "Let's craft", ATAU "Count sentences".
- Jawab HANYA 2 kalimat ringkas dan padat. Langsung ke isi rekomendasi.`;

    let json;
    try {
      json = await callOpenRouterWithFallback(apiKey, [{ role: "user", content: prompt }], {
        temperature: 0.7,
        max_tokens: 150
      });
    } catch (error) {
      throw new Error("Failed to fetch AI insights");
    }

    return json.choices?.[0]?.message?.content || "Gagal memproses rekomendasi AI.";
  });

export const parseSearchQuery = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data: { query } }) => {
    const apiKey = process.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OpenRouter API Key");
    }

    const prompt = `Anda adalah asisten pencarian cerdas untuk sistem GIS Kota Bandung.
Pengguna mencari lokasi: "${query}".

Tugas Anda:
1. Perbaiki jika ada salah ketik (typo).
2. Tentukan apakah lokasi ini masuk atau bersinggungan dengan wilayah Kota Bandung (misalnya Kopo, Pasteur, Cibiru, Buah Batu, Dago).
3. Jika lokasinya jelas-jelas SAMA SEKALI BUKAN di Kota Bandung (misal: Jakarta, Lembang, Soreang, Cimahi, Surabaya), balas HANYA dengan kata: OUTSIDE
4. Jika lokasinya di atau bersinggungan dengan Kota Bandung, berikan query pencarian yang bersih dan optimal untuk OpenStreetMap Nominatim agar akurat mengarah ke Kota Bandung. Balas HANYA dengan query tersebut (tanpa tanda kutip, tanpa penjelasan apapun).

Contoh:
Input: kopo
Output: Jalan Kopo, Kota Bandung

Input: cmahi
Output: OUTSIDE

Input: buh btu
Output: Buahbatu, Kota Bandung`;

    let json;
    try {
      json = await callOpenRouterWithFallback(apiKey, [{ role: "user", content: prompt }], {
        temperature: 0.1,
        max_tokens: 50
      });
    } catch (error) {
      throw new Error("Failed to parse search query via AI");
    }

    const jsonResult = json;
    const result = json.choices?.[0]?.message?.content?.trim() || "";
    
    if (result.includes("OUTSIDE")) {
      return { error: "OUTSIDE" };
    }
    
    return { query: result || query };
  });
