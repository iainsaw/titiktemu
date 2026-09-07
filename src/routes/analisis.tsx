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
  Cell,
  LabelList,
} from "recharts";
import { Plus, Trash2, Route as RouteIcon } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { AnimatedNumber } from "@/components/AnimatedNumber";
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
import { useKawasans } from "@/hooks/useKawasans";

const PALET = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export const Route = createFileRoute("/analisis")({
  head: () => ({
    meta: [
      { title: "Analisis & Perbandingan — Titik Temu" },
      {
        name: "description",
        content:
          "Vitality Twin: bandingkan hingga empat kawasan transit Kota Bandung dan simulasikan dampak penambahan rute, armada, halte, atau jalur pejalan kaki terhadap skor kesenjangan layanan.",
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
  const { kawasans } = useKawasans();

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
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-5 sm:py-12">
        <AnimatedSection>
          <h1 className="headline text-[clamp(28px,8vw,50px)]">Analisis & Perbandingan</h1>
          <p className="mt-2 max-w-2xl text-[13.5px] text-muted-foreground sm:text-[14px]">
            Bandingkan potensi tiap kawasan secara berdampingan. Anda juga bisa menguji simulasi: lihat bagaimana skor kawasan melonjak naik saat Anda menambahkan rute angkot, halte, atau jalur pejalan kaki baru.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={100} className="mt-6 flex flex-wrap items-center gap-2">
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
        </AnimatedSection>

        <AnimatedSection delay={200} className="mt-6 flex flex-col gap-5">
          <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
            <div className="panel p-4 flex flex-col h-[356px] min-h-0 overflow-hidden">
              <h2 className="mb-3 text-sm font-semibold shrink-0">Pilih kawasan ({dipilih.length}/4)</h2>
              <div
                className="flex-1 min-h-0 overflow-y-auto floating-scrollbar pr-1"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
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
                              ? "bg-secondary text-foreground font-medium"
                              : "text-muted-foreground hover:bg-secondary/60",
                          )}
                        >
                          <span className="truncate">{k.nama}</span>
                          <span
                            className="font-display text-[11px] font-semibold"
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
            </div>
            {kawasan.length === 0 ? (
              <div className="panel flex flex-col items-center justify-center p-8 text-center sm:p-12">
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                  <Plus className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Belum ada kawasan yang dipilih</h3>
                <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Silakan pilih minimal 1 hingga 4 kawasan dari daftar di samping untuk menampilkan diagram radar, grafik total, dan tabel perbandingan.
                </p>
                <button
                  onClick={() => setDipilih([kawasans[0]?.id ?? STATIC_KAWASAN[0].id, kawasans[2]?.id ?? STATIC_KAWASAN[2].id, kawasans[4]?.id ?? STATIC_KAWASAN[4].id])}
                  className="pill mt-4 bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  Pilih 3 Kawasan Utama
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div className="panel p-4 sm:p-5">
                    <h2 className="mb-4 text-sm font-semibold">Diagram radar komponen skor</h2>
                    <div className="h-[240px] sm:h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} outerRadius="70%">
                          <PolarGrid stroke="var(--border)" />
                          <PolarAngleAxis
                            dataKey="komponen"
                            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          />
                          {kawasan.map((k, i) => (
                            <Radar
                              key={k.id}
                              name={k.nama}
                              dataKey={k.nama}
                              stroke={PALET[i % PALET.length]}
                              fill={PALET[i % PALET.length]}
                              fillOpacity={0.18}
                            />
                          ))}
                          <Legend wrapperStyle={{ fontSize: 11 }} />
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

                  <div className="panel p-4 sm:p-5">
                    <h2 className="mb-4 text-sm font-semibold">Skor total tertimbang per peran</h2>
                    <div className="h-[240px] sm:h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis
                            dataKey="nama"
                            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
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
                          <Bar dataKey="skor" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="panel overflow-x-auto p-4 sm:p-5">
                  <h2 className="mb-4 text-sm font-semibold">Tabel perbandingan</h2>
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="w-[25%] pb-2 font-medium">Kawasan</th>
                        {COMPONENTS.map((c) => (
                          <th key={c.id} className="w-[12%] whitespace-nowrap px-2 pb-2 text-center font-medium">
                            {c.short}
                          </th>
                        ))}
                        <th className="w-[15%] whitespace-nowrap px-2 pb-2 text-center font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kawasan.map((k) => (
                        <tr key={k.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30">
                          <td className="py-2.5 pr-4 font-medium">{k.nama}</td>
                          {COMPONENTS.map((c) => (
                            <td key={c.id} className="px-2 py-2.5 text-center font-display">
                              {k.skor[c.id]}
                            </td>
                          ))}
                          <td
                            className="px-2 py-2.5 text-center font-display font-semibold"
                            style={{ color: warnaSkor(hitungSkor(k, role)) }}
                          >
                            {hitungSkor(k, role)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </AnimatedSection>

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
  const [hanyaTerdampak, setHanyaTerdampak] = useState(false);

  const hasil = useMemo(() => simulasi(daftar, role, kawasans), [daftar, role, kawasans]);
  const ringkas = useMemo(() => ringkasSimulasi(hasil, daftar), [hasil, daftar]);

  const chartData = useMemo(() => {
    let list = hasil;
    if (hanyaTerdampak) {
      const filtered = hasil.filter(
        (h) => h.kawasan.id === kawasanId || (h.sesudah.layanan - h.sebelum.layanan) > 0
      );
      if (filtered.length > 0) list = filtered;
    }

    return list.map((h) => {
      const isSelected = h.kawasan.id === kawasanId;
      const deltaLayanan = h.sesudah.layanan - h.sebelum.layanan;
      const isImpacted = deltaLayanan > 0;

      return {
        id: h.kawasan.id,
        namaFull: h.kawasan.nama,
        nama: h.kawasan.nama.length > 12 ? `${h.kawasan.nama.slice(0, 11)}…` : h.kawasan.nama,
        Sebelum: h.sebelum.layanan,
        Sesudah: h.sesudah.layanan,
        deltaLayanan,
        isSelected,
        isImpacted,
        colorSebelum: isSelected ? "#3b82f6" : isImpacted ? "#64748b" : "#94a3b8",
        colorSesudah: isSelected ? "#10b981" : isImpacted ? "#0071E3" : "#cbd5e1",
      };
    });
  }, [hasil, kawasanId, hanyaTerdampak]);

  const CustomTooltipSimulasi = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const delta = data.deltaLayanan;

    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 p-3.5 shadow-xl backdrop-blur-md text-popover-foreground text-xs min-w-[200px]">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 mb-2 font-semibold">
          <span>{data.namaFull}</span>
          {data.isSelected ? (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Pusat Intervensi
            </span>
          ) : data.isImpacted ? (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              Terdampak
            </span>
          ) : (
            <span className="text-[10px] font-normal text-muted-foreground">Tidak Berubah</span>
          )}
        </div>
        <div className="space-y-1.5 font-display">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Skor Baseline (Sebelum):</span>
            <span className="font-semibold text-foreground">{data.Sebelum}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Skor Simulasi (Sesudah):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.Sesudah}</span>
          </div>
          {delta > 0 && (
            <div className="mt-1 flex items-center justify-between rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
              <span>Kenaikan Layanan:</span>
              <span>+{delta} Poin</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const tambah = () =>
    setDaftar((p) => [
      ...p,
      { uid: `${Date.now()}-${p.length}`, jenis, kawasanId, intensitas },
    ]);

  return (
    <AnimatedSection animation="fade-in-up" delay={150} className="mt-12">
      <h2 className="headline flex items-center gap-2 text-[26px] sm:text-[34px]">
        Simulasi dampak penambahan layanan
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Skor layanan sebelum vs sesudah</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Warna terang menyoroti kawasan yang terpilih dan mengalami peningkatan skor.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-secondary/60 p-1 text-[12px]">
                <button
                  onClick={() => setHanyaTerdampak(false)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-all",
                    !hanyaTerdampak
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Semua Kawasan (16)
                </button>
                <button
                  onClick={() => setHanyaTerdampak(true)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-all",
                    hanyaTerdampak
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Hanya Terdampak
                </button>
              </div>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: -15, bottom: 10 }}
                >
                  <XAxis
                    dataKey="nama"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={65}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltipSimulasi />} cursor={{ fill: "var(--secondary)" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => (value === "Sebelum" ? "Skor Baseline (Sebelum)" : "Skor Simulasi (Sesudah)")}
                  />
                  <Bar dataKey="Sebelum" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-seb-${index}`}
                        fill={entry.colorSebelum}
                        opacity={entry.isImpacted || entry.isSelected ? 1 : 0.4}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="Sesudah" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-ses-${index}`}
                        fill={entry.colorSesudah}
                        opacity={entry.isImpacted || entry.isSelected ? 1 : 0.35}
                      />
                    ))}
                    <LabelList
                      dataKey="deltaLayanan"
                      position="top"
                      formatter={(val: any) => (typeof val === "number" && val > 0 ? `+${val}` : "")}
                      style={{ fill: "var(--primary)", fontSize: 10, fontWeight: "bold" }}
                    />
                  </Bar>
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
                    <th className="pb-2 font-medium w-[25%]">Kawasan</th>
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
                      <td className="py-2.5 font-display">
                        {h.sebelum.layanan} → {h.sesudah.layanan}
                      </td>
                      <td className="py-2.5 font-display">
                        {h.sebelum.akses} → {h.sesudah.akses}
                      </td>
                      <td className="py-2.5 font-display">
                        {h.skorSebelum} → {h.skorSesudah}
                      </td>
                      <td className="py-2.5 font-display font-semibold text-primary">+{h.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

function Metrik({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="panel p-4 flex flex-col justify-center h-full">
      <p className="text-[11px] text-muted-foreground whitespace-nowrap">{label}</p>
      <p className="font-display text-[22px] font-semibold tracking-tight whitespace-nowrap">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground truncate" title={sub}>{sub}</p>
    </div>
  );
}
