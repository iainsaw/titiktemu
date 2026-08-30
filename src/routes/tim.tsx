import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, Linkedin } from "lucide-react";
import { getSecureAssetUrl, supabase } from "@/lib/supabase";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnimatedSection } from "@/components/AnimatedSection";
const fotoRiantini = { url: "/tim-riantini.jpg" };
const fotoDimyati = { url: "/tim-dimyati-8.jpg" };
const fotoSyahrul = { url: "/tim-syahrul-2.jpg" };
const fotoGilang = { url: "/tim-gilang-2.jpg" };
const fotoFirza = { url: "/tim-firza-2.jpg" };
const fotoShafina = { url: "/tim-shafina-2.jpg" };

const TIM = [
  {
    nama: "Dr. Riantini Virtriana, S.T., M.T.",
    label: "PEMBIMBING",
    peran: "Dosen Pembimbing",
    teks: "Mengarahkan riset, memvalidasi metodologi skor vitalitas, dan memastikan luaran ilmiah Titik Temu memenuhi standar akademik.",
    linkedin: false,
    foto: fotoRiantini.url as string | null,
  },
  {
    nama: "Syahrul Muharam",
    label: "KETUA",
    peran: "Project Leader",
    teks: "Memimpin tim, mengelola alur kerja antar-divisi, dan memastikan setiap milestone proyek tersampaikan tepat waktu.",
    linkedin: true,
    foto: fotoSyahrul.url,
  },
  {
    nama: "Dimyati",
    label: "ANGGOTA",
    peran: "WebGIS Developer",
    teks: "Membangun peta interaktif, dashboard analisis, dan integrasi lapisan AI ke dalam antarmuka WebGIS.",
    linkedin: true,
    foto: fotoDimyati.url,
  },
  {
    nama: "Shafina Moktika Khairani",
    label: "ANGGOTA",
    peran: "UI/UX Designer",
    teks: "Merancang alur pengguna dan sistem desain agar tiga sudut pandang pengguna terbaca jelas dalam satu peta.",
    linkedin: true,
    foto: fotoShafina.url,
  },
  {
    nama: "Firzatullah Al Ghiffari",
    label: "ANGGOTA",
    peran: "Business / Product Analyst",
    teks: "Menerjemahkan kebutuhan investor, pemerintah, dan pelaku UMKM menjadi fitur dan narasi produk yang terukur.",
    linkedin: true,
    foto: fotoFirza.url,
  },
  {
    nama: "Gilang Wijaya",
    label: "ANGGOTA",
    peran: "Data & AI Analyst",
    teks: "Mengolah data spasial dan survei lapangan, menyusun pembobotan skor, serta merancang prompt dan konteks AI Insight.",
    linkedin: true,
    foto: fotoGilang.url,
  },
];


