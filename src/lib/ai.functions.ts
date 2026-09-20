import { createServerFn } from "@tanstack/react-start";
import { type Kawasan } from "./vitality-data";

// Model gratis terbaik di OpenRouter (Sept 2026)
// Urutan = prioritas: model terbaik di atas, fallback di bawah
const OPENROUTER_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-ultra:free",
  "openrouter/free",
];

function cleanAiResponse(text: string): string {
  if (!text) return "";

  // 1. Remove <think>...</think> tags if any
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Remove common AI prompt/header echoes if present
  cleaned = cleaned
    .replace(
      /^(?:\(Bahasa Indonesia Baku\):?|Sentence \d+[^:]*:?|Constraint:?[^\n]*|Output:?|Here is the recommendation:?)\s*/gi,
      "",
    )
    .trim();

  // 3. Remove dollar sign wrappers ($200$ -> 200) or standalone $ before numbers ($200 -> 200)
  cleaned = cleaned.replace(/\$([^\$\n]+)\$/g, "$1");
  cleaned = cleaned.replace(/\$(\d+)/g, "$1");

  // 4. Convert raw markdown header hashtags (# Header -> **Header**)
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, "**$1**");

  // 5. Remove leading/trailing quotes if the whole text is wrapped in quotes
  cleaned = cleaned.replace(/^["“']+|["”']+$/g, "").trim();

  return cleaned;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delayMs = 500,
): Promise<Response> {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const errText = await res.text().catch(() => res.statusText);
      lastError = new Error(`HTTP ${res.status}: ${errText}`);
      console.warn(`[AI Request Attempt ${attempt}/${retries} Failed]:`, lastError.message);
    } catch (e: any) {
      lastError = e;
      console.warn(`[AI Network Attempt ${attempt}/${retries} Exception]:`, e.message);
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function callOpenRouterWithFallback(
  apiKey: string,
  messages: any[],
  options: { temperature?: number; max_tokens?: number } = {},
) {
  const openRouterKey = getOpenRouterKey();
  const geminiKey = getGeminiKey();

  // 1. Coba OpenRouter dulu (provider utama)
  if (openRouterKey) {
    let lastError;
    for (const model of OPENROUTER_MODELS) {
      try {
        const response = await fetchWithRetry(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Titik Temu AI",
            },
            body: JSON.stringify({
              model: model,
              messages: messages,
              ...options,
            }),
          },
          2, // retry twice
          400,
        );

        const json = await response.json();
        if (json.choices?.[0]?.message?.content) {
          json.choices[0].message.content = cleanAiResponse(json.choices[0].message.content);
        }
        return json;
      } catch (error: any) {
        console.warn(`[OpenRouter] Exception dengan model ${model}:`, error.message);
        lastError = error;
      }
    }
    // Jika semua model OpenRouter gagal, coba Gemini fallback
    console.warn("[OpenRouter semua model gagal, mencoba Gemini fallback]");
  }

  // 2. Fallback ke Gemini (jika key tersedia)
  if (geminiKey) {
    const promptText = messages.map((m) => m.content).join("\n\n");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`;

    try {
      const response = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: options.temperature || 0.7,
              maxOutputTokens: options.max_tokens || 2048,
            },
          }),
        },
        3,
        500,
      );

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) {
        throw new Error("Google Gemini tidak mengembalikan jawaban.");
      }

      return { choices: [{ message: { content: cleanAiResponse(text) } }] };
    } catch (e: any) {
      console.error("[Google Gemini API Error]:", e.message);
      throw new Error(`AI Error: ${e.message}`);
    }
  }

  throw new Error("Semua provider AI gagal memproses permintaan.");
}

const getOpenRouterKey = () =>
  process.env.VITE_OPENROUTER_API_KEY ||
  process.env.OPENROUTER_API_KEY ||
  import.meta.env.VITE_OPENROUTER_API_KEY;

const getGeminiKey = () =>
  process.env.VITE_GEMINI_API_KEY ||
  import.meta.env.VITE_GEMINI_API_KEY;

const getApiKey = () => getOpenRouterKey() || getGeminiKey();

export const generateInsights = createServerFn({ method: "POST" })
  .validator((data: Kawasan[]) => data)
  .handler(async ({ data: kawasans }) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Missing AI API Key (VITE_GEMINI_API_KEY atau VITE_OPENROUTER_API_KEY)");
    }

    // Summarize the data to send to the AI
    const dataSummary = kawasans.map((k) => ({
      nama: k.nama,
      klaster: k.klaster,
      skor_total: Object.values(k.skor).reduce((a, b) => a + b, 0) / Object.values(k.skor).length,
      skor_ekonomi: k.skor.ekonomi,
      skor_layanan: k.skor.layanan,
      skor_properti: k.skor.properti,
      umkm: k.umkm,
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
        max_tokens: 1000,
      });
    } catch (error) {
      console.error("AI API error:", error);
      throw new Error("Failed to fetch AI insights");
    }

    const content = json.choices?.[0]?.message?.content || "";

    const insight = content.trim().replace(/^["“]+|["”]+$/g, "");

    // Fallback if the AI didn't format correctly
    if (!insight) {
      return ["Analisis AI tidak tersedia saat ini. Silakan coba lagi."];
    }

    return [insight];
  });

export const generateOpportunityInsight = createServerFn({ method: "POST" })
  .validator((data: { kws: Kawasan; role: string }) => data)
  .handler(async ({ data: { kws, role } }) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Missing AI API Key (VITE_GEMINI_API_KEY atau VITE_OPENROUTER_API_KEY)");
    }

    let persona = "penasihat bisnis UMKM profesional";
    let task = "peluang usaha atau UMKM yang paling menguntungkan untuk dibuka";

    if (role === "investor") {
      persona = "ahli real estate dan investor properti";
      task = "jenis properti atau strategi investasi yang paling prospektif";
    } else if (role === "pemerintah") {
      persona = "ahli perencanaan kota dan pembuat kebijakan pemerintah";
      task =
        "prioritas pembangunan fasilitas atau infrastruktur publik yang paling mendesak untuk ditingkatkan";
    }

    const prompt = `Anda adalah seorang ahli tata kota dan ${persona}.
Analisis data statistik kawasan ${kws.nama} di Kota Bandung:
- Layanan Umum: ${kws.skor.layanan}/100
- Akses Transportasi: ${kws.skor.akses}/100
- Pasar Properti: ${kws.skor.properti}/100
- Keragaman Ekonomi: ${kws.skor.ekonomi}/100
- Kepadatan Penduduk: ${kws.penduduk ? Math.round(kws.kepadatan || 0) + " jiwa/km²" : "Tidak diketahui"}

Tugas:
Berikan 1 rekomendasi terbaik mengenai ${task} di kawasan ${kws.nama} beserta alasannya.

Syarat Penulisan:
- Tulis langsung rekomendasi Anda dalam 2-3 kalimat Bahasa Indonesia yang padat, jelas, dan profesional.
- Pastikan kalimat diakhiri dengan tanda titik yang lengkap. Jangan terpotong.
- Langsung sampaikan rekomendasi dan alasannya tanpa judul, pengantar, atau teks bahasa Inggris.`;

    let json;
    try {
      json = await callOpenRouterWithFallback(apiKey, [{ role: "user", content: prompt }], {
        temperature: 0.7,
        max_tokens: 1000,
      });
    } catch (error) {
      throw new Error("Failed to fetch AI insights");
    }

    return json.choices?.[0]?.message?.content || "Gagal memproses rekomendasi AI.";
  });

export const parseSearchQuery = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data: { query } }) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Missing AI API Key (VITE_GEMINI_API_KEY atau VITE_OPENROUTER_API_KEY)");
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
        max_tokens: 50,
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
