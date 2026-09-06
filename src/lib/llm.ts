const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY;

export type Pesan = { role: "user" | "assistant"; content: string };

const OPENROUTER_MODELS = [
  "openrouter/free",
  "nvidia/nemotron-3.5-lightning:free",
  "minimax/minimax-m3:free",
  "z-ai/glm-5.2:free",
  "google/gemma-4-31b-it:free"
];

function cleanAiResponse(text: string): string {
  if (!text) return "";

  // 1. Remove <think>...</think> tags if any
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Remove common AI prompt/header echoes if present
  cleaned = cleaned.replace(/^(?:\(Bahasa Indonesia Baku\):?|Sentence \d+[^:]*:?|Constraint:?[^\n]*|Output:?|Here is the recommendation:?)\s*/gi, "").trim();

  // 3. Remove ALL dollar signs (math LaTeX artifacts, currency symbols mistakenly added)
  cleaned = cleaned.replace(/\$([^\$\n]+)\$/g, "$1"); // $...$ wrappers
  cleaned = cleaned.replace(/\$(\d[\d.,]*)/g, "Rp $1"); // $200 -> Rp 200
  cleaned = cleaned.replace(/\$/g, ""); // any remaining stray $

  // 4. Convert raw markdown header hashtags (# Header -> **Header**)
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, "**$1**");

  // 5. Remove leading/trailing quotes if the whole text is wrapped in quotes
  cleaned = cleaned.replace(/^[""']+|[""']+$/g, "").trim();

  return cleaned;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delayMs = 500): Promise<Response> {
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
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function callGeminiOrOpenRouter(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key AI belum dikonfigurasi di file .env");
  }

  // 1. If key starts with sk-or-v1-, use OpenRouter with automatic retry
  if (apiKey.startsWith("sk-or-v1-")) {
    let lastError;
    for (const model of OPENROUTER_MODELS) {
      try {
        const response = await fetchWithRetry(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": "http://localhost:8090",
              "X-Title": "Titik Temu WebGIS",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: model,
              messages: messages,
              max_tokens: 2048,
            })
          },
          2, // retry twice per model
          400
        );

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "";
        const cleaned = cleanAiResponse(rawContent);
        if (cleaned) return cleaned;
      } catch (e: any) {
        console.warn(`[OpenRouter] Exception dengan model ${model}:`, e.message);
        lastError = e;
      }
    }
    throw new Error(lastError?.message || "Gagal memproses AI via OpenRouter.");
  }

  // 2. Otherwise, treat key as Google Gemini API Key (gemini-flash-lite-latest with retry)
  const systemMsg = messages.find(m => m.role === "system");
  const nonSystemMsgs = messages.filter(m => m.role !== "system");

  const contents = nonSystemMsgs.length > 0
    ? nonSystemMsgs.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))
    : [{ role: "user", parts: [{ text: "Halo" }] }];

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  };

  if (systemMsg) {
    requestBody.system_instruction = {
      parts: [{ text: systemMsg.content }]
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      },
      3, // retry 3 times automatically
      500
    );

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      throw new Error("Google Gemini tidak mengembalikan jawaban.");
    }

    return cleanAiResponse(text);
  } catch (e: any) {
    console.error("[Google Gemini API Error]:", e.message);
    throw new Error(`Google Gemini Error: ${e.message}`);
  }
}

/**
 * Meminta penjelasan/insight spesifik untuk satu kawasan.
 */
export async function getAiInsight(konteks: string): Promise<string> {
  const prompt = `Anda adalah AI asisten untuk "Titik Temu", sebuah dashboard webGIS yang menganalisis potensi transit kawasan di Kota Bandung.
Tugas Anda adalah menjelaskan secara singkat dan jelas kepada pengguna mengapa kawasan ini mendapatkan skor vitalitas yang diberikan.

BATASAN DOMAIN:
Anda HANYA merespons hal yang berkaitan dengan Titik Temu, perkotaan Bandung, vitalitas transit, properti, harga tanah, UMKM, atau data kawasan.
Jika permintaan pengguna di luar konteks (koding, resep makanan, matematika umum, hiburan, dll.), tolak secara langsung dan singkat tanpa menjawab pertanyaan tersebut.

KONTEKS KAWASAN:
${konteks}

INSTRUKSI:
1. Buat satu atau dua paragraf singkat dan profesional.
2. Bandingkan dengan rata-rata 16 kawasan jika relevan.
3. Jangan halusinasi data, gunakan hanya data di atas.`;

  return callGeminiOrOpenRouter([
    { role: "user", content: prompt }
  ]);
}

/**
 * Memulai atau melanjutkan percakapan AI Chat.
 */
export async function sendAiChat(
  konteks: string,
  history: Pesan[],
  input: string
): Promise<string> {
  const systemInstruction = `Anda adalah AI asisten resmi "Titik Temu" — platform WebGIS Vitalitas Transit Kota Bandung.

=== ATURAN MUTLAK (WAJIB DIIKUTI, TIDAK BOLEH DILANGGAR) ===

ATURAN 1 — TOPIK YANG LANGSUNG DIJAWAB (TANPA PENOLAKAN, TANPA MINTA MAAF):
- Semua pertanyaan tentang: kawasan Kota Bandung, vitalitas transit, harga tanah, properti, UMKM, aksesibilitas, tata kota.
- Pertanyaan budget/harga ("tanah di bawah 200 juta", "kawasan termurah", dll.) → LANGSUNG jawab menggunakan data harga tanah per m² dari 16 kawasan pilot. JANGAN menolak, JANGAN meminta maaf.
- Pertanyaan umum tentang Kota Bandung → boleh dijawab secara perkotaan.

ATURAN 2 — TOPIK YANG DITOLAK (1 kalimat singkat, tanpa penjelasan panjang):
- Kode pemrograman, resep, matematika umum, hiburan, cerita fiksi, topik di luar Bandung/perkotaan/transit.
- Contoh penolakan yang benar: "Maaf, saya hanya dapat membantu terkait kawasan dan transit Kota Bandung."

ATURAN 3 — FORMAT OUTPUT:
- DILARANG KERAS: simbol $ (dollar), format LaTeX ($...$), tanda pagar # sebagai judul.
- Tulis harga dalam Bahasa Indonesia: "10 juta rupiah per meter persegi" atau "Rp 10.000.000/m²".
- Gunakan **teks tebal** untuk nama kawasan dan angka penting.
- Maksimal 150 kata. Boleh pakai bullet points.
- DILARANG jawaban kontradiktif: pilih satu — jawab ATAU tolak. Tidak boleh dua-duanya.

=== CONTOH JAWABAN YANG BENAR ===
Pertanyaan: "Kawasan mana yang harga tanahnya paling terjangkau?"
Jawaban yang BENAR: "Berdasarkan data 16 kawasan pilot, kawasan dengan indikator harga tanah terendah adalah **Stasiun Cimindi** (~0-3 jt/m²), **Terminal Cicaheum** (~3-5 jt/m²), dan **Stasiun Kiaracondong** (~4-6 jt/m²). Kawasan ini relatif lebih terjangkau dibanding Braga atau Alun-Alun yang bisa mencapai 15-25 jt/m²."

Jawaban yang SALAH (JANGAN LAKUKAN): "Maaf, saya hanya dapat memproses... [lalu langsung menjawab]"

=== DATA DASHBOARD SAAT INI ===
${konteks}`;

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: input }
  ];

  return callGeminiOrOpenRouter(messages);
}
