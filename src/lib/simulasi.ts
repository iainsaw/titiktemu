import {
  ROLES,
  type ComponentId,
  type Kawasan,
  type RoleId,
} from "./vitality-data";

export type JenisIntervensi = "halte" | "feeder" | "armada" | "pedestrian";

export const JENIS_INTERVENSI: {
  id: JenisIntervensi;
  label: string;
  deskripsi: string;
  radius: number; // radius pengaruh pada grid semu (unit 0-100)
  efek: Partial<Record<ComponentId, number>>; // poin maksimum di pusat intervensi
  biaya: number; // estimasi kasar, miliar rupiah per unit intensitas
}[] = [
  {
    id: "halte",
    label: "Halte / stasiun baru",
    deskripsi: "Menambah titik naik-turun penumpang di dalam kawasan.",
    radius: 16,
    efek: { layanan: 14, akses: 18, ekonomi: 5 },
    biaya: 3.5,
  },
  {
    id: "feeder",
    label: "Rute feeder baru",
    deskripsi: "Angkutan pengumpan yang menghubungkan kawasan ke koridor utama.",
    radius: 26,
    efek: { layanan: 18, akses: 12, ekonomi: 6 },
    biaya: 5.2,
  },
  {
    id: "armada",
    label: "Penambahan armada",
    deskripsi: "Menaikkan frekuensi keberangkatan pada koridor eksisting.",
    radius: 22,
    efek: { layanan: 10, akses: 14, ekonomi: 3 },
    biaya: 2.4,
  },
  {
    id: "pedestrian",
    label: "Jalur pejalan kaki",
    deskripsi: "Trotoar dan penyeberangan menuju titik transit terdekat.",
    radius: 12,
    efek: { layanan: 7, akses: 11, ekonomi: 8 },
    biaya: 1.3,
  },
];

export type Intervensi = {
  uid: string;
  jenis: JenisIntervensi;
  kawasanId: string;
  intensitas: number; // 1 - 3
};

export type HasilSimulasi = {
  kawasan: Kawasan;
  sebelum: Record<ComponentId, number>;
  sesudah: Record<ComponentId, number>;
  skorSebelum: number;
  skorSesudah: number;
  delta: number;
};

function clamp(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function jarak(a: Kawasan, b: Kawasan) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bobot(role: RoleId) {
  return ROLES.find((r) => r.id === role)!.weights;
}

export function simulasi(
  intervensi: Intervensi[],
  role: RoleId,
  kawasans: Kawasan[]
): HasilSimulasi[] {
  const w = bobot(role);

  return kawasans.map((k) => {
    const sebelum = { ...k.skor };
    const sesudah: Record<ComponentId, number> = { ...sebelum };

    for (const iv of intervensi) {
      const sumber = kawasans.find((x) => x.id === iv.kawasanId);
      const def = JENIS_INTERVENSI.find((j) => j.id === iv.jenis);
      if (!sumber || !def) continue;

      const d = jarak(sumber, k);
      if (d > def.radius) continue;

      // peluruhan linear dari pusat intervensi
      const decay = 1 - d / def.radius;
      // kawasan dengan layanan rendah mendapat manfaat lebih besar (diminishing returns)
      for (const [comp, poin] of Object.entries(def.efek) as [ComponentId, number][]) {
        const ruang = (100 - sebelum[comp]) / 100;
        sesudah[comp] = sesudah[comp] + poin * decay * iv.intensitas * (0.45 + 0.55 * ruang);
      }
    }

    (Object.keys(sesudah) as ComponentId[]).forEach((c) => (sesudah[c] = clamp(sesudah[c])));

    const skorSebelum = Math.round(
      sebelum.properti * w.properti +
        sebelum.layanan * w.layanan +
        sebelum.ekonomi * w.ekonomi +
        sebelum.akses * w.akses,
    );
    const skorSesudah = Math.round(
      sesudah.properti * w.properti +
        sesudah.layanan * w.layanan +
        sesudah.ekonomi * w.ekonomi +
        sesudah.akses * w.akses,
    );

    return { kawasan: k, sebelum, sesudah, skorSebelum, skorSesudah, delta: skorSesudah - skorSebelum };
  });
}

export function ringkasSimulasi(hasil: HasilSimulasi[], intervensi: Intervensi[]) {
  const terdampak = hasil.filter((h) => h.delta !== 0);
  const rataSebelum =
    hasil.reduce((a, b) => a + b.skorSebelum, 0) / (hasil.length || 1);
  const rataSesudah = hasil.reduce((a, b) => a + b.skorSesudah, 0) / (hasil.length || 1);

  const gapSebelum = kesenjangan(hasil.map((h) => h.sebelum.layanan));
  const gapSesudah = kesenjangan(hasil.map((h) => h.sesudah.layanan));

  const biaya = intervensi.reduce((a, iv) => {
    const def = JENIS_INTERVENSI.find((j) => j.id === iv.jenis);
    return a + (def ? def.biaya * iv.intensitas : 0);
  }, 0);

  return {
    jumlahTerdampak: terdampak.length,
    rataSebelum: Math.round(rataSebelum * 10) / 10,
    rataSesudah: Math.round(rataSesudah * 10) / 10,
    deltaRata: Math.round((rataSesudah - rataSebelum) * 10) / 10,
    gapSebelum: Math.round(gapSebelum * 10) / 10,
    gapSesudah: Math.round(gapSesudah * 10) / 10,
    biaya: Math.round(biaya * 10) / 10,
    teratas: [...terdampak].sort((a, b) => b.delta - a.delta).slice(0, 5),
  };
}

/** Standar deviasi skor layanan sebagai proxy kesenjangan antar kawasan. */
function kesenjangan(nilai: number[]) {
  if (!nilai.length) return 0;
  const mean = nilai.reduce((a, b) => a + b, 0) / nilai.length;
  return Math.sqrt(nilai.reduce((a, b) => a + (b - mean) ** 2, 0) / nilai.length);
}
