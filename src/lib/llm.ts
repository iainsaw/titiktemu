const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

export type Pesan = { role: "user" | "assistant"; content: string };

const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
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

async function callOpenRouter(messages: { role: string; content: string }[]): Promise<string> {
  if (!apiKey) {
    throw new Error("VITE_OPENROUTER_API_KEY belum dikonfigurasi di file .env");
  }

  let lastError;

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:8090", // Optional, for OpenRouter rankings
          "X-Title": "Titik Temu WebGIS", // Optional, for OpenRouter rankings
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 1000,
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || "Gagal menghubungi OpenRouter API";
        console.warn(`[OpenRouter] Gagal dengan model ${model}:`, errMsg);
        lastError = new Error(errMsg);
        continue;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "";
      const cleaned = cleanAiResponse(rawContent);
      if (cleaned) return cleaned;
    } catch (e: any) {
      console.warn(`[OpenRouter] Exception dengan model ${model}:`, e);
      lastError = e;
    }
  }

  throw new Error(lastError?.message || "Semua model OpenRouter gagal digunakan");
}

/**
 * Meminta penjelasan/insight spesifik untuk satu kawasan.
 * @param konteks Teks hasil `konteksKawasan()`
 */
export async function getAiInsight(konteks: string): Promise<string> {
  const prompt = `Anda adalah AI asisten untuk "Titik Temu", sebuah dashboard webGIS yang menganalisis potensi transit kawasan di Kota Bandung.
Tugas Anda adalah menjelaskan secara singkat dan jelas kepada pengguna mengapa kawasan ini mendapatkan skor vitalitas yang diberikan.

KONTEKS KAWASAN:
${konteks}

INSTRUKSI:
1. Buat satu atau dua paragraf singkat dan profesional.
2. Jangan menggunakan format Markdown tebal/miring, buat senatural mungkin untuk dibaca cepat.
3. Bandingkan dengan rata-rata 16 kawasan jika relevan.
4. Jangan halusinasi data, gunakan hanya data di atas.`;

  return callOpenRouter([
    { role: "user", content: prompt }
  ]);
}

/**
 * Memulai atau melanjutkan percakapan AI Chat.
 * @param konteks Teks hasil `konteksDashboard()`
 * @param history Riwayat pesan sebelumnya
 * @param input Pertanyaan terbaru pengguna
 */
export async function sendAiChat(
  konteks: string,
  history: Pesan[],
  input: string
): Promise<string> {
  const systemInstruction = `Anda adalah AI asisten untuk "Titik Temu", sebuah dashboard webGIS yang menganalisis potensi transit kawasan di Kota Bandung. Anda bertugas menjawab pertanyaan pengguna tentang 16 kawasan percontohan berdasarkan data dashboard saat ini.
Gunakan format markdown yang rapi (bullet points, tebal) jika diperlukan. Jangan halusinasi angka yang tidak ada di konteks. Jika pengguna menanyakan rekomendasi, berikan berdasarkan skor tertinggi untuk kategori yang ditanyakan.

KONTEKS DASHBOARD SAAT INI:
${konteks}`;

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: input }
  ];

  return callOpenRouter(messages);
}
