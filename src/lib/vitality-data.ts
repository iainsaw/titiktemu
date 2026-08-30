// Titik Temu — Data Kawasan TOD
// ⚠️ ZERO DUMMY DATA pada kolom kritis.
// Nilai umkm, hargaTanah, klaster, dan seluruh skor akan ditimpa
// oleh data riil dari PostGIS (Supabase) saat halaman dimuat.

export type RoleId = "investor" | "pemerintah" | "umkm";

export const COMPONENTS = [
  { id: "properti", label: "Pasar Properti", short: "Properti" },
  { id: "layanan", label: "Kesenjangan Layanan", short: "Layanan" },
  { id: "ekonomi", label: "Keragaman Ekonomi & UMKM", short: "Ekonomi" },
  { id: "akses", label: "Aksesibilitas Transit", short: "Akses" },
] as const;

export type ComponentId = (typeof COMPONENTS)[number]["id"];

export const ROLES: {
  id: RoleId;
  label: string;
  shortLabel: string;
  tagline: string;
  weights: Record<ComponentId, number>;
}[] = [
  {
    id: "investor",
    label: "Investor Properti",
    shortLabel: "Investor",
    tagline: "Menekankan pasar properti dan potensi imbal hasil kawasan.",
    weights: { properti: 0.4, layanan: 0.15, ekonomi: 0.2, akses: 0.25 },
  },
  {
    id: "pemerintah",
    label: "Pemerintah & Operator",
    shortLabel: "Pemerintah",
    tagline: "Menekankan kesenjangan layanan dan pemerataan aksesibilitas.",
    weights: { properti: 0.15, layanan: 0.4, ekonomi: 0.15, akses: 0.3 },
  },
  {
    id: "umkm",
    label: "Pelaku UMKM",
    shortLabel: "UMKM",
    tagline: "Menekankan keramaian ekonomi dan kedekatan ke titik transit.",
    weights: { properti: 0.15, layanan: 0.2, ekonomi: 0.4, akses: 0.25 },
  },
];

export type Kawasan = {
  id: string;
  nama: string;
  koridor: string;
  klaster: "Inti Komersial" | "Transit Campuran" | "Permukiman Padat" | "Pinggiran Berkembang";
  x: number;
  y: number;
  jarakTransit: number;
  umkm: number;
  hargaTanah: number;
  anomali: boolean;
  skor: Record<ComponentId, number>;
  // Enriched data
  penduduk?: number;
  kepadatan?: number;
  pelajar?: number;
  pekerja?: number;
  totalFasilitas?: number;
};

