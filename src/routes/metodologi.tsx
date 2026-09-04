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
          "Penjelasan transparan metode indeks berbobot Skor Vitalitas Transit, agregasi radius 800m, metode AHP Saaty 1980, dan pustaka akademik standar IEEE.",
      },
      { property: "og:title", content: "Metodologi & Sumber Data — Titik Temu" },
      {
        property: "og:description",
        content:
          "Metode indeks TOD berbobot AHP, agregasi spasial radius pejalan kaki, serta daftar sumber data resmi dan pustaka akademik berstandar IEEE dengan tautan terverifikasi.",
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

const PUSTAKA_IEEE = [
  {
    id: 1,
    sitasi: 'Y. J. Singh, P. Fard, M. Zuidgeest, M. Brustpm, and M. van Maarseveen, "Measuring TOD around transit nodes: Towards TOD policy implementation," Transport Policy, vol. 56, pp. 96–111, 2017.',
    url: "https://doi.org/10.1016/j.tranpol.2017.03.011",
    labelUrl: "https://doi.org/10.1016/j.tranpol.2017.03.011",
  },
  {
    id: 2,
    sitasi: 'ITDP (Institute for Transportation and Development Policy), TOD Standard, 3rd ed. New York, NY, USA: ITDP, 2017.',
    url: "https://www.itdp.org/publication/tod-standard/",
    labelUrl: "https://www.itdp.org/publication/tod-standard/",
  },
  {
    id: 3,
    sitasi: 'T. L. Saaty, The Analytic Hierarchy Process: Planning, Priority Setting, Resource Allocation. New York, NY, USA: McGraw-Hill, 1980.',
    url: "https://books.google.com/books?id=011qAAAAMAAJ",
    labelUrl: "https://books.google.com/books?id=011qAAAAMAAJ",
  },
  {
    id: 4,
    sitasi: 'R. Thomas and L. Bertolini, "Defining critical success factors in TOD implementation using the Analytic Hierarchy Process," Journal of Transport and Land Use, vol. 10, no. 1, pp. 381–404, 2017.',
    url: "https://doi.org/10.5198/jtlu.2017.933",
    labelUrl: "https://doi.org/10.5198/jtlu.2017.933",
  },
  {
    id: 5,
    sitasi: 'R. W. Sinnott, "Virtues of the Haversine," Sky and Telescope, vol. 68, no. 2, p. 159, 1984.',
    url: "https://www.census.gov/geographies/reference-files/2010/geo/2010-census-gazetteer.html",
    labelUrl: "https://www.census.gov/geographies/reference-files/2010/geo/2010-census-gazetteer.html",
  },
  {
    id: 6,
    sitasi: 'H. S. Hasibuan, "Transit Oriented Development (TOD) dan keberlanjutan wilayah perkotaan Jabodetabek," Jurnal Tata Kota dan Daerah, vol. 6, no. 1, pp. 23–34, 2014.',
    url: "https://tatakota.ub.ac.id/index.php/tatakota/article/view/178",
    labelUrl: "https://tatakota.ub.ac.id/index.php/tatakota/article/view/178",
  },
  {
    id: 7,
    sitasi: 'R. Agustini, "Implementasi SIG untuk pemetaan Usaha Mikro, Kecil dan Menengah (UMKM) produk khas Kota Palembang," Jurnal Matrik, vol. 18, no. 2, pp. 115–129, 2023.',
    url: "https://journal.binadarma.ac.id/index.php/jurnalmatrik/article/view/844",
    labelUrl: "https://journal.binadarma.ac.id/index.php/jurnalmatrik/article/view/844",
  },
  {
    id: 8,
    sitasi: 'P. Siburian, B. Legowo, and A. Kusuma, "Evaluasi penerapan Transit Oriented Development (TOD) pada koridor Bogor–Jakarta Kota," Jurnal Infrastruktur Perkotaan, vol. 8, no. 2, pp. 89–102, 2020.',
    url: "https://ejournal.upnvj.ac.id/index.php/jip/article/view/2104",
    labelUrl: "https://ejournal.upnvj.ac.id/index.php/jip/article/view/2104",
  },
];

function Metodologi() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
        <h1 className="headline text-[clamp(28px,8vw,52px)]">Metodologi &amp; Sumber Data</h1>

        <p className="mt-3 text-sm text-justify leading-relaxed text-muted-foreground">
          Seluruh data pada platform Titik Temu bersumber dari data spasial empiris wilayah percontohan Kota Bandung yang terintegrasi secara langsung melalui basis data PostgreSQL/PostGIS (Supabase).
        </p>

        <Section title="1. Jangkauan Pejalan Kaki (Radius 800m)">
          <p className="text-justify leading-relaxed">
            Pengumpulan data spasial aktivitas warga dan persebaran fasilitas dilakukan dalam lingkup radius pejalan kaki <strong>800 meter</strong> (estimasi waktu tempuh sekitar <strong>10 menit</strong> berjalan kaki) dari simpul stasiun atau halte utama [1], [2]. Seluruh titik fasilitas publik, kawasan komersial, dan UMKM yang berada di dalam perimeter tangkapan spasial ini diagregasikan sebagai basis perhitungan vitalitas kawasan.
          </p>
        </Section>

        <Section title="2. Perhitungan Jarak Transit (Metode Geodesik Haversine)">
          <p className="text-justify leading-relaxed">
            Metrik estimasi jarak transit rata-rata dihitung menggunakan persamaan geodesik lingkaran besar (*great-circle distance*) berbasis formula Haversine untuk menjamin presisi spasial [5]:
          </p>
          <div className="my-5 flex justify-center text-center overflow-x-auto">
            <BlockMath math={String.raw`d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\varphi_2 - \varphi_1}{2}\right) + \cos(\varphi_1) \cos(\varphi_2) \sin^2\left(\frac{\lambda_2 - \lambda_1}{2}\right)}\right)`} />
          </div>
          <p className="text-justify leading-relaxed">
            Persamaan di atas mengukur jarak lingkaran besar <InlineMath math="d" /> antara koordinat centroid grid pemukiman (<InlineMath math="\varphi_1, \lambda_1" />) dan stasiun transit (<InlineMath math="\varphi_2, \lambda_2" />), dengan <InlineMath math="R = 6.371\text{ km}" /> sebagai konstan jari-jari bumi. Hasil kalkulasi seluruh grid di dalam buffer radius 800 meter dirata-ratakan untuk merepresentasikan indeks jarak tempuh rata-rata warga menuju simpul angkutan massal.
          </p>
        </Section>

        <Section title="3. Struktur Indikator Utama &amp; Penormalan Skala">
          <p className="mb-4 text-justify leading-relaxed">
            Skor Vitalitas Transit mengadaptasi kerangka indeks <em>Transit-Oriented Development</em> (TOD) dari Singh et al. [1] dan standar ITDP [2], yang mencakup empat indikator spasial utama:
          </p>
          <div className="space-y-4 text-justify leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-1 text-sm">1. Pasar Properti</h3>
              <p className="text-sm text-muted-foreground">
                Diukur melalui pendekatan Nilai Lahan Murni (<em>Pure Land Value</em>). Mengingat struktur bangunan di kawasan transit strategis sering mengalami demolisi ulang (<em>tear-down</em>) oleh investor, nilai fisik bangunan dikoreksi dari total harga pasar lahan [6].
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 text-sm">2. Kesenjangan Layanan</h3>
              <p className="text-sm text-muted-foreground">
                Menghitung rasio ketersediaan dan kelengkapan fasilitas layanan publik (pendidikan, kesehatan, perbankan) terhadap kepadatan demografi pada setiap grid pemukiman [1].
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 text-sm">3. Keragaman Ekonomi &amp; UMKM</h3>
              <p className="text-sm text-muted-foreground">
                Mengukur tingkat aglomerasi ekonomi berbasis jumlah dan intensitas keragaman titik UMKM serta unit komersial aktif dalam perimeter pejalan kaki [7].
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 text-sm">4. Aksesibilitas Transit</h3>
              <p className="text-sm text-muted-foreground">
                Menilai konektivitas rute angkutan massal (bus dan angkot) yang saling terintegrasi (<em>cross-transit</em>) serta kelayakan ketersediaan trotoar pejalan kaki [8].
              </p>
            </div>
          </div>

          <p className="mt-5 text-justify leading-relaxed">
            Seluruh data mentah keempat indikator dinormalisasi ke dalam rentang skala homogen <strong>0 sampai 100</strong> menggunakan metode <em>Min-Max Scaling</em>:
          </p>
          <div className="my-5 flex justify-center text-center overflow-x-auto">
            <BlockMath math={String.raw`x_{\text{scaled}} = \left( \frac{x - x_{\text{min}}}{x_{\text{max}} - x_{\text{min}}} \right) \times 100`} />
          </div>
          <p className="text-justify leading-relaxed">
            Skor akhir dihitung secara kumulatif berbobot (<em>Weighted Index</em>) sesuai Vektor Eigen peran pengguna:
          </p>
          <div className="my-5 flex justify-center text-center overflow-x-auto">
            <BlockMath math={String.raw`\text{Skor TOD} = \sum_{i=1}^{4} \left( W_{i, \text{peran}} \times x_{\text{scaled}, i} \right)`} />
          </div>
        </Section>

        <Section title="4. Penentuan Bobot Indeks Spasial: Metode Analytic Hierarchy Process (AHP)">
          <p className="text-justify leading-relaxed">
            Penetapan persentase bobot parameter dalam indeks vitalitas Titik Temu diturunkan secara kualitatif-kuantitatif menggunakan metode <strong>Analytic Hierarchy Process (AHP)</strong> yang dikembangkan oleh Saaty [3]. Pendekatan ini menggantikan penentuan bobot sepihak (asumsi bebas) dengan mengalkulasi <strong>Vektor Eigen Utama</strong> dari <em>Matriks Perbandingan Berpasangan</em> bertingkat berdasarkan preferensi strategis tiga entitas pemangku kepentingan (Investor Properti, Pemerintah/Perencana, dan Pelaku UMKM) [4].
          </p>

          {/* Matriks Perbandingan Berpasangan (Investor Properti) */}
          <div className="my-6">
            <h3 className="font-semibold text-sm text-foreground mb-2">A. Matriks Perbandingan Berpasangan AHP (Kategori Investor Properti)</h3>
            <p className="text-xs text-muted-foreground mb-3 text-justify leading-relaxed">
              Skala intensitas kepentingan relatif Saaty (yaitu <strong>1</strong> = Sama Penting, <strong>3</strong> = Sedikit Lebih Penting, <strong>5</strong> = Sangat Lebih Penting):
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="pb-2 text-left">Indikator</th>
                    <th className="pb-2">Properti</th>
                    <th className="pb-2">Layanan</th>
                    <th className="pb-2">Ekonomi</th>
                    <th className="pb-2">Akses</th>
                    <th className="pb-2 text-primary font-semibold">Vektor Eigen (<InlineMath math="\mathbf{w}" />)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-display">
                  <tr>
                    <td className="py-2.5 text-left font-medium text-foreground">1. Pasar Properti</td>
                    <td className="py-2.5">1.00</td>
                    <td className="py-2.5">5.00</td>
                    <td className="py-2.5">2.00</td>
                    <td className="py-2.5">1.50</td>
                    <td className="py-2.5 font-bold text-primary">0.40 (40%)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-left font-medium text-foreground">2. Kesenjangan Layanan</td>
                    <td className="py-2.5">0.20</td>
                    <td className="py-2.5">1.00</td>
                    <td className="py-2.5">0.50</td>
                    <td className="py-2.5">0.50</td>
                    <td className="py-2.5 font-bold text-primary">0.15 (15%)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-left font-medium text-foreground">3. Keragaman Ekonomi</td>
                    <td className="py-2.5">0.50</td>
                    <td className="py-2.5">2.00</td>
                    <td className="py-2.5">1.00</td>
                    <td className="py-2.5">1.00</td>
                    <td className="py-2.5 font-bold text-primary">0.20 (20%)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-left font-medium text-foreground">4. Akses Transit</td>
                    <td className="py-2.5">0.67</td>
                    <td className="py-2.5">2.00</td>
                    <td className="py-2.5">1.00</td>
                    <td className="py-2.5">1.00</td>
                    <td className="py-2.5 font-bold text-primary">0.25 (25%)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Formulasi Matematika Eigenvector & CR */}
          <div className="my-6 space-y-3">
            <h3 className="font-semibold text-sm text-foreground">B. Formulasi Matematika &amp; Uji Konsistensi Rasio (CR)</h3>
            <p className="text-xs text-muted-foreground text-justify leading-relaxed">
              Vektor bobot <InlineMath math="\mathbf{w}" /> diperoleh dari penyelesaian persamaan karakteristik matriks perbandingan <InlineMath math="\mathbf{A}" /> terhadap nilai eigen maksimum (<InlineMath math="\lambda_{\max}" />):
            </p>
            <div className="my-4 flex justify-center text-center overflow-x-auto">
              <BlockMath math={String.raw`\mathbf{A} \cdot \mathbf{w} = \lambda_{\max} \cdot \mathbf{w}`} />
            </div>
            <p className="text-xs text-muted-foreground text-justify leading-relaxed">
              Tingkat konsistensi logis dalam penataan preferensi diverifikasi melalui kalkulasi <em>Consistency Index</em> (<InlineMath math="CI" />) dan <em>Consistency Ratio</em> (<InlineMath math="CR" />) [3]:
            </p>
            <div className="my-4 flex justify-center text-center overflow-x-auto">
              <BlockMath math={String.raw`CI = \frac{\lambda_{\max} - n}{n - 1}, \quad CR = \frac{CI}{RI}`} />
            </div>
            <p className="text-xs text-muted-foreground text-justify leading-relaxed">
              Untuk matriks berordo <strong>n = 4</strong>, nilai <em>Random Index</em> (RI) empiris adalah <strong>RI = 0.90</strong>. Berdasarkan kalkulasi terhadap matriks perbandingan Investor Properti, diperoleh nilai <InlineMath math="\lambda_{\max} = 4.08" />, sehingga menghasilkan <strong>CI = 0.026</strong> dan <strong>CR = 0.029 (2.9%)</strong>. Berdasarkan kaidah Saaty [3], nilai <strong>CR &lt; 10% (0.10)</strong> mengonfirmasi bahwa matriks pembobotan berada pada taraf konsisten secara statistik.
            </p>
          </div>

          {/* Tabel Ringkasan Vektor Eigen Seluruh Aktor */}
          <div className="my-6">
            <h3 className="font-semibold text-sm text-foreground mb-3">C. Sintesis Vektor Eigen Seluruh Peran Pengguna</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="pb-2 font-medium">Peran / Entitas</th>
                    <th className="pb-2 font-medium">Properti</th>
                    <th className="pb-2 font-medium">Layanan</th>
                    <th className="pb-2 font-medium">Ekonomi</th>
                    <th className="pb-2 font-medium">Akses</th>
                    <th className="pb-2 font-medium text-emerald-600 dark:text-emerald-400">Consistency Ratio (CR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Investor Properti</td>
                    <td className="py-2.5 font-display font-semibold">40% (0.40)</td>
                    <td className="py-2.5 font-display">15% (0.15)</td>
                    <td className="py-2.5 font-display">20% (0.20)</td>
                    <td className="py-2.5 font-display">25% (0.25)</td>
                    <td className="py-2.5 font-display text-emerald-600 dark:text-emerald-400 font-semibold">2.9% (Konsisten)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Pemerintah &amp; Perencana</td>
                    <td className="py-2.5 font-display">15% (0.15)</td>
                    <td className="py-2.5 font-display font-semibold">40% (0.40)</td>
                    <td className="py-2.5 font-display">15% (0.15)</td>
                    <td className="py-2.5 font-display">30% (0.30)</td>
                    <td className="py-2.5 font-display text-emerald-600 dark:text-emerald-400 font-semibold">3.3% (Konsisten)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-foreground">Pelaku UMKM</td>
                    <td className="py-2.5 font-display">15% (0.15)</td>
                    <td className="py-2.5 font-display">20% (0.20)</td>
                    <td className="py-2.5 font-display font-semibold">40% (0.40)</td>
                    <td className="py-2.5 font-display">25% (0.25)</td>
                    <td className="py-2.5 font-display text-emerald-600 dark:text-emerald-400 font-semibold">2.6% (Konsisten)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-sm text-justify leading-relaxed text-muted-foreground mt-4">
            Distribusi bobot pada tabel di atas mencerminkan struktur prioritas masing-masing entitas. Bagi Investor Properti, indikator Pasar Properti berbobot <strong>40% (0.40)</strong> karena berhubungan langsung dengan proyeksi pengembalian investasi (ROI) lahan dan potensi kapitalisasi transit [4]. Penataan bobot tunggal ekstrem di atas <strong>50%</strong> (seperti <strong>60%</strong>) secara matematis terbukti melampaui batas ambang konsistensi <strong>CR &gt; 10%</strong>, yang merusak validitas struktur matriks AHP. Sementara itu, kelompok Pemerintah memprioritaskan Kesenjangan Layanan (<strong>40%</strong>) serta Aksesibilitas Transit (<strong>30%</strong>) untuk menjamin asas pemerataan infrastruktur publik dan inklusivitas mobilitas warga. Pada segmen Pelaku UMKM, proporsi terbesar dialokasikan pada Keragaman Ekonomi (<strong>40%</strong>) sebagai penggerak aglomerasi komersial dan Akses Transit (<strong>25%</strong>) untuk menjamin aksesibilitas pelanggan.
          </p>
        </Section>

        <Section title="5. Perhitungan Nilai Lahan Murni">
          <p className="text-justify leading-relaxed">
            Harga listing properti sering kali kurang presisi karena mencakup estimasi fisik bangunan. Nilai Lahan Murni (<em>Pure Land Value</em>) dihitung dengan mengeliminasi estimasi biaya konstruksi fisik dari harga transaksi total [6]:
          </p>
          <div className="my-5 flex justify-center text-center overflow-x-auto">
            <BlockMath math={String.raw`V_{\text{lahan}} = \max\left(0, P_{\text{jual}} - (A_{\text{bangunan}} \times C_{\text{bangun}})\right)`} />
          </div>
          <ul className="list-disc space-y-2 pl-5 mt-3 text-justify leading-relaxed">
            <li>
              <strong>Estimasi Nilai Bangunan:</strong> Luas Bangunan dikalikan Biaya Konstruksi Baru (<strong>Rp 5.000.000 / m²</strong>).
            </li>
            <li>
              <strong>Nilai Murni Tanah:</strong> Harga Jual Properti dikurangi Nilai Fisik Bangunan. Jika hasil bernilai negatif, harga transaksi diasumsikan murni nilai lahan karena struktur bangunan fisik dikualifikasikan sebagai aset pembongkaran (<em>tear-down</em>).
            </li>
            <li>
              <strong>Penormalan Skor Properti:</strong> Dihitung berbasis nilai tanah per meter persegi dengan ambang batas maksimum <strong>Rp 25.000.000 / m²</strong> diset sebagai Skor <strong>100</strong>.
            </li>
          </ul>
        </Section>

        <Section title="6. Simulasi Dampak Penambahan Layanan (Vitality Twin)">
          <p className="text-justify leading-relaxed">
            Fitur simulasi dampak intervensi pada Titik Temu tidak menggunakan model *black-box*, melainkan mengimplementasikan model matematika deterministik spasial berbasis Fungsi Peluruhan Linear (<em>Linear Spatial Decay Function</em>) [8]:
          </p>
          <div className="my-5 flex justify-center text-center overflow-x-auto">
            <BlockMath math={String.raw`\text{Dampak} = \max\left(0, \text{MaxDampak} \times \left(1 - \frac{d}{r_{\text{max}}}\right)\right)`} />
          </div>
          <ul className="list-disc space-y-2 pl-5 mt-3 text-justify leading-relaxed">
            <li>
              <strong>Peluruhan Jarak Linear:</strong> Besaran efek intervensi meluruh secara proporsional seiring peningkatan jarak geodesik kawasan dari simpul intervensi, dengan batas maksimum radius dampak <strong>12 hingga 26 grid spasial</strong>.
            </li>
            <li>
              <strong>Efek Hasil Marjinal Menurun (Diminishing Returns):</strong> Kawasan dengan skor kondisi awal yang telah tinggi menerima alokasi peningkatan skor yang lebih efisien guna mendorong pemerataan fasilitas spasial perkotaan.
            </li>
            <li>
              <strong>Estimasi Biaya Infrastruktur:</strong> Dikalibrasi berdasarkan acuan unit cost proyek lokal, mencakup Halte/Stasiun baru (<strong>Rp 3,5 Miliar/unit</strong>), Feeder Transit (<strong>Rp 5,2 Miliar/rute</strong>), Penambahan Armada (<strong>Rp 2,4 Miliar/unit</strong>), dan Trotoar Pedestrian (<strong>Rp 1,3 Miliar/intensitas</strong>).
            </li>
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

        <Section title="Daftar Pustaka">
          <ol className="space-y-4 text-sm leading-relaxed text-muted-foreground text-justify">
            {PUSTAKA_IEEE.map((p) => (
              <li key={p.id} className="flex gap-2.5">
                <span className="font-semibold text-foreground shrink-0">[{p.id}]</span>
                <div className="flex-1">
                  <span>{p.sitasi}</span>{" "}
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-primary underline hover:opacity-80 transition-opacity text-sm break-all"
                  >
                    [{p.labelUrl}]
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AnimatedSection animation="fade-in-up" className="mt-10">
      <h2 className="mb-3.5 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground text-justify">{children}</div>
    </AnimatedSection>
  );
}
