import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function callGateway(messages: Msg[]) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "Missing API_KEY" }), { status: 500 });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: "google/gemini-3.6-flash", messages }),
  });

  if (res.status === 429) {
    return new Response(JSON.stringify({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (res.status === 402) {
    return new Response(
      JSON.stringify({ error: "Kuota AI habis. Silakan periksa saldo API Anda." }),
      { status: 402, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!res.ok) {
    const detail = await res.text();
    return new Response(JSON.stringify({ error: `Gateway error: ${detail.slice(0, 300)}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const reply = data.choices?.[0]?.message?.content ?? "";
  return new Response(JSON.stringify({ reply }), {
    headers: { "Content-Type": "application/json" },
  });
}

const SYSTEM = `Kamu adalah AI Assistant untuk WebGIS "Titik Temu" (Skor Vitalitas Transit, pilot Bandung Raya).
Jawab dalam Bahasa Indonesia yang ringkas, konkret, dan berbasis DATA KAWASAN yang diberikan di bawah.
Aturan:
- Selalu rujuk nama kawasan dan angka skor yang relevan.
- Jangan mengarang data yang tidak ada; kalau tidak tersedia, katakan keterbatasannya.
- Skor 0-100 dari empat komponen: Pasar Properti, Kesenjangan Layanan, Keragaman Ekonomi/UMKM, Aksesibilitas Transit, ditimbang menurut peran pengguna.
- Ingatkan singkat bahwa data ini prototipe/dummy realistis bila pengguna bertanya soal keakuratan.
- Maksimal ~150 kata, boleh pakai bullet.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: { role: "user" | "assistant"; content: string }[];
          konteks?: string;
        };
        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        if (!messages.length) {
          return new Response(JSON.stringify({ error: "messages kosong" }), { status: 400 });
        }

        return callGateway([
          { role: "system", content: `${SYSTEM}\n\nDATA KAWASAN SAAT INI:\n${body.konteks ?? "(tidak ada)"}` },
          ...messages,
        ]);
      },
    },
  },
});
