const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

export type Pesan = { role: "user" | "assistant"; content: string };

const OPENROUTER_MODELS = [
  "openrouter/free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
];

function cleanAiResponse(text: string): string {
  if (!text) return "";
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  if (/here's a thinking process:|thinking process:/i.test(cleaned)) {
    const sections = cleaned.split(/\n\s*\n/);
    const contentSections = sections.filter(sec => 
      !/thinking process|analyze user input|formulate response|extract data|check if any|structure:|top 3 by property|let's list|let's sort|user wants/i.test(sec)
    );
    if (contentSections.length > 0) {
      cleaned = contentSections.join("\n\n").trim();
    }
  }

  if (/we need to give|let's craft:|count sentences:/i.test(cleaned)) {
    const matches = Array.from(cleaned.matchAll(/["“]([^"”]{20,})["”]/g));
    if (matches.length > 0) {
      cleaned = matches[matches.length - 1][1];
    } else {
      cleaned = cleaned
        .replace(/^[\s\S]*?(?:let's craft:|"|“)/i, "")
        .replace(/["”]?\s*(?:that's two sentences|ensure no extra|count sentences).*$/i, "");
    }
  }

  return cleaned.trim();
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
          reasoning: { exclude: true },
          max_tokens: 1500, // Batas aman agar OpenRouter tidak mencoba mengalokasikan kredit untuk 65k token
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || "Gagal menghubungi OpenRouter API";
        console.warn(`[OpenRouter] Gagal dengan model ${model}:`, errMsg);
        lastError = new Error(errMsg);
        continue; // Coba model selanjutnya untuk error apapun (429, 402, 500, dll)
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "";
      return cleanAiResponse(rawContent);
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
