import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MapPin, Store, Layers, Building2, Landmark, ClipboardList } from "lucide-react";
import { AiIcon } from "@/components/AiIcon";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VitalityMap } from "@/components/VitalityMap";
import { KAWASAN as STATIC_KAWASAN, hitungSkor, type Kawasan } from "@/lib/vitality-data";
import { supabase } from "@/lib/supabase";
import { RINGKASAN_SURVEI } from "@/lib/survei-data";
import { cn } from "@/lib/utils";
const heroVideo = { url: "/hero-transit.mp4" };

const KARTU = [
  {
    icon: Building2,
    judul: "Investor & Properti",
    teks: "Temukan kawasan transit dengan fundamental properti yang kuat dan potensi keuntungan terbaik untuk investasi Anda.",
    peran: "investor" as const,
    image: "/investor_bg.png",
  },
  {
    icon: Landmark,
    judul: "Pemerintah & Perencana",
    teks: "Lihat di mana masyarakat paling membutuhkan akses transportasi, dan prioritaskan pembangunan fasilitas yang tepat sasaran.",
    peran: "pemerintah" as const,
    image: "/pemerintah_bg.png",
  },
  {
    icon: Store,
    judul: "Aktivitas Ekonomi Mikro",
    teks: "Analisis pergerakan keramaian warga untuk menemukan lokasi jualan dan jam operasional paling strategis bagi bisnis Anda.",
    peran: "umkm" as const,
    image: "/umkm_bg.png",
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
                className="panel hero-rise flex flex-col p-6 rounded-[20px] sm:p-8 shadow-xl shadow-black/5"
                style={{ animationDelay: `${0.55 + i * 0.12}s` }}
              >
                <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground sm:text-[12px]">
                  {c.tag}
                </p>
                <p className="mt-4 font-display text-[18px] font-semibold tracking-tight leading-tight sm:text-[22px]">{c.judul}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground sm:text-[15px]">{c.teks}</p>
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

        <section className="mt-10 grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-6 md:grid-cols-3 lg:mt-14">
          {KARTU.map((k) => (
            <div 
              key={k.judul} 
              className="group relative flex h-[420px] flex-col overflow-hidden rounded-[24px] shadow-xl shadow-black/10 transition-all hover:-translate-y-1 hover:shadow-2xl sm:h-[480px]"
            >
              {/* Background Image */}
              <img 
                src={k.image} 
                alt={k.judul} 
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              
              {/* Heavy Dark Gradient Overlay (Bottom Half) */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-transparent" />

              {/* Floating Badge Top Left */}
              <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
                <div className="flex items-center gap-2 rounded-full bg-background/95 px-3 py-1.5 shadow-sm backdrop-blur-md">
                  <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary">
                    <k.icon className="size-3" />
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">Akses Peran</span>
                </div>
              </div>

              {/* Content at Bottom */}
              <div className="relative mt-auto flex flex-col p-5 text-ink-foreground sm:p-6">
                <h3 className="font-display text-[22px] font-semibold tracking-tight leading-tight sm:text-[26px]">
                  {k.judul}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/80 sm:text-[14px]">
                  {k.teks}
                </p>
                
                {/* Divider and Action Link */}
                <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-4">
                  <span className="text-[11px] font-medium text-white/50">Peta Interaktif</span>
                  <Link
                    to="/peta"
                    search={{ peran: k.peran }}
                    className="flex items-center gap-1.5 text-[14px] font-semibold text-white transition-colors hover:text-primary sm:text-[15px]"
                  >
                    Pilih {k.peran} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
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

        <section className="mt-10 grid items-start gap-4 sm:gap-6 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="panel p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold">Cuplikan peta vitalitas</h2>

            <VitalityMap
              kawasan={kawasans}
              role="investor"
              compact
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <Link
              to="/peta"
              className="pill mt-4 inline-block bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Buka Peta Penuh
            </Link>
          </div>

          <div className="panel p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AiIcon /> Highlight insight AI
            </h2>
            <ul className="mt-3 space-y-3 text-[13px] leading-relaxed">
              <li className="rounded-lg border border-border bg-background/60 p-3">
                “Kawasan sekitar Stasiun Kiaracondong punya keragaman usaha sangat tinggi (78) namun
                skor layanan hanya 52 — sinyal peluang tersembunyi bagi UMKM dan operator feeder.”
              </li>
              <li className="rounded-lg border border-border bg-background/60 p-3">
                “Gedebage mencatat kesenjangan layanan terlebar di pilot (28). Satu rute feeder baru
                diperkirakan menaikkan skor totalnya paling besar di antara seluruh kawasan.”
              </li>
            </ul>
            <Link
              to="/peta"
              className="mt-4 inline-block text-[12px] font-medium text-primary hover:underline"
            >
              Buka TemuData AI ›
            </Link>
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
    <div className="flex flex-col justify-between p-6 rounded-[20px] sm:p-8 bg-background shadow-xl shadow-black/5 border border-border/40">
      <div className="flex items-center gap-3 text-muted-foreground mb-6">
        <span className="grid size-9 place-items-center rounded-full bg-secondary text-primary">
          <Icon className="size-4" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-widest sm:text-[12px]">{label}</p>
      </div>
      <div>
        <p className="font-display text-[32px] font-semibold tracking-tight leading-none sm:text-[42px]">
          {value}
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground leading-relaxed sm:text-[12px]">{sub}</p>
      </div>
    </div>
  );
}
