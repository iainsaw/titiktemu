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
    kawasanId: "KWS-01",
    lokasi: "Alun-Alun Bandung",
    tanggal: "12 Mei 2026",
    surveyor: "Tim A (2 orang)",
    metode: "Traffic count manual + wawancara pedagang",
    titik: 24,
    temuan: [
      "Kepadatan pejalan kaki tertinggi di kawasan pusat",
      "Banyak pedagang kaki lima di sekitar jalan Asia Afrika",
      "Konektivitas ke halte sangat memadai, namun trotoar padat",
    ],
    catatan: "Pusat aktivitas pariwisata. Potensi besar jika ditata pedestrian way.",
    foto: { judul: "Pedestrian Asia Afrika", keterangan: "Kepadatan wisata jam sore" },
  },
  {
    id: "SRV-02",
    kawasanId: "KWS-02",
    lokasi: "Stasiun Bandung",
    tanggal: "28 Agustus 2026",
    surveyor: "Dimyati",
    metode: "Pemetaan POI, Penilaian Infrastruktur Pejalan Kaki, dan Observasi Fasilitas Publik",
    titik: 20,
    temuan: [
      "Kawasan gerbang utara memiliki konsentrasi tinggi untuk POI komersial dan hiburan seperti Hotel Geary dan Loko Cafe, yang sangat berpotensi mendukung konsep Transit Oriented Development (TOD).",
      "Kondisi infrastruktur di luar kawasan stasiun memprihatinkan dengan adanya trotoar rusak dan penyalahgunaan area pejalan kaki untuk parkir motor. Hal ini memaksa pejalan kaki menggunakan badan jalan raya yang berisiko tinggi terhadap keselamatan mereka.",
      "Tidak tersedianya area merokok khusus (Smoking Area) menyebabkan paparan asap rokok yang mengganggu pengunjung non-perokok dan berdampak pada berserakannya sampah puntung rokok di area stasiun.",
    ],
    catatan: "Perlu adanya penataan trotoar dan penertiban parkir di luar kawasan stasiun untuk keselamatan pejalan kaki. Selain itu, penyediaan fasilitas area merokok khusus sangat mendesak untuk menjaga kebersihan dan kenyamanan pengunjung. Potensi TOD di gerbang utara dapat dioptimalkan lebih lanjut.",
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
    id: "SRV-03",
    kawasanId: "KWS-03",
    lokasi: "Terminal Leuwipanjang",
    tanggal: "16 Mei 2026",
    surveyor: "Tim B (3 orang)",
    metode: "Kuesioner penumpang + observasi jam operasional",
    titik: 28,
    temuan: [
      "Aktivitas pergerakan didominasi penumpang antar-kota",
      "Terdapat kesenjangan kualitas trotoar penghubung",
      "Banyak UMKM yang bergantung pada lalu lintas bus siang hari",
    ],
    catatan: "Potensial untuk dikembangkan sebagai mixed-use terminal.",
    foto: { judul: "Pintu Keluar Terminal", keterangan: "Lalu lintas bus dan angkot" },
  },
  {
    id: "SRV-04",
    kawasanId: "KWS-04",
    lokasi: "Tegalega",
    tanggal: "19 Mei 2026",
    surveyor: "Tim A (2 orang)",
    metode: "Observasi lapangan + pencatatan aktivitas informal",
    titik: 22,
    temuan: [
      "Kawasan didominasi permukiman padat",
      "Pasar tumpah dan aktivitas informal sangat tinggi di akhir pekan",
      "Akses transit belum memadai dibanding kebutuhan populasi",
    ],
    catatan: "Permukiman padat namun jangkauan ke titik transit utama terbilang jauh.",
    foto: { judul: "Area Monumen", keterangan: "Pasar tumpah pagi hari" },
  },
  {
    id: "SRV-05",
    kawasanId: "KWS-05",
    lokasi: "Dipatiukur",
    tanggal: "21 Mei 2026",
    surveyor: "Tim C (2 orang)",
    metode: "Traffic count + pemetaan area komersial",
    titik: 30,
    temuan: [
      "Kepadatan tinggi yang didominasi oleh segmen pelajar/mahasiswa",
      "Area komersial dan kuliner sangat aktif hingga malam",
      "Infrastruktur pejalan kaki ada, namun sering terokupansi parkir",
    ],
    catatan: "Kawasan pendidikan kuat dengan potensi integrasi jalur pejalan kaki yang baik.",
    foto: { judul: "Kawasan Kampus", keterangan: "Aktivitas mahasiswa siang hari" },
  },
];

export const RINGKASAN_SURVEI = {
  totalTitik: 100,
  totalLokasi: SURVEI.length,
  totalJamObservasi: 135,
  periode: "Agustus 2026",
};
