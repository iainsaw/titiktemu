import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { COMPONENTS, ROLES } from "@/lib/vitality-data";

export const Route = createFileRoute("/metodologi")({
  head: () => ({
    meta: [
      { title: "Metodologi & Sumber Data — Titik Temu" },
      {
        name: "description",
        content:
          "Penjelasan transparan metode indeks berbobot Skor Vitalitas Transit, agregasi radius 800m, metode ekstraksi harga tanah, dan seluruh sumber data yang dipakai.",
      },
      { property: "og:title", content: "Metodologi & Sumber Data — Titik Temu" },
      {
        property: "og:description",
        content:
          "Metode indeks TOD berbobot, agregasi spasial radius pejalan kaki, serta daftar sumber data resmi dan pustaka akademik.",
      },
    ],
  }),
  component: Metodologi,
});

const SUMBER = [
  { nama: "Sampel data MAPID (Properti Go, Struk Go, Menu Go, Activity)", url: "https://mapid.co.id" },
  { nama: "MAPID Data Catalogue", url: "https://mapid.co.id/data-catalog" },
  { nama: "Ina Geoportal BIG", url: "https://tanahair.indonesia.go.id" },
  { nama: "BPS & SIG BPS", url: "https://sig.bps.go.id" },
  { nama: "SIGITA Kemenhub", url: "https://sigita.dephub.go.id" },
  { nama: "OpenStreetMap", url: "https://openstreetmap.org" },
  { nama: "Open Data Bandung", url: "https://opendata.bandung.go.id" },
  { nama: "Open Data Jabar", url: "https://opendata.jabarprov.go.id" },
];

const PUSTAKA = [
  "Singh, Y.J., et al. (2017). Measuring TOD around transit nodes - Towards TOD policy.",
  "Siburian dkk. (2020) & Legowo. TOD Jakarta dan koridor Bogor–Jakarta Kota.",
  "Hasibuan (2014). TOD dan keberlanjutan Jabodetabek.",
  "Kezia (2021). Aksesibilitas dan skala layanan angkutan massal DKI Jakarta.",
  "Agustini. Pemetaan UMKM berbasis GIS Palembang.",
  "Tim penulis (2025). Pemetaan UMKM berbasis web Semarang.",
];

function Metodologi() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
        <h1 className="headline text-[clamp(28px,8vw,52px)]">Metodologi & Sumber Data</h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Semua data di dalam platform ini menggunakan <strong>data asli</strong> dari wilayah percontohan Bandung Raya yang ditarik secara real-time melalui basis data PostgreSQL (Supabase).
        </p>

        <Section title="1. Jangkauan Pejalan Kaki (Radius 800m)">
          <p>
            Kami mengumpulkan data keramaian dan fasilitas dalam radius 800 meter (sekitar 10 menit berjalan kaki santai) dari stasiun atau halte. Semua titik penting seperti UMKM, sekolah, dan rumah sakit yang berada dalam lingkaran ini akan dihitung sebagai fasilitas kawasan tersebut.
          </p>
        </Section>

        <Section title="2. Empat komponen skor">
          <ul className="space-y-2">
            {COMPONENTS.map((c) => (
              <li key={c.id} className="rounded-lg border border-border bg-surface p-3">
                <span className="font-semibold text-foreground">{c.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Skor Vitalitas Transit dihitung sebagai indeks berbobot, mengadaptasi secara langsung metode <strong>Measuring TOD around transit nodes (Singh et al., 2017)</strong>. Prosesnya meliputi:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 mt-2">
            <li><strong>Penyeragaman Skala (Standardisasi):</strong> Mengubah semua metrik ke dalam skala 0–100 agar mudah dibandingkan satu sama lain.</li>
            <li><strong>Penggabungan Bobot (Weighted Combination):</strong> Skor akhir kawasan didapatkan dengan mengalikan skor setiap indikator dengan tingkat kepentingannya, lalu dijumlahkan menjadi satu skor bulat.</li>
          </ul>
        </Section>

        <Section title="3. Fokus Sesuai Kebutuhan Anda (Sistem Pembobotan)">
          <p className="mb-3">
            Prioritas setiap orang berbeda. Dasbor interaktif ini menyesuaikan perhitungan skor secara otomatis berdasarkan peran Anda. Misalnya, Pemerintah mungkin lebih mementingkan pemerataan layanan publik, sementara Investor lebih fokus pada nilai properti dan akses keramaian.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Peran</th>
                  {COMPONENTS.map((c) => (
                    <th key={c.id} className="pb-2 font-medium">
                      {c.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{r.label}</td>
                    {COMPONENTS.map((c) => (
                      <td key={c.id} className="py-2.5 font-mono">
                        {r.weights[c.id].toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="4. Perhitungan Nilai Lahan Murni">
          <p>
            Harga properti sering kali menyesatkan karena termasuk harga bangunan. Kami menghitung <strong>Nilai Lahan Murni</strong> dengan memisahkan harga bangunan dari harga jual properti. Di kawasan strategis, bangunan lama sering dibongkar oleh investor untuk dibangun ulang, sehingga nilai utamanya ada pada lokasi tanahnya:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 mt-2">
            <li><strong>Nilai Bangunan:</strong> Luas Bangunan (m²) × Biaya Bangun Baru (Rp 5.000.000/m²).</li>
            <li><strong>Total Nilai Tanah:</strong> Harga Jual Properti - Nilai Bangunan. <em>(Jika negatif, harga jual dianggap murni nilai lahan karena bangunan dianggap tear-down).</em></li>
            <li><strong>Skor Properti:</strong> Dihitung berdasarkan nilai tanah per m² dengan batas atas Rp 25.000.000/m² sebagai Skor 100.</li>
          </ul>
        </Section>

        <Section title="5. Simulasi Dampak Penambahan Layanan (Vitality Twin)">
          <p>
            Fitur simulasi tidak menggunakan *machine learning black-box*, melainkan menggunakan model matematika deterministik spasial:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 mt-2">
            <li><strong>Peluruhan Linear (Linear Decay):</strong> Dampak intervensi akan semakin mengecil seiring bertambahnya jarak kawasan dari titik pusat intervensi (radius 12-26 grid semu).</li>
            <li><strong>Diminishing Returns:</strong> Kawasan yang skor layanannya sudah tinggi akan mendapat penambahan skor yang lebih sedikit dibandingkan kawasan tertinggal, mendorong pemerataan fasilitas.</li>
            <li><strong>Estimasi Biaya:</strong> Didasarkan pada standar harga satuan infrastruktur dasar lokal. Misalnya, Halte/Stasiun baru (Rp 3,5 Miliar/unit), Rute Feeder (Rp 5,2 Miliar/unit), Penambahan Armada (Rp 2,4 Miliar/unit), dan Jalur Pedestrian (Rp 1,3 Miliar/unit intensitas).</li>
          </ul>
        </Section>

        <Section title="Sumber data">
          <ul className="grid gap-2 sm:grid-cols-2">
            {SUMBER.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-border bg-surface p-3 text-xs transition-colors hover:border-primary/60 hover:text-primary"
                >
                  {s.nama}
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Daftar pustaka">
          <ul className="list-disc space-y-1.5 pl-5">
            {PUSTAKA.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
