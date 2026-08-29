import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, MapPin, ClipboardList, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { SURVEI, RINGKASAN_SURVEI } from "@/lib/survei-data";
import { getSecureAssetUrl } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/survei")({
  head: () => ({
    meta: [
      { title: "Survei Lapangan — Titik Temu" },
      {
        name: "description",
        content:
          "Dokumentasi survei lapangan tim Titik Temu di kawasan transit Kota Bandung: metode, titik pengamatan, temuan utama, dan catatan per lokasi.",
      },
      { property: "og:title", content: "Survei Lapangan — Titik Temu" },
      {
        property: "og:description",
        content: "Data primer hasil observasi, traffic count, dan kuesioner UMKM di enam lokasi pilot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SurveiLapangan,
});

function SurveiLapangan() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-5 sm:py-12">
        <AnimatedSection>
          <h1 className="headline text-[clamp(28px,8vw,50px)]">Survei Lapangan</h1>
          <p className="mt-2 max-w-2xl text-[13.5px] text-muted-foreground sm:text-[14px]">
            Skor Vitalitas Transit tidak hanya bersandar pada data sekunder. Tim melakukan observasi
            langsung untuk memvalidasi komponen layanan, ekonomi, dan aksesibilitas di kawasan pilot.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={150} className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-7 sm:grid-cols-4 sm:gap-3">
          <Ringkas icon={MapPin} label="Lokasi disurvei" value={RINGKASAN_SURVEI.totalLokasi} />
          <Ringkas icon={ClipboardList} label="Titik pengamatan" value={RINGKASAN_SURVEI.totalTitik} />
          <Ringkas icon={Clock} label="Jam Observasi" value={RINGKASAN_SURVEI.totalJamObservasi} />
          <Ringkas icon={Camera} label="Periode" value={RINGKASAN_SURVEI.periode} />
        </AnimatedSection>

        <div className="mt-8 space-y-5">
          {SURVEI.map((s, idx) => (
            <AnimatedSection key={s.id} delay={Math.min(idx * 100, 500)}>
              <article className="panel grid gap-4 p-4 sm:gap-5 sm:p-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <PhotoCarousel fotos={s.fotos} fallback={s.foto} />

                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.id} · {s.kawasanId} · {s.tanggal}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{s.lokasi}</h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {s.surveyor} · {s.metode} · {s.titik} titik pengamatan
                  </p>

                  <ul className="mt-3 space-y-1.5 text-[13px]">
                    {s.temuan.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-3 rounded-lg border border-border bg-background/60 p-3 text-[12px] text-muted-foreground">
                    Catatan surveyor: {s.catatan}
                  </p>
                </div>
              </article>
            </AnimatedSection>
          ))}
        </div>


      </main>
      <SiteFooter />
    </div>
  );
}

function Ringkas({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col justify-center p-5 rounded-[20px] sm:p-6 bg-background shadow-xl shadow-black/5 border border-border/40 transition-transform hover:-translate-y-1">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[12px]">{label}</p>
      <p className="font-display font-semibold tracking-tight leading-none text-[24px] sm:text-[28px] whitespace-nowrap">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
    </div>
  );
}

function PhotoCarousel({
  fotos,
  fallback,
}: {
  fotos?: { judul: string; keterangan: string; src?: string }[];
  fallback: { judul: string; keterangan: string; src?: string };
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const images = useMemo(() => fotos && fotos.length > 0 ? fotos : [fallback], [fotos, fallback]);
  const current = images[currentIndex];

  useEffect(() => {
    async function fetchUrls() {
      const urls: Record<string, string> = {};
      for (const img of images) {
        if (img.src) {
          const url = await getSecureAssetUrl(img.src);
          if (url) urls[img.src] = url;
        }
      }
      setSignedUrls(urls);
    }
    fetchUrls();
  }, [images]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(next, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const currentSrc = current.src ? signedUrls[current.src] || current.src : undefined;

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-xl border border-border bg-secondary overflow-hidden group">
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={current.judul}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-10 dotted-canvas">
          <Camera className="size-12" />
        </div>
      )}

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground backdrop-blur-sm border border-border/50 transition-colors z-20 opacity-0 group-hover:opacity-100 shadow-sm"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground backdrop-blur-sm border border-border/50 transition-colors z-20 opacity-0 group-hover:opacity-100 shadow-sm"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute top-3 right-3 z-20 bg-background/90 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium backdrop-blur-sm border border-border/50 shadow-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
