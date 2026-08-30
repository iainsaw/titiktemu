import { createServerFn } from "@tanstack/react-start";
import { type Kawasan } from "./vitality-data";

const OPENROUTER_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemini-2.5-flash",
];

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
        if (response.status === 429 || response.status === 402 || errorText.toLowerCase().includes("credits") || errorText.toLowerCase().includes("limit") || errorText.toLowerCase().includes("tokens")) {
          lastError = new Error(errorText);
          continue; 
        }
        throw new Error(errorText);
      }

      return await response.json();
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

Berdasarkan analisis GIS di atas, berikan 1 rekomendasi spesifik ${task} di area ini, beserta alasan logisnya. Jawab HANYA dalam 2 kalimat singkat yang padat dan persuasif, tanpa basa-basi.`;

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
