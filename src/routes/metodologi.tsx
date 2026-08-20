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
          "Penjelasan transparan metode indeks berbobot Skor Vitalitas Transit, agregasi grid 200 m, peran machine learning ringan, dan seluruh sumber data yang dipakai.",
      },
      { property: "og:title", content: "Metodologi & Sumber Data — Titik Temu" },
      {
        property: "og:description",
        content:
          "Metode indeks TOD berbobot, clustering k-means, regresi linear sederhana, deteksi anomali, serta daftar sumber data resmi dan pustaka akademik.",
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
  "Singh (2015). Metode indeks Transit Oriented Development.",
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
          Seluruh angka pada prototipe ini masih data dummy realistis untuk pilot Bandung Raya.
          Struktur perhitungannya sudah mengikuti rencana akhir sehingga bisa langsung diganti
          dengan hasil agregasi survei lapangan.
        </p>

        <Section title="1. Agregasi data">
          <p>
            Seluruh sumber data disatukan pada grid lokasi berukuran sekitar 200 meter di sekitar
            titik transit. Hasil akhirnya satu tabel dengan satu baris per kawasan, memuat nilai
            minimum dan maksimum tiap variabel sebelum dinormalisasi ke rentang 0–100.
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
            Skor Vitalitas Transit dihitung sebagai indeks berbobot, adaptasi metode TOD Singh
            (2015) — bukan machine learning berat.
          </p>
        </Section>

        <Section title="3. Bobot per peran pengguna">
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

        <Section title="4. Skor dinamis berbasis waktu">
          <p>
            Data Menu Go dan Community Activity memuat kolom waktu, sehingga skor dikelompokkan ke
            rentang pagi, siang, sore, dan malam lalu dihitung ulang. Tidak memerlukan machine
            learning, cukup pengelompokan dan agregasi berbasis waktu.
          </p>
        </Section>

        <Section title="5. Machine learning ringan">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Clustering k-means untuk menentukan tipe kawasan secara otomatis.</li>
            <li>Regresi linear sederhana untuk proyeksi tren skor 12 bulan ke depan.</li>
            <li>Deteksi anomali untuk menemukan peluang tersembunyi.</li>
          </ul>
          <p className="mt-3">Semua menggunakan scikit-learn, ringan, tanpa GPU dan tanpa model gambar.</p>
        </Section>

        <Section title="6. Peran AI">
          <p>
            Panel insight dan chat assistant memakai large language model melalui API untuk mengubah
            baris data kawasan menjadi ringkasan bahasa natural dan jawaban interaktif. Tahap ini
            belum aktif pada prototipe frontend.
          </p>
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
