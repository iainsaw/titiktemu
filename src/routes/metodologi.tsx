import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { COMPONENTS, ROLES } from "@/lib/vitality-data";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import { AnimatedSection } from "@/components/AnimatedSection";

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
  { nama: "MAPID (Basemap Vector Tiles & Demografi Sensus Grid)", url: "https://mapid.co.id", img: "/logo-mapid.png" },
  { nama: "Transport for Bandung (Dataset Rute Angkot, Bus & Pedestrian)", url: "https://instagram.com/transportforbandung", img: "/logo-tfb.svg" },
  { nama: "OpenStreetMap (Ekstraksi POI Fasilitas Publik & UMKM)", url: "https://openstreetmap.org", img: "/logo-osm.svg" },
  { nama: "Kaggle (Dataset Harga Rumah Kota Bandung)", url: "https://www.kaggle.com/datasets/khaleeel347/harga-rumah-seluruh-kecamatan-di-kota-bandung?resource=download", img: "/logo-kaggle.png" },
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
          Semua data di dalam platform ini menggunakan <strong>data asli</strong> dari wilayah percontohan Kota Bandung yang ditarik secara real-time melalui basis data PostgreSQL (Supabase).
        </p>

        <Section title="1. Jangkauan Pejalan Kaki (Radius 800m)">
          <p>
            Kami mengumpulkan data keramaian dan fasilitas dalam radius 800 meter (sekitar 10 menit berjalan kaki santai) dari stasiun atau halte. Semua titik penting seperti UMKM, sekolah, dan rumah sakit yang berada dalam lingkaran ini akan dihitung sebagai fasilitas kawasan tersebut.
          </p>
        </Section>

        <Section title="2. Perhitungan Jarak Transit (Metode Matematis Haversine)">
          <p>
            Untuk menghindari ketergantungan pada dataset eksternal yang statis, metrik Jarak Transit rata-rata kawasan pada platform ini dihitung langsung menggunakan pendekatan matematis-geometris (Formula Haversine):
          </p>
          <div className="my-4 overflow-x-auto text-center">
            <BlockMath math={String.raw`d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\varphi_2 - \varphi_1}{2}\right) + \cos(\varphi_1) \cos(\varphi_2) \sin^2\left(\frac{\lambda_2 - \lambda_1}{2}\right)}\right)`} />
          </div>
          <ul className="list-disc space-y-1.5 pl-5 mt-2">
            <li><strong>Penentuan Titik Pusat Grid:</strong> Mengidentifikasi titik tengah (centroid) dari seluruh grid spasial yang memiliki aktivitas penduduk/fasilitas dalam radius 800 meter dari stasiun utama.</li>
            <li><strong>Formula Haversine:</strong> Menghitung jarak garis lurus (great-circle distance) dari masing-masing centroid grid menuju titik koordinat stasiun (<InlineMath math="\varphi" /> = lintang, <InlineMath math="\lambda" /> = bujur, <InlineMath math="R" /> = radius bumi 6.371 km).</li>
            <li><strong>Agregasi Rata-rata:</strong> Seluruh jarak dijumlahkan lalu dirata-ratakan. Hasilnya merepresentasikan estimasi jarak tempuh rata-rata warga di kawasan tersebut menuju stasiun.</li>
          </ul>
        </Section>

        <Section title="3. Penjelasan 4 Parameter Utama">
          <p className="mb-3">Skor Vitalitas Transit mengadaptasi indeks dari <strong>Measuring TOD around transit nodes (Singh et al., 2017)</strong>. Berikut adalah empat komponen utamanya beserta sumber dataset dan metode perhitungannya:</p>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-semibold text-foreground mb-1">1. Pasar Properti</h3>
              <p className="text-sm text-muted-foreground mb-2"><strong>Dataset:</strong> Dataset Publik Harga Rumah Kota Bandung (CSV) hasil *scraping* atau himpunan listing properti.</p>
              <p className="text-sm text-muted-foreground"><strong>Metode:</strong> Menggunakan pendekatan <em>Nilai Lahan Murni</em>. Karena bangunan di kawasan transit strategis sering menjadi target <em>tear-down</em> (dibongkar ulang oleh investor), kami mengalkulasi harga murni tanah dengan mensubstraksi estimasi nilai bangunan fisik dari harga jual total.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-semibold text-foreground mb-1">2. Kesenjangan Layanan</h3>
              <p className="text-sm text-muted-foreground mb-2"><strong>Dataset:</strong> <code>poi-fasilitas.geojson</code> (ekstraksi OpenStreetMap) dan <code>datasetfix.geojson</code> (demografi grid).</p>
              <p className="text-sm text-muted-foreground"><strong>Metode:</strong> Membandingkan jumlah dan kelengkapan fasilitas publik terhadap kepadatan penduduk di kawasan tersebut. Skor yang tinggi menunjukkan kawasan memiliki layanan publik yang sangat memadai dan merata.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-semibold text-foreground mb-1">3. Keragaman Ekonomi & UMKM</h3>
              <p className="text-sm text-muted-foreground mb-2"><strong>Dataset:</strong> <code>poi-fasilitas.geojson</code> kategori komersial/UMKM.</p>
              <p className="text-sm text-muted-foreground"><strong>Metode:</strong> Dihitung secara kuantitatif berdasarkan kepadatan titik UMKM dan tempat usaha aktif di dalam jangkauan pejalan kaki. Semakin masif aglomerasi bisnisnya, semakin tinggi skornya.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-semibold text-foreground mb-1">4. Aksesibilitas Transit</h3>
              <p className="text-sm text-muted-foreground mb-2"><strong>Dataset:</strong> <code>rute-angkot-bandung-micro.geojson</code>, <code>rute-bus-bandung.geojson</code>, dan <code>infrastruktur-pedestrian.geojson</code> dari <strong>Transport for Bandung</strong>.</p>
              <p className="text-sm text-muted-foreground"><strong>Metode:</strong> Mengukur konektivitas pergerakan warga. Parameternya didasarkan pada jumlah trayek yang terintegrasi (cross-transit) serta ketersediaan infrastruktur pejalan kaki penunjang stasiun.</p>
            </div>
          </div>
          <div className="mt-6 mb-2">
            <h4 className="font-semibold text-sm text-foreground mb-2">Standardisasi (Min-Max Scaling)</h4>
            <div className="overflow-x-auto text-center">
              <BlockMath math={String.raw`x_{\text{scaled}} = \left( \frac{x - x_{\text{min}}}{x_{\text{max}} - x_{\text{min}}} \right) \times 100`} />
            </div>
          </div>
          <div className="mb-2">
            <h4 className="font-semibold text-sm text-foreground mb-2">Penggabungan Bobot Peran (Weighted Index)</h4>
            <div className="overflow-x-auto text-center">
              <BlockMath math={String.raw`\text{Skor TOD} = \sum_{i=1}^{4} \left( W_{i, \text{peran}} \times x_{\text{scaled}, i} \right)`} />
            </div>
          </div>
          <p className="mt-4">
            Keempat parameter mentah di atas distandardisasi menggunakan formula Min-Max, dikalikan dengan persentase bobot sesuai peran (<InlineMath math="W" />), lalu dijumlahkan menjadi <strong>satu Skor Vitalitas Transit bulat</strong> yang terpadu.
          </p>
        </Section>

        <Section title="4. Fokus Sesuai Kebutuhan Anda (Sistem Pembobotan)">
          <p className="mb-3">
            Prioritas penataan kota berbeda bagi setiap pihak. Dasbor interaktif ini menggunakan sistem pembobotan dinamis agar skor menyesuaikan kebutuhan pengguna:
          </p>
          <ul className="list-disc space-y-2 pl-5 mb-4 text-muted-foreground text-sm">
            <li><strong>Investor Properti:</strong> Bobot terbesar ditaruh pada <strong>Pasar Properti (40%)</strong> karena secara langsung mencerminkan potensi imbal hasil (ROI) lahan. Disusul Akses (25%) dan Ekonomi (20%) yang sering menjadi katalis kenaikan <em>capital gain</em>.</li>
            <li><strong>Pemerintah & Perencana:</strong> Memprioritaskan <strong>Kesenjangan Layanan (40%)</strong> dan <strong>Aksesibilitas Transit (30%)</strong>. Pembobotan ini didasari pada mandat pemerintah untuk memastikan pemerataan infrastruktur dan hak mobilitas warga secara inklusif.</li>
            <li><strong>Pelaku UMKM:</strong> Kesuksesan bisnis mikro sangat bergantung pada keramaian pasar, sehingga bobot terberat ada pada <strong>Keragaman Ekonomi (40%)</strong> (memanfaatkan efek aglomerasi) serta <strong>Akses Transit (25%)</strong> agar konsumen mudah datang berkunjung.</li>
          </ul>
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
                      <td key={c.id} className="py-2.5 font-display">
                        {r.weights[c.id].toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="5. Perhitungan Nilai Lahan Murni">
          <p>
            Harga properti sering kali menyesatkan karena termasuk harga bangunan. Kami menghitung <strong>Nilai Lahan Murni</strong> dengan memisahkan harga bangunan dari harga jual properti. Di kawasan strategis, bangunan lama sering dibongkar oleh investor untuk dibangun ulang, sehingga nilai utamanya ada pada lokasi tanahnya:
          </p>
          <div className="my-4 overflow-x-auto text-center">
            <BlockMath math={String.raw`V_{\text{lahan}} = \max\left(0, P_{\text{jual}} - (A_{\text{bangunan}} \times C_{\text{bangun}})\right)`} />
          </div>
          <ul className="list-disc space-y-1.5 pl-5 mt-2">
            <li><strong>Nilai Bangunan:</strong> Luas Bangunan <InlineMath math="(A_{\text{bangunan}})" /> (m²) × Biaya Bangun Baru <InlineMath math="(C_{\text{bangun}})" /> (Rp 5.000.000/m²).</li>
            <li><strong>Total Nilai Tanah:</strong> Harga Jual Properti <InlineMath math="(P_{\text{jual}})" /> - Nilai Bangunan. <em>(Jika negatif, harga jual dianggap murni nilai lahan karena bangunan dianggap tear-down).</em></li>
            <li><strong>Skor Properti:</strong> Dihitung berdasarkan nilai tanah per m² dengan batas atas Rp 25.000.000/m² sebagai Skor 100.</li>
          </ul>
        </Section>

        <Section title="6. Simulasi Dampak Penambahan Layanan (Vitality Twin)">
          <p>
            Fitur simulasi tidak menggunakan algoritma AI tertutup ("machine learning black-box") yang seringkali sulit dijelaskan keputusannya, melainkan menggunakan model matematika deterministik spasial (Fungsi Peluruhan Linear):
          </p>
          <div className="my-4 overflow-x-auto text-center">
            <BlockMath math={String.raw`\text{Dampak} = \max\left(0, \text{MaxDampak} \times \left(1 - \frac{d}{r_{\text{max}}}\right)\right)`} />
          </div>
          <ul className="list-disc space-y-1.5 pl-5 mt-2">
            <li><strong>Peluruhan Linear (Linear Decay):</strong> Dampak intervensi akan semakin mengecil seiring bertambahnya jarak <InlineMath math="(d)" /> kawasan dari titik pusat intervensi (<InlineMath math="r_{\text{max}}" /> = radius 12-26 grid semu).</li>
            <li><strong>Diminishing Returns:</strong> Kawasan yang skor layanannya sudah tinggi akan mendapat penambahan skor yang lebih sedikit dibandingkan kawasan tertinggal, mendorong pemerataan fasilitas.</li>
            <li><strong>Estimasi Biaya:</strong> Didasarkan pada standar harga satuan infrastruktur dasar lokal. Misalnya, Halte/Stasiun baru (Rp 3,5 Miliar/unit), Rute Feeder (Rp 5,2 Miliar/unit), Penambahan Armada (Rp 2,4 Miliar/unit), dan Jalur Pedestrian (Rp 1,3 Miliar/unit intensitas).</li>
          </ul>
        </Section>

        <Section title="Sumber data">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SUMBER.map((s) => (
              <a
                key={s.nama}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-4 text-center transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="relative mb-3 flex h-12 w-full items-center justify-center">
                  <img 
                    src={s.img} 
                    alt={s.nama} 
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" 
                  />
                </div>
                <span className="text-[11px] leading-tight font-medium text-muted-foreground group-hover:text-foreground">
                  {s.nama}
                </span>
              </a>
            ))}
          </div>
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
    <AnimatedSection animation="fade-in-up" className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </AnimatedSection>
  );
}
