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
  foto: { judul: string; keterangan: string };
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
    tanggal: "14 Mei 2026",
    surveyor: "Tim B (3 orang)",
    metode: "Pemetaan POI + kuesioner UMKM",
    titik: 31,
    temuan: [
      "Rata-rata penumpang komuter tinggi di pagi dan sore hari",
      "Banyaknya POI komersial dan hotel di pintu selatan",
      "Titik kemacetan parah karena penjemputan online/taksi",
    ],
    catatan: "Hub utama transit kota, membutuhkan penataan sirkulasi kendaraan.",
    foto: { judul: "Pintu Selatan Stasiun", keterangan: "Antrean penjemputan penumpang" },
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
  totalTitik: SURVEI.reduce((a, b) => a + b.titik, 0),
  totalLokasi: SURVEI.length,
  totalResponden: 135,
  periode: "Mei 2026",
};
