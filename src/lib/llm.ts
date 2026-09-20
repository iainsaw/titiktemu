const getOpenRouterKey = () => import.meta.env.VITE_OPENROUTER_API_KEY;
const getGeminiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

export type Pesan = { role: "user" | "assistant"; content: string };

// Model gratis terbaik di OpenRouter (Sept 2026)
// Urutan = prioritas: model terbaik di atas, fallback di bawah
const OPENROUTER_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-ultra:free",
  "openrouter/free",
];

function cleanAiResponse(text: string): string {
  if (!text) return "";

  // 1. Remove <think>...</think> tags and any reasoning blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/<(?:reasoning|analysis|thought|internal)[^>]*>[\s\S]*?<\/(?:reasoning|analysis|thought|internal)>/gi, "").trim();

  // 2. Remove common AI prompt/header echoes if present
  cleaned = cleaned
    .replace(
      /^(?:\(Bahasa Indonesia Baku\):?|Sentence \d+[^:]*:?|Constraint:?[^\n]*|Output:?|Here is the recommendation:?|Here is the insight:?|Here's my insight:?|My insight:?)\s*/gi,
      "",
    )
    .trim();

  // 3. Remove ALL dollar signs (math LaTeX artifacts, currency symbols mistakenly added)
  cleaned = cleaned.replace(/\$([^\$\n]+)\$/g, "$1"); // $...$ wrappers
  cleaned = cleaned.replace(/\$(\d[\d.,]*)/g, "Rp $1"); // $200 -> Rp 200
  cleaned = cleaned.replace(/\$/g, ""); // any remaining stray $

  // 4. Convert raw markdown header hashtags (# Header -> **Header**)
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, "**$1**");

  // 5. Remove leading/trailing quotes if the whole text is wrapped in quotes
  cleaned = cleaned.replace(/^["\u201C\u201D']+|["\u201C\u201D']+$/g, "").trim();

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

async function callOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string,
): Promise<string> {
  let lastError;
  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetchWithRetry(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:8090",
            "X-Title": "Titik Temu WebGIS",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 2048,
          }),
        },
        2, // retry twice per model
        400,
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

async function callGemini(
  messages: { role: string; content: string }[],
  apiKey: string,
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  const contents =
    nonSystemMsgs.length > 0
      ? nonSystemMsgs.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }))
      : [{ role: "user", parts: [{ text: "Halo" }] }];

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (systemMsg) {
    requestBody.system_instruction = {
      parts: [{ text: systemMsg.content }],
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;

  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
    3,
    500,
  );

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) {
    throw new Error("Google Gemini tidak mengembalikan jawaban.");
  }

  return cleanAiResponse(text);
}

/**
 * Fungsi utama untuk memanggil AI.
 * Prioritas: OpenRouter → Gemini (fallback)
 * Gemini sementara dinonaktifkan karena format key AQ. belum didukung
 * oleh endpoint generativelanguage.googleapis.com.
 */
async function callAI(
  messages: { role: string; content: string }[],
): Promise<string> {
  const openRouterKey = getOpenRouterKey();
  const geminiKey = getGeminiKey();

  if (!openRouterKey && !geminiKey) {
    throw new Error("API Key AI belum dikonfigurasi di file .env");
  }

  // 1. Coba OpenRouter dulu (provider utama saat ini)
  if (openRouterKey) {
    try {
      return await callOpenRouter(messages, openRouterKey);
    } catch (e: any) {
      console.warn("[OpenRouter gagal, mencoba Gemini fallback]:", e.message);
      // Jatuh ke Gemini fallback jika ada
    }
  }

  // 2. Fallback ke Gemini (jika key tersedia)
  if (geminiKey) {
    try {
      return await callGemini(messages, geminiKey);
    } catch (e: any) {
      console.error("[Google Gemini API Error]:", e.message);
      throw new Error(`AI Error: ${e.message}`);
    }
  }

  throw new Error("Semua provider AI gagal memproses permintaan.");
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

  return callAI([{ role: "user", content: prompt }]);
}

/**
 * Memulai atau melanjutkan percakapan AI Chat.
 */
