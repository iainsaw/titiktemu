import { createServerFn } from "@tanstack/react-start";
import { type Kawasan } from "./vitality-data";

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
Analisis data kawasan transit berikut di Bandung Raya:
${JSON.stringify(dataSummary, null, 2)}

Tugas Anda:
Berikan TEPAT 2 (dua) insight berupa kalimat observasi tajam berdasarkan data di atas.
Fokus pada perbandingan, anomali, kesenjangan layanan, atau potensi ekonomi (UMKM/Properti).
Setiap insight harus ringkas (maksimal 180 karakter) dan ditulis dengan bahasa Indonesia baku yang mengalir, mudah dipahami investor atau pemerintah (seperti kutipan pengamat). 
Jangan memakai nomor atau bullet points pada awal kalimat, langsung tulis teks kalimatnya saja. Pisahkan kedua insight dengan karakter pipa '|'.
Contoh output:
Kawasan sekitar Stasiun Kiaracondong punya keragaman usaha sangat tinggi (78) namun skor layanan hanya 52 — sinyal peluang tersembunyi.|Gedebage mencatat kesenjangan layanan terlebar di pilot (28). Satu rute feeder baru diperkirakan menaikkan skor totalnya secara signifikan.
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Titik Temu AI"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      console.error("OpenRouter API error:", await response.text());
      throw new Error("Failed to fetch AI insights");
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || "";
    
    // Split by pipe character, clean up quotes or whitespace
    const insights = content.split("|").map((s: string) => s.trim().replace(/^["“]+|["”]+$/g, '')).filter(Boolean);
    
    // Fallback if the AI didn't format correctly
    if (insights.length < 2) {
      return [
        "Analisis AI tidak tersedia saat ini. Silakan coba lagi.",
        "Menunggu pemrosesan data..."
      ];
    }
    
    return insights.slice(0, 2);
  });
