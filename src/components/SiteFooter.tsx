import { Link } from "@tanstack/react-router";
const logoMark = { url: "/titik-temu-mark-v2.png" };
const logoItb = { url: "/logo-itb.png" };
const logoMapid = { url: "/logo-mapid.png" };
const logoTfb = { url: "/logo-tfb.svg" };

const tautan = [
  { to: "/", label: "Beranda" },
  { to: "/peta", label: "Peta Interaktif" },
  { to: "/analisis", label: "Analisis & Perbandingan" },
  { to: "/survei", label: "Survei Lapangan" },
  { to: "/metodologi", label: "Metodologi & Sumber Data" },
  { to: "/tim", label: "Tentang Tim" },
] as const;

const sumber = [
  "MAPID Apps",
  "GEO MAPID",
  "Badan Informasi Geospasial (BIG)",
  "Badan Pusat Statistik (BPS)",
  "SIGITA Kemenhub",
  "Survei lapangan tim, Mei 2026",
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface-raised">
      <div className="mx-auto max-w-[1180px] px-5 py-16">
        <div className="grid grid-cols-2 gap-8 sm:gap-10 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-4">
              <p className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
                <img src={logoMark.url} alt="Logo Titik Temu" className="size-6" />
                Titik Temu
              </p>
              <span className="h-9 w-px bg-border" />
              <span className="flex items-center gap-2">
                <img
                  src={logoItb.url}
                  alt="Logo Institut Teknologi Bandung"
                  className="size-9"
                  loading="lazy"
                />
                <span className="font-display text-[12px] italic leading-[1.25] text-muted-foreground">
                  In Harmonia
                  <br />
                  Progressio
                </span>
              </span>
            </div>
            <p className="mt-4 max-w-[280px] text-[12px] leading-relaxed text-muted-foreground">
              Skor Vitalitas Transit untuk kawasan di sekitar titik transportasi massal — satu peta,
              tiga sudut pandang. Produk dari tim{" "}
              <span className="font-medium text-foreground">Urban Nadi</span>, Institut Teknologi
              Bandung.
            </p>
          </div>

          <div>
            <p className="text-[13px] font-semibold">Tautan cepat</p>
            <ul className="mt-3 space-y-2">
              {tautan.map((t) => (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold">Sumber data & kredit</p>
            <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
              {sumber.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold">Disclaimer</p>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Sebagian nilai pada prototipe ini — termasuk estimasi biaya intervensi layanan,
              proyeksi tren, dan hasil simulasi — merupakan perkiraan kasar untuk keperluan
              demonstrasi, bukan angka resmi pemerintah. Gunakan sebagai alat bantu diskusi, bukan
              dasar tunggal pengambilan keputusan.
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-border/60 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
            PENYELENGGARA & MITRA
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-6">
            <img src={logoMapid.url} alt="Logo MAPID" className="h-6 w-auto" loading="lazy" />
            <img
              src={logoTfb.url}
              alt="Logo Transport for Bandung"
              className="h-10 w-auto"
              loading="lazy"
            />
          </div>
          <p className="mt-4 max-w-[620px] text-[11px] leading-relaxed text-muted-foreground">
            MAPID — penyelenggara MAPID WebGIS Competition 2026. Transport for Bandung — mitra kerja
            sama.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-6 text-[12px] text-muted-foreground">
          <p>Dibuat untuk MAPID WebGIS Competition 2026 · Tim Urban Nadi</p>
          <p>© {new Date().getFullYear()} Titik Temu</p>
        </div>
      </div>
    </footer>
  );
}
