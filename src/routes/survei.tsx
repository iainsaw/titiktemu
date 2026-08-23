import { createFileRoute } from "@tanstack/react-router";
import { Camera, MapPin, Users, ClipboardList } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SURVEI, RINGKASAN_SURVEI } from "@/lib/survei-data";

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
        <h1 className="headline text-[clamp(28px,8vw,50px)]">Survei Lapangan</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-muted-foreground sm:text-[14px]">
          Skor Vitalitas Transit tidak hanya bersandar pada data sekunder. Tim melakukan observasi
          langsung untuk memvalidasi komponen layanan, ekonomi, dan aksesibilitas di kawasan pilot.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-7 sm:grid-cols-4 sm:gap-3">

          <Ringkas icon={MapPin} label="Lokasi disurvei" value={`${RINGKASAN_SURVEI.totalLokasi}`} />
          <Ringkas icon={ClipboardList} label="Titik pengamatan" value={`${RINGKASAN_SURVEI.totalTitik}`} />
          <Ringkas icon={Users} label="Responden" value={`${RINGKASAN_SURVEI.totalResponden}`} />
          <Ringkas icon={Camera} label="Periode" value={RINGKASAN_SURVEI.periode} />
        </div>

        <div className="mt-8 space-y-5">
          {SURVEI.map((s) => (
            <article key={s.id} className="panel grid gap-4 p-4 sm:gap-5 sm:p-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="dotted-canvas flex aspect-[4/3] flex-col justify-end rounded-xl border border-border bg-secondary p-3">
                <Camera className="mb-auto size-5 text-muted-foreground" />
                <p className="text-[12px] font-medium">{s.foto.judul}</p>
                <p className="text-[11px] text-muted-foreground">{s.foto.keterangan}</p>
              </div>

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
          ))}
        </div>

        <p className="mt-8 text-[12px] text-muted-foreground">
          Dokumentasi foto pada prototipe ini masih berupa placeholder; berkas foto asli tersedia
          pada arsip tim dan akan ditautkan pada versi final.
        </p>
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
  value: string;
}) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="font-display text-[19px] font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