export async function sendAiChat(
  konteks: string,
  history: Pesan[],
  input: string,
): Promise<string> {
  const systemInstruction = `Anda adalah AI asisten resmi "Titik Temu" — platform WebGIS Vitalitas Transit Kota Bandung.

=== ATURAN MUTLAK (WAJIB DIIKUTI, TIDAK BOLEH DILANGGAR) ===

ATURAN 1 — TOPIK YANG LANGSUNG DIJAWAB (TANPA PENOLAKAN, TANPA MINTA MAAF):
- Semua pertanyaan tentang: kawasan Kota Bandung, vitalitas transit, harga tanah, properti, UMKM, aksesibilitas, tata kota, investasi.
- Pertanyaan budget/modal DALAM MATA UANG APAPUN (rupiah, dolar, euro, dll.) → konversi ke IDR jika perlu, lalu LANGSUNG rekomendasikan kawasan berdasarkan data harga tanah 16 kawasan pilot. JANGAN menolak, JANGAN meminta maaf.
- Contoh yang WAJIB dijawab: "punya 1500 dolar mau investasi", "budget 200 juta", "modal 50 ribu dolar". Ini semua pertanyaan investasi kawasan Bandung yang sah.
- Pertanyaan umum tentang Kota Bandung → boleh dijawab secara perkotaan.

ATURAN 2 — TOPIK YANG DITOLAK (1 kalimat singkat, tanpa penjelasan panjang):
- Kode pemrograman, resep, matematika umum, hiburan, cerita fiksi, topik yang SAMA SEKALI tidak ada hubungannya dengan Bandung/properti/transit/investasi.
- Contoh penolakan yang benar: "Maaf, saya hanya dapat membantu terkait kawasan dan transit Kota Bandung."

ATURAN 3 — FORMAT OUTPUT:
- DILARANG KERAS: format LaTeX ($...$), tanda pagar # sebagai judul.
- Tulis harga dalam Bahasa Indonesia: "10 juta rupiah per meter persegi" atau "Rp 10.000.000/m²".
- Gunakan **teks tebal** untuk nama kawasan dan angka penting.
- Maksimal 150 kata. Boleh pakai bullet points.
- DILARANG jawaban kontradiktif: pilih satu — jawab ATAU tolak. Tidak boleh dua-duanya.

=== CONTOH JAWABAN YANG BENAR ===

Pertanyaan: "Kawasan mana yang harga tanahnya paling terjangkau?"
Jawaban BENAR: "Berdasarkan data 16 kawasan pilot, kawasan dengan harga tanah terendah adalah **Stasiun Cimindi** (~0-3 jt/m²), **Terminal Cicaheum** (~3-5 jt/m²), dan **Stasiun Kiaracondong** (~4-6 jt/m²). Kawasan ini jauh lebih terjangkau dibanding Braga atau Alun-Alun yang bisa mencapai 15-25 jt/m²."

Pertanyaan: "Aku punya uang 1500 dolar, enaknya investasi di kawasan mana?"
Jawaban BENAR: "1.500 USD setara sekitar Rp 24 juta (kurs ~Rp 16.000). Dengan modal ini, kawasan yang relevan untuk dipertimbangkan adalah **Stasiun Cimindi**, **Terminal Cicaheum**, atau **Stasiun Kiaracondong** — ketiganya memiliki harga tanah per m² yang lebih terjangkau dibanding kawasan pusat. Untuk investasi jangka panjang, perhatikan juga skor aksesibilitas transit dan potensi UMKM di kawasan tersebut."

Jawaban yang SALAH (JANGAN LAKUKAN): "Maaf, saya hanya dapat memproses... [lalu langsung menjawab]"

=== DATA DASHBOARD SAAT INI ===
${konteks}`;

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: input },
  ];

  return callAI(messages);
}

/**
 * Versi streaming dari sendAiChat.
 * Memanggil API yang sama lalu mensimulasikan streaming
 * dengan memecah teks per chunk dan memanggil onChunk secara bertahap.
 *
 * @param onChunk - callback dipanggil setiap kali ada chunk teks baru
 * @returns full response string
 */
export async function sendAiChatStream(
  konteks: string,
  history: Pesan[],
  input: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  // Dapatkan full response terlebih dahulu
  const full = await sendAiChat(konteks, history, input);

  if (signal?.aborted) return full;

  // Simulasikan streaming: pecah per kata + batas chunk 3-5 kata
  const words = full.split(" ");
  let buffer = "";
  const CHUNK_WORDS = 4; // kirim tiap N kata
  const DELAY_MS = 28; // jeda antar chunk (ms)

  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) break;
    buffer += (i === 0 ? "" : " ") + words[i];
    if ((i + 1) % CHUNK_WORDS === 0 || i === words.length - 1) {
      onChunk(buffer);
      buffer = "";
      await new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return full;
}

/**
 * Generate 2-3 pertanyaan follow-up singkat berdasarkan konteks
 * dan respons terakhir AI.
 * Mengembalikan array string (kosong jika gagal).
 */
export async function generateFollowUpChips(konteks: string, lastReply: string): Promise<string[]> {
  const prompt = `Berdasarkan percakapan ini tentang kawasan transit Kota Bandung, berikan TEPAT 3 pertanyaan follow-up singkat yang relevan. Setiap pertanyaan maksimal 10 kata. Format: hanya 3 baris teks, satu pertanyaan per baris, TANPA nomor dan TANPA penjelasan.

Konteks data:
${konteks.slice(0, 600)}

Jawaban AI sebelumnya:
${lastReply.slice(0, 400)}`;

  try {
    const raw = await callAI([{ role: "user", content: prompt }]);
    const lines = raw
      .split("\n")
      .map((l) => l.replace(/^[\d\-\*\.\s]+/, "").trim())
      .filter((l) => l.length > 5 && l.length < 120)
      .slice(0, 3);
    return lines;
  } catch {
    return [];
  }
}
