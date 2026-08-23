import { createFileRoute } from "@tanstack/react-router";
import { callGateway } from "./chat";

const SYSTEM = `Kamu adalah mesin AI Insight untuk WebGIS "Titik Temu" (Skor Vitalitas Transit, pilot Kota Bandung).
Tugasmu: menjelaskan MENGAPA skor sebuah kawasan berbeda antar komponen, dalam Bahasa Indonesia.
Format jawaban WAJIB:
1. Satu kalimat kesimpulan utama.
2. Tiga bullet "Pendorong utama" / "Penghambat utama" / "Rekomendasi" — masing-masing satu kalimat dan menyebut angka.
Total maksimal 110 kata. Jangan mengarang data di luar yang diberikan.`;

export const Route = createFileRoute("/api/insight")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { konteks?: string };
        if (!body.konteks) {
          return new Response(JSON.stringify({ error: "konteks kosong" }), { status: 400 });
        }
        return callGateway([
          { role: "system", content: SYSTEM },
          { role: "user", content: body.konteks },
        ]);
      },
    },
  },
});