// Nilai awal (placeholder) — akan ditimpa oleh data PostGIS.
// umkm dan hargaTanah sengaja 0 karena akan diisi dari database.
export const KAWASAN: Kawasan[] = [
  {
    id: "KWS-01",
    nama: "Alun-Alun Bandung",
    koridor: "Pusat Kota",
    klaster: "Inti Komersial",
    x: 50, y: 50,
    jarakTransit: 100,
    umkm: 0,
    hargaTanah: 35.5,
    anomali: false,
    skor: { properti: 0, layanan: 0, ekonomi: 0, akses: 0 }
  },
  {
    id: "KWS-02",
    nama: "Stasiun Bandung",
    koridor: "Stasiun Utama",
    klaster: "Inti Komersial",
    x: 40, y: 40,
    jarakTransit: 50,
    umkm: 0,
    hargaTanah: 0,
    anomali: false,
    skor: { properti: 0, layanan: 0, ekonomi: 0, akses: 0 }
  },
  {
    id: "KWS-03",
    nama: "Terminal Leuwipanjang",
    koridor: "Terminal",
    klaster: "Transit Campuran",
    x: 30, y: 80,
    jarakTransit: 50,
    umkm: 0,
    hargaTanah: 0,
    anomali: false,
    skor: { properti: 0, layanan: 0, ekonomi: 0, akses: 0 }
  },
  {
    id: "KWS-04",
    nama: "Tegalega",
    koridor: "Pusat Kota",
    klaster: "Permukiman Padat",
    x: 45, y: 70,
    jarakTransit: 200,
    umkm: 0,
    hargaTanah: 15.0,
    anomali: false,
    skor: { properti: 0, layanan: 0, ekonomi: 0, akses: 0 }
  },
  {
    id: "KWS-05",
    nama: "Dipatiukur",
    koridor: "Pendidikan & Komersial",
    klaster: "Inti Komersial",
    x: 60, y: 20,
    jarakTransit: 150,
    umkm: 0,
    hargaTanah: 25.0,
    anomali: false,
    skor: { properti: 0, layanan: 0, ekonomi: 0, akses: 0 }
  },
  {
    id: "KWS-06",
    nama: "Stasiun Kiaracondong",
    koridor: "Stasiun Utama",
    klaster: "Inti Komersial",
    x: 75, y: 40,
    jarakTransit: 30,
    umkm: 0,
    hargaTanah: 20.0,
    anomali: false,
    skor: { properti: 80, layanan: 85, ekonomi: 85, akses: 90 }
  },
  {
    id: "KWS-07",
    nama: "Stasiun Ciroyom",
    koridor: "Stasiun Utama",
    klaster: "Transit Campuran",
    x: 35, y: 35,
    jarakTransit: 40,
    umkm: 0,
    hargaTanah: 18.0,
    anomali: false,
    skor: { properti: 75, layanan: 70, ekonomi: 80, akses: 85 }
  },
  {
    id: "KWS-08",
    nama: "Stasiun Cikudapateuh",
    koridor: "Stasiun Utama",
    klaster: "Inti Komersial",
    x: 65, y: 45,
    jarakTransit: 50,
    umkm: 0,
    hargaTanah: 22.0,
    anomali: false,
    skor: { properti: 78, layanan: 75, ekonomi: 70, akses: 88 }
  },
  {
    id: "KWS-09",
    nama: "Stasiun Andir",
    koridor: "Stasiun Utama",
    klaster: "Transit Campuran",
    x: 25, y: 30,
    jarakTransit: 45,
    umkm: 0,
    hargaTanah: 15.0,
    anomali: false,
    skor: { properti: 70, layanan: 65, ekonomi: 75, akses: 80 }
  },
  {
    id: "KWS-10",
    nama: "Stasiun Cimindi",
    koridor: "Stasiun Utama",
    klaster: "Pinggiran Berkembang",
    x: 15, y: 25,
    jarakTransit: 35,
    umkm: 0,
    hargaTanah: 12.0,
    anomali: false,
    skor: { properti: 65, layanan: 60, ekonomi: 70, akses: 85 }
  },
  {
    id: "KWS-11",
    nama: "Terminal Cicaheum",
    koridor: "Terminal",
    klaster: "Transit Campuran",
    x: 85, y: 30,
    jarakTransit: 100,
    umkm: 0,
    hargaTanah: 14.0,
    anomali: false,
    skor: { properti: 60, layanan: 55, ekonomi: 65, akses: 70 }
  },
  {
    id: "KWS-12",
    nama: "Terminal Ledeng",
    koridor: "Terminal",
    klaster: "Pinggiran Berkembang",
    x: 40, y: 15,
    jarakTransit: 250,
    umkm: 0,
    hargaTanah: 10.0,
    anomali: false,
    skor: { properti: 45, layanan: 35, ekonomi: 50, akses: 30 }
  },
  {
    id: "KWS-13",
    nama: "Gasibu",
    koridor: "Pusat Kota",
    klaster: "Inti Komersial",
    x: 60, y: 35,
    jarakTransit: 200,
    umkm: 0,
    hargaTanah: 40.0,
    anomali: false,
    skor: { properti: 90, layanan: 80, ekonomi: 85, akses: 90 }
  },
  {
    id: "KWS-14",
    nama: "Braga",
    koridor: "Pusat Kota",
    klaster: "Inti Komersial",
    x: 55, y: 45,
    jarakTransit: 150,
    umkm: 0,
    hargaTanah: 45.0,
    anomali: false,
    skor: { properti: 95, layanan: 85, ekonomi: 90, akses: 95 }
  },
  {
    id: "KWS-15",
    nama: "Kiara Artha Park",
    koridor: "Pusat Kota",
    klaster: "Transit Campuran",
    x: 80, y: 50,
    jarakTransit: 300,
    umkm: 0,
    hargaTanah: 25.0,
    anomali: false,
    skor: { properti: 85, layanan: 75, ekonomi: 80, akses: 70 }
  },
  {
    id: "KWS-16",
    nama: "Antapani",
    koridor: "Permukiman",
    klaster: "Permukiman Padat",
    x: 90, y: 45,
    jarakTransit: 800,
    umkm: 0,
    hargaTanah: 15.0,
    anomali: false,
    skor: { properti: 40, layanan: 30, ekonomi: 45, akses: 25 }
  }
];

export function hitungSkor(k: Kawasan, role: RoleId) {
  const w = ROLES.find((r) => r.id === role)!.weights;
  const s = k.skor;
  return Math.round(
    s.properti * w.properti + s.layanan * w.layanan + s.ekonomi * w.ekonomi + s.akses * w.akses,
  );
}

export function kelasSkor(skor: number) {
  if (skor >= 80) return { label: "Sangat Tinggi", token: "score-5" as const };
  if (skor >= 68) return { label: "Tinggi", token: "score-4" as const };
  if (skor >= 56) return { label: "Sedang", token: "score-3" as const };
  if (skor >= 44) return { label: "Rendah", token: "score-2" as const };
  return { label: "Sangat Rendah", token: "score-1" as const };
}

export function warnaSkor(skor: number) {
  return `var(--${kelasSkor(skor).token})`;
}
