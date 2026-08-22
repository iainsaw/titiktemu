import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MapPin, Store, Layers, Building2, Landmark, ClipboardList } from "lucide-react";
import { AiIcon } from "@/components/AiIcon";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VitalityMap } from "@/components/VitalityMap";
import { KAWASAN as STATIC_KAWASAN, hitungSkor, type Kawasan } from "@/lib/vitality-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { RINGKASAN_SURVEI } from "@/lib/survei-data";
import { generateInsights } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
const heroVideo = { url: "/hero-transit.mp4" };

const KARTU = [
  {
    icon: Building2,
    judul: "Investor & Properti",
    teks: "Temukan kawasan transit dengan fundamental properti yang kuat dan potensi keuntungan terbaik untuk investasi Anda.",
    peran: "investor" as const,
    tombol: "Investor",
  },
  {
    icon: Landmark,
    judul: "Pemerintah & Perencana",
    teks: "Lihat di mana masyarakat paling membutuhkan akses transportasi, dan prioritaskan pembangunan fasilitas yang tepat sasaran.",
    peran: "pemerintah" as const,
    tombol: "Pemerintah",
  },
  {
    icon: Store,
    judul: "Aktivitas Ekonomi Mikro",
    teks: "Analisis pergerakan keramaian warga untuk menemukan lokasi jualan dan jam operasional paling strategis bagi bisnis Anda.",
    peran: "umkm" as const,
    tombol: "UMKM",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Titik Temu — Indeks Vitalitas Transit Bandung Raya" },
      {
        name: "description",
        content:
          "Platform Sistem Pendukung Keputusan Spasial (WebGIS) untuk mengukur Indeks Vitalitas Transit di kawasan Bandung Raya.",
      },
      { property: "og:title", content: "Titik Temu — Indeks Vitalitas Transit" },
      {
        property: "og:description",
        content:
          "Menganalisis potensi TOD melalui integrasi data properti, aksesibilitas transportasi, dan aktivitas ekonomi mikro.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Beranda,
});

function Beranda() {
  const [kawasans, setKawasans] = useState<Kawasan[]>(STATIC_KAWASAN);
  const [selectedId, setSelectedId] = useState<string>(STATIC_KAWASAN[0].id);
  const [typedTitle, setTypedTitle] = useState("");
  const fullTitle = "Titik Temu";

  const { data: insights, isLoading: isInsightsLoading } = useQuery({
    queryKey: ["ai-insights", kawasans],
    queryFn: () => generateInsights({ data: kawasans }),
    staleTime: Infinity,
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        setTypedTitle(fullTitle.slice(0, i + 1));
        i++;
        if (i >= fullTitle.length) clearInterval(interval);
      }, 100);
    }, 600);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  // Fetch 100% real computed analytics dari PostGIS Supabase
  useEffect(() => {
    async function loadRealData() {
      try {
        const { data, error } = await supabase.from('tod_stations').select('*');
        if (error || !data || data.length === 0) return;

        setKawasans(prev => prev.map(k => {
          const dbData = data.find(d => d.id === k.id);
          if (!dbData) return k;
          return {
            ...k,
            klaster: (dbData.klaster as Kawasan['klaster']) || k.klaster,
            umkm: dbData.umkm_count ?? k.umkm,
            hargaTanah: dbData.harga_tanah_m2 ? Math.round(dbData.harga_tanah_m2 * 10) / 10 : k.hargaTanah,
            skor: {
              properti: Math.min(100, Math.max(1, dbData.skor_properti ?? 0)),
              layanan: Math.min(100, Math.max(1, dbData.skor_layanan ?? 0)),
              ekonomi: Math.min(100, Math.max(1, dbData.skor_ekonomi ?? 0)),
              akses: Math.min(100, Math.max(1, dbData.skor_akses ?? 0)),
            },
          };
        }));
      } catch (e) {
        console.error("Gagal load data asli:", e);
      }
    }
    loadRealData();
  }, []);

  const rata = Math.round(
    kawasans.reduce((a, k) => a + hitungSkor(k, "investor"), 0) / kawasans.length,
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <video
          src={heroVideo.url}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label="Animasi kawasan transit Bandung Raya"
          className="hero-zoom absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/60" />
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-ink/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-background via-ink/40 to-transparent" />

        <div className="relative mx-auto max-w-[900px] px-4 pt-24 pb-12 text-center text-ink-foreground sm:px-5 sm:pt-36 sm:pb-16">
          <div className="hero-rise flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: "0.05s" }}>
            <span className="pill border border-ink-foreground/25 bg-ink/70 px-3 py-1 text-[11px] font-medium text-ink-foreground backdrop-blur-md sm:px-4 sm:py-1.5 sm:text-[13px]">
              MAPID WebGIS Competition 2026
            </span>
            <span className="pill border border-ink-foreground/25 bg-ink/70 px-3 py-1 text-[11px] font-medium text-ink-foreground backdrop-blur-md sm:px-4 sm:py-1.5 sm:text-[13px]">
              Pilot <span className="font-semibold">Bandung Raya</span>
            </span>

          </div>

          <h1
            className="headline hero-rise mt-5 text-[clamp(38px,12vw,76px)] text-ink-foreground sm:mt-6"
            style={{ animationDelay: "0.18s", minHeight: "1.1em" }}
          >
            {typedTitle}<span className="animate-pulse text-primary font-light">|</span>
          </h1>
          <p
            className="hero-rise mx-auto mt-4 max-w-[640px] text-[15px] leading-relaxed text-ink-foreground/85 sm:mt-5 sm:text-[22px]"
            style={{ animationDelay: "0.3s" }}
          >
            Peta pintar untuk melihat potensi ekonomi di sekitar stasiun dan halte. Mengubah jutaan data menjadi satu skor yang mudah dipahami oleh pemerintah, investor, dan UMKM.
          </p>
          <div
            className="hero-rise mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:mt-9 sm:gap-3"
            style={{ animationDelay: "0.42s" }}
          >
            <Link
              to="/peta"
              className="pill bg-background px-5 py-2.5 text-[14px] font-medium text-foreground transition-opacity hover:opacity-90 sm:px-7 sm:py-3 sm:text-[15px]"
            >
              Jelajahi Peta
            </Link>
            <Link
              to="/metodologi"
              className="pill border border-ink-foreground/25 px-5 py-2.5 text-[14px] font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10 sm:px-7 sm:py-3 sm:text-[15px]"
            >
              Pelajari metodologi ›
            </Link>
          </div>
        </div>


        <div className="relative mx-auto grid max-w-[1100px] grid-cols-1 gap-4 px-4 pb-10 sm:grid-cols-3 sm:gap-5 sm:px-5 sm:pb-14">
          {[
            {
              tag: "SKOR BERBASIS DATA",
              judul: `Rata-rata ${rata}`,
              teks: "Skor akurat yang dihitung berdasarkan sudut pandang masing-masing peran.",
            },
            {
              tag: "TERUJI DI LAPANGAN",
              judul: `${RINGKASAN_SURVEI.totalTitik} observasi`,
              teks: `Algoritma diverifikasi dengan menghitung kendaraan dan mewawancarai UMKM di ${RINGKASAN_SURVEI.totalLokasi} lokasi riil.`,
            },
            {
              tag: "REKOMENDASI CERDAS",
              judul: "Intelegensi Spasial",
              teks: "Tidak sekadar menampilkan angka, tapi memberikan rekomendasi bisnis dan tata ruang yang siap dieksekusi.",
            },
          ].map((c, i) => {
            return (
              <div
                key={c.tag}
                className="panel hero-rise flex flex-col justify-center p-5 rounded-[20px] sm:p-6 shadow-xl shadow-black/5"
                style={{ animationDelay: `${0.55 + i * 0.12}s` }}
              >
                <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground sm:text-[12px]">
                  {c.tag}
                </p>
                <p className="mt-2 font-display text-[18px] font-semibold tracking-tight leading-tight sm:text-[22px]">{c.judul}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground sm:text-[15px]">{c.teks}</p>
              </div>
            );
          })}
        </div>
      </section>


      <main className="mx-auto max-w-[1100px] px-4 py-12 sm:px-5 sm:py-16">
        <section className="mx-auto max-w-[760px] text-center">
          <h2 className="headline text-[clamp(24px,7vw,40px)]">Mengapa Titik Temu Dibangun?</h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground sm:text-[16px]">
            Seringkali, keputusan bisnis atau tata ruang dibuat berdasarkan insting karena data properti, akses transportasi, dan ekonomi warga tersebar di mana-mana. Titik Temu menggabungkan semua data tersebut ke dalam satu peta interaktif, memberikan panduan yang jelas bagi Bappeda, Dinas Perhubungan, pengembang properti, hingga pelaku UMKM.
          </p>
        </section>

        <section className="tinted-section mt-10 grid grid-cols-1 gap-4 rounded-[24px] p-4 sm:grid-cols-2 sm:gap-5 sm:p-6 md:grid-cols-3 lg:mt-14">
          {KARTU.map((k, i) => {
            const isDark = i === 1;
            const isGray = i === 2;
            
            return (
              <div 
                key={k.judul} 
                className={cn(
                  "flex flex-col p-6 rounded-[20px] sm:p-8 shadow-xl shadow-black/5 transition-transform hover:-translate-y-1",
                  isDark ? "bg-ink text-ink-foreground" : isGray ? "bg-secondary/50" : "bg-background border border-border/40"
                )}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className={cn(
                    "text-[11px] font-semibold uppercase tracking-widest sm:text-[12px]",
                    isDark ? "text-white/50" : "text-muted-foreground"
                  )}>
                    Akses Peran
                  </span>
                </div>
                
                <h3 className="font-display text-[22px] font-semibold tracking-tight leading-tight sm:text-[26px]">{k.judul}</h3>
                <p className={cn(
                  "mt-3 flex-1 text-[14px] leading-relaxed sm:text-[16px]",
                  isDark ? "text-white/70" : "text-muted-foreground"
                )}>{k.teks}</p>
                
                <Link
                  to="/peta"
                  search={{ peran: k.peran }}
                  className={cn(
                    "mt-8 block w-full rounded-full py-3.5 text-center text-[14px] font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] sm:text-[15px]",
                    isDark ? "bg-background text-foreground" : "bg-ink text-ink-foreground"
                  )}
                >
                  Pilih {k.tombol}
                </Link>
              </div>
            );
          })}
        </section>

        <section className="mt-10 grid grid-cols-2 gap-2.5 sm:gap-3 lg:mt-14 lg:grid-cols-4">

          <Stat icon={MapPin} label="Kawasan dianalisis" value={`${kawasans.length}`} sub="grid 200 m" />
          <Stat icon={ClipboardList} label="Titik survei lapangan" value={`${RINGKASAN_SURVEI.totalTitik}`} sub={`${RINGKASAN_SURVEI.totalLokasi} lokasi`} />
          <Stat icon={Layers} label="Skor rata-rata pilot" value={`${rata}`} sub="peran investor" />
          <Stat
            icon={Store}
            label="UMKM tercatat"
            value={kawasans.reduce((a, b) => a + b.umkm, 0).toLocaleString("id-ID")}
            sub="survei + data sekunder"
          />
        </section>

        <section className="mt-10 lg:mt-14">
          <div className="panel relative flex flex-col overflow-hidden p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[12px]">Cuplikan peta vitalitas</h2>
              <Link
                to="/peta"
                className="text-[11px] font-medium text-primary hover:underline sm:text-[12px]"
              >
                Buka Peta Penuh ›
              </Link>
            </div>
            
            {/* Map Section */}
            <div className="relative w-full overflow-hidden rounded-[20px] border border-border/40 bg-muted/30 shadow-inner">
              <VitalityMap
                kawasan={kawasans}
                role="investor"
                compact
                selectedId={selectedId}
                onSelect={setSelectedId}
                className="h-[320px] w-full sm:h-[440px]"
                fill
              />

              {/* Floating AI Insights Section (Chat Bubble) */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3 sm:bottom-4 sm:left-4 sm:max-w-[420px]">
                <div className="shrink-0 drop-shadow-md">
                  <AiIcon className="size-8 text-primary" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-border/40 bg-background p-3.5 text-[13px] leading-relaxed text-foreground shadow-2xl sm:p-4 sm:text-[14px]">
                  {isInsightsLoading ? (
                    <div className="animate-pulse space-y-2.5">
                      <div className="h-2 w-3/4 rounded bg-muted-foreground/30"></div>
                      <div className="h-2 w-1/2 rounded bg-muted-foreground/30"></div>
                    </div>
                  ) : (
                    insights?.map((insight: string, idx: number) => (
                      <p key={idx}>{insight}</p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="ink-section">
        <div className="mx-auto max-w-[860px] px-4 py-16 text-center sm:px-5 sm:py-24">
          <h2 className="headline text-[clamp(28px,8vw,50px)]">
            Mulai dari peta.
            <br />
            Lanjut ke keputusan.
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-relaxed opacity-70 sm:mt-5 sm:text-[17px]">
            Jelajahi 16 kawasan pilot, bandingkan lewat Vitality Twin, dan uji skenario penambahan
            layanan transit sebelum satu rupiah pun dibelanjakan.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/peta"
              className="pill bg-primary px-6 py-2.5 text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Jelajahi Peta Interaktif
            </Link>
            <Link
              to="/analisis"
              className="pill border border-ink-foreground/25 px-6 py-2.5 text-[15px] font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10"
            >
              Analisis & Simulasi ›
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="flex flex-col justify-center p-5 rounded-[20px] sm:p-6 bg-background shadow-xl shadow-black/5 border border-border/40">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[12px]">{label}</p>
      <p className="font-display text-[32px] font-semibold tracking-tight leading-none sm:text-[42px]">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] uppercase tracking-widest text-muted-foreground leading-relaxed sm:text-[12px]">{sub}</p>
    </div>
  );
}
