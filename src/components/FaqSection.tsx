import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { cn } from "@/lib/utils";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_LIST: FaqItem[] = [
  {
    id: "apa-itu-titik-temu",
    question: "Apa itu Titik Temu?",
    answer:
      "Titik Temu adalah platform Sistem Pendukung Keputusan Spasial (WebGIS) interaktif yang dirancang khusus untuk mengukur Indeks Vitalitas Transit di 16 kawasan pilot Kota Bandung. Platform ini mengintegrasikan data properti, aksesibilitas transportasi publik, dan aktivitas ekonomi mikro (UMKM) untuk membantu pengambilan keputusan berbasis data.",
  },
  {
    id: "bagaimana-skor-dihitung",
    question: "Bagaimana Skor Vitalitas Transit dihitung?",
    answer:
      "Skor Vitalitas Transit (0-100) dihitung berdasarkan 4 indikator utama: Keragaman Ekonomi/UMKM, Kesenjangan Layanan Publik, Aksesibilitas Transportasi, dan Pasar Properti/Harga Tanah. Pembobotan skor disesuaikan secara dinamis menurut kacamata pengguna (Investor Properti, Pemerintah, atau Pelaku UMKM).",
  },
  {
    id: "siapa-pengguna-titik-temu",
    question: "Siapa saja yang dapat memanfaatkan platform ini?",
    answer:
      "Titik Temu ditujukan untuk 3 aktor utama: (1) Investor Properti yang mencari lokasi potensial dengan kapitalisasi terbaik, (2) Pemerintah & Perencana Kota (Bappeda/Dishub) untuk memprioritaskan pembangunan infrastruktur publik, dan (3) Pelaku UMKM yang ingin menganalisis titik keramaian untuk membuka usaha.",
  },
  {
    id: "cara-kerja-temudata-ai",
    question: "Bagaimana cara kerja TemuData AI?",
    answer:
      "TemuData AI memanfaatkan Large Language Model (LLM) cerdas yang terhubung secara real-time dengan basis data dashboard Titik Temu. TemuData AI dapat memberikan penjelasan perbandingan skor kawasan, rekomendasi lokasi usaha, hingga analisis potensi investasi kawasan secara otomatis.",
  },
  {
    id: "fitur-lupa-password",
    question: "Bagaimana jika saya lupa kata sandi akun Titik Temu?",
    answer:
      "Anda dapat mengeklik tombol 'Lupa kata sandi?' pada jendela Masuk (Login Modal). Masukkan alamat email terdaftar Anda, dan sistem Supabase Auth kami akan secara otomatis mengirimkan tautan instruksi aman untuk pemulihan dan pembuatan kata sandi baru.",
  },
  {
    id: "apakah-data-terbaru",
    question: "Apakah data kawasan di Titik Temu terverifikasi dan akurat?",
    answer:
      "Ya. Algoritma Titik Temu memadukan data sekunder geospatial dengan survei validasi lapangan langsung pada titik-titik stasiun dan halte pilot di Kota Bandung. Data ini juga dapat disimulasikan melalui fitur Vitality Twin di menu Analisis.",
  },
];

export function FaqSection({ className }: { className?: string }) {
  const [openId, setOpenId] = useState<string | null>(FAQ_LIST[0].id);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className={cn("py-16 sm:py-24", className)}>
      <div className="mx-auto max-w-[800px] px-4 sm:px-6">
        
        {/* Section Header - Minimal & Clean */}
        <AnimatedSection className="text-center mb-12 sm:mb-16">
          <h2 className="headline text-[clamp(28px,6vw,44px)] tracking-tight">
            Pertanyaan Umum
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground max-w-[540px] mx-auto">
            Informasi lengkap seputar metrik vitalitas, fitur AI, data kawasan, dan akses platform Titik Temu.
          </p>
        </AnimatedSection>

        {/* Minimal Border-Divided Accordion List (No Cards, No Icons) */}
        <AnimatedSection delay={100} className="divide-y divide-border/50 border-y border-border/50">
          {FAQ_LIST.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div key={faq.id} className="py-5 sm:py-6 transition-colors">
                <button
                  onClick={() => toggle(faq.id)}
                  className="flex w-full items-center justify-between text-left group cursor-pointer outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-[16px] sm:text-[18px] font-semibold text-foreground group-hover:text-primary transition-colors pr-6 leading-snug">
                    {faq.question}
                  </span>
                  <div className="flex size-7 shrink-0 items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                    {isOpen ? <Minus className="size-4.5" /> : <Plus className="size-4.5" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="pt-3.5 pr-8 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[14.5px] leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </AnimatedSection>

      </div>
    </section>
  );
}
