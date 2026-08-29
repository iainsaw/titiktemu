export type Survei = {
  id: string;
  kawasanId: string;
  lokasi: string;
  tanggal: string;
  surveyor: string;
  metode: string;
  titik: number;
  temuan: string[];
  catatan: string;
  foto: { judul: string; keterangan: string; src?: string };
  fotos?: { judul: string; keterangan: string; src?: string }[];
};

export const SURVEI: Survei[] = [
  {
    id: "SRV-01",
    kawasanId: "KWS-02",
    lokasi: "Stasiun Bandung",
    tanggal: "28 Agustus 2026",
    surveyor: "Dimyati",
    metode: "Pemetaan POI, Penilaian Infrastruktur Pejalan Kaki, dan Observasi Fasilitas Publik",
    titik: 20,
    temuan: [
      "Kawasan gerbang utara memiliki konsentrasi POI komersial dan hiburan tinggi — Hotel Geary dan Loko Cafe sangat berpotensi mendukung konsep TOD.",
      "Trotoar di luar kawasan stasiun rusak dan dialihfungsikan sebagai parkir motor, memaksa pejalan kaki berjalan di badan jalan.",
      "Tidak tersedianya smoking area menyebabkan paparan asap rokok merata di area stasiun dan tumpukan sampah puntung rokok.",
    ],
    catatan: "Penataan trotoar dan penertiban parkir di luar stasiun mendesak untuk keselamatan pejalan kaki. Penyediaan smoking area khusus perlu segera dilakukan. Potensi TOD di gerbang utara dapat dioptimalkan lebih lanjut.",
    foto: { judul: "Stasiun Bandung", keterangan: "Kawasan Stasiun Bandung" },
    fotos: [
      { judul: "Plang Stasiun", keterangan: "Papan nama Stasiun Bandung dengan rambu dilarang parkir", src: "/stasiun-bandung-1.jpg" },
      { judul: "Loko Cafe", keterangan: "Suasana Loko Cafe di area stasiun", src: "/stasiun-bandung-2.jpg" },
      { judul: "Jalur Pejalan Kaki", keterangan: "Kondisi selasar pejalan kaki di dalam area stasiun", src: "/stasiun-bandung-3.jpg" },
      { judul: "Trotoar Luar", keterangan: "Kondisi trotoar luar kawasan stasiun yang dialihfungsikan", src: "/stasiun-bandung-4.jpg" },
      { judul: "Titik Kepadatan", keterangan: "Aktivitas komersial dan hiburan di kawasan gerbang utara", src: "/stasiun-bandung-5.jpg" }
    ],
  },
  {
    id: "SRV-02",
    kawasanId: "KWS-05",
    lokasi: "Dipatiukur",
    tanggal: "29 Agustus 2026",
    surveyor: "Shafina Moktika Khairani",
    metode: "Pemetaan POI, Observasi Infrastruktur Pejalan Kaki, dan Pencacahan Moda Transportasi",
    titik: 18,
    temuan: [
      "Dipatiukur memiliki konsentrasi pusat aktivitas yang kuat — keberadaan UNPAD, UNIKOM, ITHB, hotel, UMKM kuliner, dan fasilitas publik menciptakan intensitas pergerakan tinggi dengan karakter mixed-use yang mendukung TOD.",
      "Jaringan transportasi umum cukup beragam: Metro Jabar Trans Koridor 5, angkot, serta pool shuttle/travel (Cititrans, Daytrans, Jackal Holidays, Lintas, Pasteur Trans, Aragon Transport) saling melengkapi dan meningkatkan konektivitas kawasan.",
      "Aktivitas ekonomi dan transportasi yang padat berpotensi menimbulkan konflik ruang — keterbatasan parkir mendorong kendaraan ke badan jalan, sementara UMKM kuliner menyempitkan jalur pejalan kaki di sekitar titik transit.",
    ],
    catatan: "Potensi TOD Dipatiukur cukup kuat berkat kombinasi transportasi umum, kampus, UMKM, dan fasilitas publik dalam radius berdekatan. Pengembangan perlu fokus pada integrasi halte dengan jalur pedestrian, pengaturan parkir, penataan UMKM, serta memperkuat koneksi pedestrian antara halte Metro Jabar Trans, zebra cross, UNPAD, dan Monumen Perjuangan.",
    foto: { judul: "Dipatiukur", keterangan: "Kawasan Dipatiukur, Bandung", src: "/survei/dipatiukur/metro-jabar-trans.jpg" },
    fotos: [
      { judul: "Metro Jabar Trans", keterangan: "Armada Metro Jabar Trans Koridor 5 melintas di kawasan Dipatiukur", src: "/survei/dipatiukur/metro-jabar-trans.jpg" },
      { judul: "UNIKOM", keterangan: "Gedung Universitas Komputer Indonesia (UNIKOM) sebagai salah satu pusat aktivitas utama kawasan", src: "/survei/dipatiukur/unikom.jpg" },
      { judul: "Angkot Stop", keterangan: "Rambu Angkot Stop rute 06 dan 16 di kawasan Dipatiukur", src: "/survei/dipatiukur/angkot-stop.jpg" },
      { judul: "UMKM Kuliner", keterangan: "Pedagang kaki lima dan gerobak kuliner yang beroperasi di trotoar jalan", src: "/survei/dipatiukur/umkm-kuliner.jpg" },
      { judul: "Monumen Perjuangan", keterangan: "Monumen Perjuangan Rakyat Jawa Barat sebagai landmark kawasan Dipatiukur", src: "/survei/dipatiukur/monumen-perjuangan.jpg" },
    ],
  },
];

export const RINGKASAN_SURVEI = {
  totalTitik: 38,
  totalLokasi: SURVEI.length,
  totalJamObservasi: 12,
  periode: "Agustus 2026",
};
