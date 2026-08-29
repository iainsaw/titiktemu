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
  {
    id: "SRV-03",
    kawasanId: "KWS-04",
    lokasi: "Tegalega",
    tanggal: "Sabtu, 29 Agustus 2026",
    surveyor: "Gilang Wijaya",
    metode: "Observasi Karakteristik Kawasan TOD (<800m)",
    titik: 20,
    temuan: [
      "Keragaman POI di kawasan Tegallega tergolong cukup tinggi, meliputi fasilitas kesehatan, pendidikan, perbankan, UMKM, perdagangan, hingga ruang terbuka publik.",
      "Aktivitas kawasan memiliki pola waktu yang berbeda — aktivitas Pasar Tegallega dominan pada pagi hingga siang hari, sementara fasilitas publik lainnya lebih fleksibel.",
      "Terdapat potensi integrasi yang baik antara titik transportasi (halte/bus stop) dengan berbagai POI, namun kualitas akses pejalan kaki masih perlu ditingkatkan.",
    ],
    catatan: "Kawasan Tegallega memiliki potensi TOD yang kuat didukung keberagaman POI. Pengembangan perlu diarahkan pada peningkatan konektivitas antar-titik transit dan POI melalui akses pejalan kaki yang aman. Optimalisasi kawasan juga perlu memperhatikan pola waktu aktivitas yang cenderung terkonsentrasi.",
    foto: { judul: "Tegalega", keterangan: "Kawasan Tegalega, Bandung", src: "/survei/tegalega/tirtalega.jpg" },
    fotos: [
      { judul: "Kolam Renang Tirtalega", keterangan: "Gerbang masuk kawasan UPTD Tegallega", src: "/survei/tegalega/tirtalega.jpg" },
      { judul: "Angkot Stop", keterangan: "Aktivitas masyarakat dan penumpang di pemberhentian angkot", src: "/survei/tegalega/angkot-stop.jpg" },
      { judul: "Metro Jabar Trans", keterangan: "Armada bus Metro Jabar Trans melintas di halte Moh. Toha", src: "/survei/tegalega/metro-jabar-trans.jpg" },
      { judul: "Pasar UMKM", keterangan: "Aktivitas perdagangan di Pasar Tegallega yang dominan di pagi-siang hari", src: "/survei/tegalega/pasar.jpg" },
      { judul: "Fasilitas Komersial", keterangan: "Fasilitas kesehatan dan komersial yang mendukung fungsi kawasan", src: "/survei/tegalega/apotek.jpg" },
    ],
  },
  {
    id: "SRV-04",
    kawasanId: "KWS-01",
    lokasi: "Alun-Alun Bandung",
    tanggal: "Selasa, 25 Agustus 2026",
    surveyor: "Firzatullah Al Ghiffari",
    metode: "Observasi karakteristik ruang publik, UMKM, dan infrastruktur transit (halte, pejalan kaki, JPO)",
    titik: 5,
    temuan: [
      "Fasilitas transit kekurangan informasi rute dan aksesibilitas; halte utama hanya memiliki peta rute tunggal, sementara bus stop lain minim petunjuk trayek dengan kondisi fisik yang mulai rusak.",
      "Infrastruktur ramah disabilitas belum memadai; JPO Asia Afrika terawat namun ketiadaan lift menyulitkan penyandang disabilitas, mendorong pejalan kaki menyeberang langsung di jalan.",
      "Pemanfaatan ruang publik dan komersial tidak konsisten; Cikapundung Riverspot aktif dengan PKL di sore hari, namun sebagian kios bersejarah di Jl. Alakateri justru tutup pada siang hari."
    ],
    catatan: "Kawasan Alun-Alun Bandung memerlukan peningkatan informasi rute pada titik transit dan perbaikan fasilitas aksesibilitas (seperti lift pada JPO). Optimalisasi ruang komersial juga diperlukan agar aktivitas ekonomi berjalan optimal dan konsisten sepanjang hari.",
    foto: { judul: "Alun-Alun Bandung", keterangan: "Cikapundung Riverspot di kawasan Alun-Alun Bandung", src: "/survei/alun-alun/cikapundung.jpg" },
    fotos: [
      { judul: "Cikapundung Riverspot", keterangan: "Cikapundung Riverspot menjadi taman aktif dengan banyak spot foto", src: "/survei/alun-alun/cikapundung.jpg" },
      { judul: "Bus Stop", keterangan: "Bus stop depan Golden Megah Corp tanpa petunjuk trayek", src: "/survei/alun-alun/bus-stop.jpg" },
      { judul: "Kondisi Halte", keterangan: "Kondisi fisik tempat duduk halte yang mulai terkelupas dan rusak", src: "/survei/alun-alun/halte-rusak.jpg" },
      { judul: "JPO Asia Afrika", keterangan: "JPO dalam kondisi terawat namun tidak dilengkapi dengan lift", src: "/survei/alun-alun/jpo-tangga.jpg" },
      { judul: "Kios & Ruang Publik", keterangan: "Pemanfaatan ruang oleh pedagang dan area makan di sekitar kawasan", src: "/survei/alun-alun/umkm-kuliner.jpg" }
    ],
  },
  {
    id: "SRV-05",
    kawasanId: "KWS-03",
    lokasi: "Terminal Leuwipanjang",
    tanggal: "Sabtu, 28 & 29 Agustus 2026",
    surveyor: "Syahrul Muharam",
    metode: "Observasi ground truth parameter TOD, kualitas aksesibilitas, fasilitas publik (POI), ekonomi ritel, dan potensi pasar properti",
    titik: 20,
    temuan: [
      "Fasilitas layanan publik (POI) terdistribusi baik dan esensial, terintegrasi dengan fasilitas keagamaan dan instansi pemerintah di luar terminal, membuktikan fungsi kawasan lebih dari sekadar tempat naik-turun penumpang.",
      "Infrastruktur pedestrian secara fisik memadai namun fungsinya terdegradasi ekstrem akibat parkir liar roda dua yang memutus konektivitas first/last mile, serta adanya kerusakan trotoar parah di perhentian Trans Metro Bandung.",
      "Dinamika ekonomi menunjukkan aktivitas UMKM dan ritel yang hidup, namun masih terdapat lahan berpagar (blank spot) yang berpotensi menjadi peluang investasi strategis untuk fasilitas mixed-use berbasis TOD."
    ],
    catatan: "Terminal Leuwipanjang memiliki potensi besar sebagai kawasan TOD. Fokus utama perbaikan adalah penertiban parkir liar di trotoar untuk mengembalikan fungsi pedestrian, perbaikan infrastruktur di titik perhentian, serta optimalisasi lahan pasif menjadi ruang komersial terintegrasi.",
    foto: { judul: "Terminal Leuwipanjang", keterangan: "Suasana Terminal Leuwipanjang saat senja", src: "/survei/leuwipanjang/2.jpg" },
    fotos: [
      { judul: "Potensi Lahan Pasif", keterangan: "Lahan berpagar yang disewakan di sekitar kawasan", src: "/survei/leuwipanjang/1.jpg" },
      { judul: "Terminal Senja", keterangan: "Tampilan Terminal Leuwipanjang pada waktu senja", src: "/survei/leuwipanjang/2.jpg" },
      { judul: "UMKM dan Ritel", keterangan: "Aktivitas UMKM dan ritel yang ramai di sepanjang jalan", src: "/survei/leuwipanjang/3.jpg" },
      { judul: "Fasilitas Publik", keterangan: "Fasilitas Badan Gizi Nasional di dekat kawasan terminal", src: "/survei/leuwipanjang/4.jpg" },
      { judul: "Fasilitas Keagamaan", keterangan: "Masjid Jami Al-Mushlih yang terintegrasi dengan kawasan", src: "/survei/leuwipanjang/5.jpg" }
    ],
  },
];

export const RINGKASAN_SURVEI = {
  totalTitik: 83,
  totalLokasi: SURVEI.length,
  totalJamObservasi: 18,
  periode: "Agustus 2026",
};
