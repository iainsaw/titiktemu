import {
  COMPONENTS,
  ROLES,
  hitungSkor,
  kelasSkor,
  type Kawasan,
  type RoleId,
} from "./vitality-data";

/** Ringkasan seluruh kawasan untuk dipakai sebagai konteks chat assistant. */
export function konteksDashboard(role: RoleId, kawasans: Kawasan[], terpilih?: Kawasan) {
  const peran = ROLES.find((r) => r.id === role)!;

  const baris = [...kawasans]
    .map((k) => ({ k, skor: hitungSkor(k, role) }))
    .sort((a, b) => b.skor - a.skor)
    .map(
      ({ k, skor }) =>
        `${k.nama} (${k.id}, ${k.koridor}, ${k.klaster}): total ${skor} [${kelasSkor(skor).label}], ` +
        COMPONENTS.map((c) => `${c.short} ${k.skor[c.id]}`).join(", ") +
        `, jarak transit ${k.jarakTransit} m, UMKM ${k.umkm}, harga tanah ${k.hargaTanah} jt/m2${k.anomali ? ", ANOMALI PELUANG" : ""}`,
    );

  return [
    `Peran aktif: ${peran.label} — bobot ${COMPONENTS.map((c) => `${c.short} ${peran.weights[c.id]}`).join(", ")}.`,
    terpilih ? `Kawasan yang sedang dipilih pengguna: ${terpilih.nama} (${terpilih.id}).` : "",
    "",
    "Daftar kawasan (urut skor tertinggi):",
    ...baris,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Konteks fokus satu kawasan untuk panel AI Insight. */
export function konteksKawasan(k: Kawasan, role: RoleId, kawasans: Kawasan[]) {
  const peran = ROLES.find((r) => r.id === role)!;
  const skor = hitungSkor(k, role);

  const rataKomponen = COMPONENTS.map((c) => {
    const rata = Math.round(kawasans.reduce((a, b) => a + b.skor[c.id], 0) / kawasans.length);
    return `${c.label}: kawasan ${k.skor[c.id]} vs rata-rata pilot ${rata} (selisih ${k.skor[c.id] - rata})`;
  });

  return [
    `Kawasan: ${k.nama} (${k.id}), koridor ${k.koridor}, klaster ${k.klaster}.`,
    `Peran pengguna: ${peran.label}; bobot ${COMPONENTS.map((c) => `${c.short} ${peran.weights[c.id]}`).join(", ")}.`,
    `Skor total tertimbang: ${skor} (${kelasSkor(skor).label}).`,
    `Perbandingan komponen terhadap rata-rata 5 kawasan pilot:`,
    ...rataKomponen.map((r) => `- ${r}`),
    `Konteks tambahan: jarak ke titik transit ${k.jarakTransit} m, ${k.umkm} unit UMKM, harga tanah ${k.hargaTanah} juta/m2${k.anomali ? ", kawasan ditandai ANOMALI PELUANG oleh model." : "."}`,
  ].join("\n");
}
