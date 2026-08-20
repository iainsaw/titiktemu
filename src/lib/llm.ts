const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

export type Pesan = { role: "user" | "assistant"; content: string };

async function callOpenRouter(messages: { role: string; content: string }[]): Promise<string> {
  if (!apiKey) {
    throw new Error("VITE_OPENROUTER_API_KEY belum dikonfigurasi di file .env");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:8090", // Optional, for OpenRouter rankings
      "X-Title": "Titik Temu WebGIS", // Optional, for OpenRouter rankings
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      // We can use gemini via OpenRouter, or any other fast model like haiku/llama
      model: "google/gemini-2.5-flash",
      messages: messages,
      max_tokens: 1500, // Batas aman agar OpenRouter tidak mencoba mengalokasikan kredit untuk 65k token
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Gagal menghubungi OpenRouter API");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Meminta penjelasan/insight spesifik untuk satu kawasan.
 * @param konteks Teks hasil `konteksKawasan()`
 */
export async function getAiInsight(konteks: string): Promise<string> {
  const prompt = `Anda adalah AI asisten untuk "Titik Temu", sebuah dashboard webGIS yang menganalisis potensi transit kawasan di Bandung Raya.
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
  const systemInstruction = `Anda adalah AI asisten untuk "Titik Temu", sebuah dashboard webGIS yang menganalisis potensi transit kawasan di Bandung Raya. Anda bertugas menjawab pertanyaan pengguna tentang 16 kawasan percontohan berdasarkan data dashboard saat ini.
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
