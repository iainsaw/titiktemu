import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Plus, Trash2, Route as RouteIcon } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  COMPONENTS,
  KAWASAN as STATIC_KAWASAN,
  ROLES,
  hitungSkor,
  warnaSkor,
  type RoleId,
  type Kawasan,

} from "@/lib/vitality-data";
import {
  JENIS_INTERVENSI,
  ringkasSimulasi,
  simulasi,
  type Intervensi,
  type JenisIntervensi,
} from "@/lib/simulasi";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

const PALET = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export const Route = createFileRoute("/analisis")({
  head: () => ({
    meta: [
      { title: "Analisis & Perbandingan — Titik Temu" },
      {
        name: "description",
        content:
          "Vitality Twin: bandingkan hingga empat kawasan transit Bandung Raya dan simulasikan dampak penambahan rute, armada, halte, atau jalur pejalan kaki terhadap skor kesenjangan layanan.",
      },
      { property: "og:title", content: "Analisis & Perbandingan — Titik Temu" },
      {
        property: "og:description",
        content:
          "Diagram radar, tabel perbandingan, dan simulator dampak penambahan layanan transit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analisis,
});

function Analisis() {
  const [role, setRole] = useState<RoleId>("pemerintah");
  const [dipilih, setDipilih] = useState<string[]>([STATIC_KAWASAN[0].id, STATIC_KAWASAN[2].id, STATIC_KAWASAN[4].id]);
  const [kawasans, setKawasans] = useState<Kawasan[]>(STATIC_KAWASAN);

  useEffect(() => {
    async function loadRealData() {
      try {
        const { data, error } = await supabase.from('tod_stations').select('*');
        if (error || !data || data.length === 0) return;

        setKawasans(prev => prev.map(k => {
          const dbData = data.find(d => d.id === k.id);
          if (!dbData) return k;
          return {
            ...k,
            klaster: (dbData.klaster as Kawasan['klaster']) || k.klaster,
            umkm: dbData.umkm_count ?? k.umkm,
            hargaTanah: dbData.harga_tanah_m2 ? Math.round(dbData.harga_tanah_m2 * 10) / 10 : k.hargaTanah,
            skor: {
              properti: Math.min(100, Math.max(1, dbData.skor_properti ?? 0)),
              layanan: Math.min(100, Math.max(1, dbData.skor_layanan ?? 0)),
              ekonomi: Math.min(100, Math.max(1, dbData.skor_ekonomi ?? 0)),
              akses: Math.min(100, Math.max(1, dbData.skor_akses ?? 0)),
            },
          };
        }));
      } catch (e) {
        console.error("Gagal load data asli:", e);
      }
    }
    loadRealData();
  }, []);

  const kawasan = kawasans.filter((k) => dipilih.includes(k.id));

  const toggle = (id: string) =>
    setDipilih((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 4 ? [...prev, id] : prev,
    );

  const radarData = COMPONENTS.map((c) => {
    const row: Record<string, string | number> = { komponen: c.short };
    kawasan.forEach((k) => (row[k.nama] = k.skor[c.id]));
    return row;
  });

  const barData = kawasan.map((k) => ({
    nama: k.nama.length > 16 ? `${k.nama.slice(0, 15)}…` : k.nama,
    skor: hitungSkor(k, role),
  }));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-5 sm:py-12">
        <h1 className="headline text-[clamp(28px,8vw,50px)]">Analisis & Perbandingan</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-muted-foreground sm:text-[14px]">

          Bandingkan potensi tiap kawasan secara berdampingan. Anda juga bisa menguji simulasi: lihat bagaimana skor kawasan melonjak naik saat Anda menambahkan rute angkot, halte, atau jalur pejalan kaki baru.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={cn(
                "pill border px-4 py-1.5 text-[13px] font-medium transition-colors",
                role === r.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="panel max-h-[560px] overflow-y-auto p-4">
            <h2 className="mb-3 text-sm font-semibold">Pilih kawasan ({dipilih.length}/4)</h2>
            <ul className="space-y-1">
              {kawasans.map((k) => {
                const aktif = dipilih.includes(k.id);
                return (
                  <li key={k.id}>
                    <button
                      onClick={() => toggle(k.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                        aktif
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60",
                      )}
                    >
                      <span className="truncate">{k.nama}</span>
                      <span
                        className="font-mono text-[11px] font-semibold"
                        style={{ color: warnaSkor(hitungSkor(k, role)) }}
                      >
                        {hitungSkor(k, role)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-5">
            <div className="panel p-5">
              <h2 className="mb-4 text-sm font-semibold">Diagram radar komponen skor</h2>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="komponen"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                    {kawasan.map((k, i) => (
                      <Radar
                        key={k.id}
                        name={k.nama}
                        dataKey={k.nama}
                        stroke={PALET[i]}
                        fill={PALET[i]}
                        fillOpacity={0.18}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="mb-4 text-sm font-semibold">Skor total tertimbang per peran</h2>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis
                      dataKey="nama"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--secondary)" }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="skor" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel overflow-x-auto p-5">
              <h2 className="mb-4 text-sm font-semibold">Tabel perbandingan</h2>
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="pb-2 font-medium">Kawasan</th>
                    {COMPONENTS.map((c) => (
                      <th key={c.id} className="pb-2 font-medium">
                        {c.short}
                      </th>
                    ))}
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Tren</th>
                  </tr>
                </thead>
                <tbody>
                  {kawasan.map((k) => (
                    <tr key={k.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 font-medium">{k.nama}</td>
                      {COMPONENTS.map((c) => (
                        <td key={c.id} className="py-2.5 font-mono">
                          {k.skor[c.id]}
                        </td>
                      ))}
                      <td
                        className="py-2.5 font-mono font-semibold"
                        style={{ color: warnaSkor(hitungSkor(k, role)) }}
                      >
                        {hitungSkor(k, role)}
                      </td>
                      <td className="py-2.5 font-mono text-accent"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <SimulasiLayanan role={role} kawasans={kawasans} />
      </main>
      <SiteFooter />
    </div>
  );
}

function SimulasiLayanan({ role, kawasans }: { role: RoleId; kawasans: Kawasan[] }) {
  const [jenis, setJenis] = useState<JenisIntervensi>("feeder");
  const [kawasanId, setKawasanId] = useState<string>(STATIC_KAWASAN[0].id);
  const [intensitas, setIntensitas] = useState(1);
  const [daftar, setDaftar] = useState<Intervensi[]>([]);

  const hasil = useMemo(() => simulasi(daftar, role, kawasans), [daftar, role, kawasans]);
  const ringkas = useMemo(() => ringkasSimulasi(hasil, daftar), [hasil, daftar]);

  const tambah = () =>
    setDaftar((p) => [
      ...p,
      { uid: `${Date.now()}-${p.length}`, jenis, kawasanId, intensitas },
    ]);

  return (
    <section className="mt-12">
      <h2 className="headline flex items-center gap-2 text-[26px] sm:text-[34px]">
        <RouteIcon className="size-6 text-primary" /> Simulasi dampak penambahan layanan
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
        Tambahkan rute feeder, armada, halte, atau jalur pejalan kaki pada kawasan tertentu, lalu
        lihat perubahan skor kesenjangan layanan, aksesibilitas, dan skor total di seluruh pilot.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="panel space-y-4 p-5">
          <div>
            <label className="text-[12px] font-medium">Jenis intervensi</label>
            <div className="mt-2 grid gap-1.5">
              {JENIS_INTERVENSI.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setJenis(j.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-[12px] transition-colors",
                    jenis === j.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  <span className="font-medium">{j.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{j.deskripsi}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium" htmlFor="lokasi-intervensi">
              Lokasi (pusat pengaruh)
            </label>
            <select
              id="lokasi-intervensi"
              value={kawasanId}
              onChange={(e) => setKawasanId(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
            >
              {kawasans.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium" htmlFor="intensitas">
              Intensitas / jumlah unit: {intensitas}
            </label>
            <input
              id="intensitas"
              type="range"
              min={1}
              max={3}
              step={1}
              value={intensitas}
              onChange={(e) => setIntensitas(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </div>

          <button
            onClick={tambah}
            className="pill inline-flex w-full items-center justify-center gap-1.5 bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> Tambahkan ke skenario
          </button>

          {daftar.length > 0 && (
            <ul className="space-y-1.5 border-t border-border pt-3">
              {daftar.map((iv) => {
                const def = JENIS_INTERVENSI.find((j) => j.id === iv.jenis)!;
                const k = kawasans.find((x) => x.id === iv.kawasanId)!;
                return (
                  <li
                    key={iv.uid}
                    className="flex items-center gap-2 rounded-md bg-secondary px-2.5 py-2 text-[12px]"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {def.label} ×{iv.intensitas} · {k.nama}
                    </span>
                    <button
                      onClick={() => setDaftar((p) => p.filter((x) => x.uid !== iv.uid))}
                      aria-label="Hapus intervensi"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  onClick={() => setDaftar([])}
                  className="mt-1 text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Reset skenario
                </button>
              </li>
            </ul>
          )}
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <Metrik label="Kawasan terdampak" value={`${ringkas.jumlahTerdampak}`} sub="dari 16" />
            <Metrik
              label="Rata-rata skor"
              value={`${ringkas.rataSesudah}`}
              sub={`${ringkas.deltaRata >= 0 ? "+" : ""}${ringkas.deltaRata} vs baseline`}
            />
            <Metrik
              label="Kesenjangan layanan"
              value={`${ringkas.gapSesudah}`}
              sub={`baseline ${ringkas.gapSebelum} (σ, makin kecil makin merata)`}
            />
            <Metrik
              label="Estimasi biaya"
              value={`Rp ${ringkas.biaya} M`}
              sub="perkiraan kasar, bukan angka resmi"
            />
          </div>

          <div className="panel p-5">
            <h3 className="mb-4 text-sm font-semibold">Skor layanan sebelum vs sesudah</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hasil.map((h) => ({
                    nama: h.kawasan.nama.length > 12 ? `${h.kawasan.nama.slice(0, 11)}…` : h.kawasan.nama,
                    Sebelum: h.sebelum.layanan,
                    Sesudah: h.sesudah.layanan,
                  }))}
                >
                  <XAxis
                    dataKey="nama"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={70}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--secondary)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Sebelum" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Sesudah" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel overflow-x-auto p-5">
            <h3 className="mb-4 text-sm font-semibold">Kawasan dengan kenaikan skor terbesar</h3>
            {ringkas.teratas.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Belum ada intervensi. Tambahkan minimal satu skenario untuk melihat dampaknya.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="pb-2 font-medium">Kawasan</th>
                    <th className="pb-2 font-medium">Layanan</th>
                    <th className="pb-2 font-medium">Akses</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {ringkas.teratas.map((h) => (
                    <tr key={h.kawasan.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 font-medium">{h.kawasan.nama}</td>
                      <td className="py-2.5 font-mono">
                        {h.sebelum.layanan} → {h.sesudah.layanan}
                      </td>
                      <td className="py-2.5 font-mono">
                        {h.sebelum.akses} → {h.sesudah.akses}
                      </td>
                      <td className="py-2.5 font-mono">
                        {h.skorSebelum} → {h.skorSesudah}
                      </td>
                      <td className="py-2.5 font-mono font-semibold text-primary">+{h.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metrik({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-display text-[22px] font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] leading-snug text-muted-foreground">{sub}</p>
    </div>
  );
}