const INISIAL = (nama: string) =>
  nama
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export const Route = createFileRoute("/tim")({
  head: () => ({
    meta: [
      { title: "Tentang Tim — Titik Temu" },
      {
        name: "description",
        content:
          "Profil tim pengembang Titik Temu, konteks MAPID WebGIS Competition 2026, dan kontak untuk kolaborasi.",
      },
      { property: "og:title", content: "Tentang Tim — Titik Temu" },
      {
        property: "og:description",
        content: "Tim di balik Skor Vitalitas Transit untuk pilot Kota Bandung.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TentangTim,
});

function TentangTim() {
  const [team, setTeam] = useState(TIM);

  useEffect(() => {
    async function loadTeam() {
      try {
        const { data, error } = await supabase.from("team_members").select("*").order("order_index", { ascending: true });
        if (!error && data && data.length > 0) {
          // If loaded from DB, we use it directly
          setTeam(data);
          return;
        }
      } catch (e) {
        console.warn("Failed to load team from DB, using fallback.");
      }

      // Fallback: load secure urls for hardcoded TIM
      const updatedTim = await Promise.all(
        TIM.map(async (t) => {
          if (t.foto && t.foto.startsWith('/')) {
            const url = await getSecureAssetUrl(t.foto);
            return { ...t, foto: url || t.foto };
          }
          return t;
        })
      );
      setTeam(updatedTim);
    }
    loadTeam();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-5 sm:py-16">
        <AnimatedSection>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground sm:text-[12px]">TIM</p>
          <h1 className="headline mt-3 text-[clamp(30px,9vw,56px)]">Urban Nadi</h1>
          <p className="mt-4 max-w-[620px] text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            Tim di balik <span className="font-semibold text-foreground">Titik Temu</span> merupakan
            kolaborasi mahasiswa dan dosen pembimbing dari Teknik Geodesi dan Geomatika, Institut Teknologi Bandung 
            untuk WebGIS Skor Vitalitas Transit, pilot Kawasan Kota Bandung.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={150} className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-3">
          {team.map((t) => (
            <article
              key={t.nama}
              className="group relative flex aspect-4/5 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-ink shadow-[var(--shadow-panel)] sm:rounded-3xl"
            >
              <div className="absolute inset-0 bg-linear-to-br from-primary/35 via-ink to-ink" />

              {t.foto_url || t.foto ? (
                <img
                  src={t.foto_url || t.foto}
                  alt={`Foto ${t.nama}`}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="absolute inset-x-0 top-1/2 -translate-y-[60%] text-center font-display text-[96px] font-semibold tracking-tight text-ink-foreground/10 transition-transform duration-500 group-hover:scale-105">
                  {INISIAL(t.nama)}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-ink via-ink/80 to-transparent" />


              <span className="pill absolute top-2.5 left-2.5 bg-background/90 px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-foreground sm:top-4 sm:left-4 sm:px-3 sm:py-1 sm:text-[10px]">
                {t.label}
              </span>

              <div className="relative p-3 text-ink-foreground sm:p-5">
                <h2 className="text-[13px] font-semibold leading-tight tracking-tight sm:text-[17px]">{t.nama}</h2>
                <p className="mt-0.5 text-[11px] text-ink-foreground/70 sm:text-[13px]">{t.peran}</p>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-ink-foreground/60 sm:mt-2 sm:line-clamp-3 sm:text-[12px]">
                  {t.teks}
                </p>
                <div className="mt-2.5 flex gap-1.5 sm:mt-4 sm:gap-2">
                  <IconBtn label={`Email ${t.nama}`}>
                    <Mail className="size-3.5" />
                  </IconBtn>
                  <IconBtn label={`Telepon ${t.nama}`}>
                    <Phone className="size-3.5" />
                  </IconBtn>
                  {t.linkedin && (
                    <IconBtn label={`LinkedIn ${t.nama}`}>
                      <Linkedin className="size-3.5" />
                    </IconBtn>
                  )}
                </div>
              </div>

            </article>
          ))}
        </AnimatedSection>

        <AnimatedSection delay={300} animation="zoom-in" className="panel mt-8 p-6 text-[13px] leading-relaxed text-muted-foreground">
          <p className="text-[16px] font-semibold text-foreground">Kompetisi & kontak</p>
          <p className="mt-2">
            MAPID WebGIS Competition 2026 · Kategori WebGIS Analitik · Pilot Kota Bandung (BBK).
          </p>
          <p className="mt-1">Kontak: titiktemu.team@email.com</p>
          <Link to="/metodologi" className="mt-3 inline-block font-medium text-primary hover:underline">
            Baca metodologi & sumber data ›
          </Link>
        </AnimatedSection>
      </main>
      <SiteFooter />
    </div>
  );
}

function IconBtn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      aria-label={label}
      title={label}
      className="grid size-7 place-items-center rounded-full bg-ink-foreground/12 text-ink-foreground transition-colors hover:bg-ink-foreground/25 sm:size-8"
    >
      {children}
    </span>

  );
}
