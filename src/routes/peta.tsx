import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Search as SearchIcon, Expand, Shrink } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { AnimatedNumber } from "@/components/AnimatedNumber";

import { VitalityMap, addDynamicKoordinat, KOORDINAT } from "@/components/VitalityMap";
const aiStar = { url: "/titik-temu-ai-star.png" };
import {
  COMPONENTS,
  KAWASAN as STATIC_KAWASAN,
  ROLES,
  hitungSkor,
  kelasSkor,
  warnaSkor,
  type Kawasan,
  type ComponentId,
  type RoleId,
} from "@/lib/vitality-data";
import { generateOpportunityInsight } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { analyzeNewPlace } from "@/lib/analyze-point";
import { createCirclePolygon, type MissionFeature } from "@/lib/api-missions";
import { fetchAllMAPIDMissionsFn } from "@/lib/api-missions.functions";
import { useKawasans } from "@/hooks/useKawasans";

type Search = { peran?: RoleId };
const PERAN_VALID: RoleId[] = ["investor", "pemerintah", "umkm"];

export const Route = createFileRoute("/peta")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    peran: PERAN_VALID.includes(search.peran as RoleId) ? (search.peran as RoleId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Peta Interaktif — Titik Temu" },
    ],
  }),
  component: PetaInteraktif,
});

const LAYERS: { id: ComponentId | "total"; label: string }[] = [
  { id: "total", label: "Skor total" },
  ...COMPONENTS.map((c) => ({ id: c.id as ComponentId, label: c.short })),
];

function PetaInteraktif() {
  const { peran: peranAwal } = Route.useSearch();
  const [role, setRole] = useState<RoleId>(peranAwal ?? "investor");
  const [layer, setLayer] = useState<ComponentId | "total">("total");
  const [koridor, setKoridor] = useState(true);
  const [sensus, setSensus] = useState(true);
  const [angkot, setAngkot] = useState(false);
  const [bus, setBus] = useState(false);
  const [poiPendidikan, setPoiPendidikan] = useState(false);
  const [poiKesehatan, setPoiKesehatan] = useState(false);
  const [poiKomersial, setPoiKomersial] = useState(false);
  const [poiHiburan, setPoiHiburan] = useState(false);
  const [poiTransit, setPoiTransit] = useState(false);
  const [pedestrian, setPedestrian] = useState(false);
  const [tampilkanMissions, setTampilkanMissions] = useState(false);
  const [anomaliLayer, setAnomaliLayer] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { kawasans, setKawasans } = useKawasans();
  const [selectedId, setSelectedId] = useState<string>(STATIC_KAWASAN[0].id);
  const [searchNewPlace, setSearchNewPlace] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [missions, setMissions] = useState<MissionFeature[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const coord = KOORDINAT[selectedId];
    if (!coord) return;
    const apiKey = import.meta.env.VITE_MAPID_API_KEY;
    if (!apiKey) return;

    let isMounted = true;
    setMissions([]);
    setMissionsLoading(true);

    const polygon = createCirclePolygon(coord[0], coord[1], 800);
    fetchAllMAPIDMissionsFn({ data: { polygon } }).then(data => {
      if (isMounted) {
        setMissions([...data.properti, ...data.menu, ...data.struk]);
        setMissionsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setMissionsLoading(false);
    });

    return () => { isMounted = false; };
  }, [selectedId]);

  const handleAnalisis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNewPlace.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const { kawasan, geo } = await analyzeNewPlace(searchNewPlace);
      const normalizedNewName = kawasan.nama.toLowerCase().replace(/\s+/g, '');
      const existing = kawasans.find(k => k.nama.toLowerCase().replace(/\s+/g, '') === normalizedNewName);
      
      if (existing) {
        setSelectedId(existing.id);
      } else {
        addDynamicKoordinat(kawasan.id, [geo.lng, geo.lat]);
        setKawasans(prev => [kawasan, ...prev].slice(0, 16));
        setSelectedId(kawasan.id);
      }
      setSearchNewPlace("");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Gagal menganalisis lokasi");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (analyzeError) {
      const timer = setTimeout(() => {
        setAnalyzeError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [analyzeError]);

  const handleEditHarga = (id: string, currentVal: number) => {
    const val = window.prompt(`Masukkan benchmark Harga Tanah pasar riil (Juta/m²) untuk ${id}:`, currentVal.toString());
    if (val !== null) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        setCustomPrices(prev => ({ ...prev, [id]: num }));
      }
    }
  };

  const handleAskAI = async (kws: Kawasan) => {
    setIsAiLoading(true);
    try {
      const insight = await generateOpportunityInsight({ data: { kws, role } });
      setAiRecommendation(insight);
    } catch (e) {
      setAiRecommendation("Terjadi kesalahan koneksi saat memanggil AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const finalKawasans = kawasans.map(k => {
    if (customPrices[k.id] !== undefined) {
      const newPrice = customPrices[k.id];
      return {
        ...k,
        hargaTanah: newPrice,
        skor: {
          ...k.skor,
          properti: Math.min(100, Math.max(1, Math.round((newPrice / 25) * 100)))
        }
      };
    }
    return k;
  });

  const peran = ROLES.find((r) => r.id === role)!;
  const terpilih = finalKawasans.find((k) => k.id === selectedId)!;
  const skorTerpilih = hitungSkor(terpilih, role);

  const peringkat = [...finalKawasans]
    .map((k) => ({ k, skor: hitungSkor(k, role) }))
    .sort((a, b) => b.skor - a.skor);

  // Search & Filter Component
  const searchFilterContent = (
    <div>
      <div className="flex items-center gap-2">
        <form onSubmit={handleAnalisis} className="relative flex-1">
          <input
            type="text"
            placeholder={analyzing ? "Menganalisis..." : "Cari lokasi..."}
            value={searchNewPlace}
            onChange={e => { setSearchNewPlace(e.target.value); setAnalyzeError(""); }}
            disabled={analyzing}
            className="h-[36px] w-full rounded-xl bg-secondary/60 pl-9 pr-4 text-[13px] transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-white/10 disabled:opacity-50"
          />
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
          </div>
        </form>
        <button
          type="button"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="lg:hidden flex h-[36px] items-center justify-center rounded-xl bg-secondary/60 px-3 text-[13px] font-medium transition-colors hover:bg-secondary"
        >
          Layer
        </button>
      </div>

      <div className={cn("mt-3 flex-col gap-3", showMobileFilters ? "flex" : "hidden lg:flex")}>
        <div className="flex flex-wrap gap-1.5">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-200",
                layer === l.id
                  ? "bg-ink text-ink-foreground shadow-sm dark:bg-white dark:text-black"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary/80 dark:bg-white/10"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] text-muted-foreground">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={koridor} onChange={(e) => setKoridor(e.target.checked)} className="size-3.5 rounded accent-ink" />
            Koridor
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={angkot} onChange={(e) => setAngkot(e.target.checked)} className="size-3.5 rounded accent-amber-500" />
            Jalur Angkot
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={bus} onChange={(e) => setBus(e.target.checked)} className="size-3.5 rounded accent-emerald-500" />
            Jalur Bus (BRT)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={poiPendidikan} onChange={(e) => setPoiPendidikan(e.target.checked)} className="size-3.5 rounded accent-blue-500" />
            Pendidikan
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={poiKesehatan} onChange={(e) => setPoiKesehatan(e.target.checked)} className="size-3.5 rounded accent-red-500" />
            Kesehatan
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={poiKomersial} onChange={(e) => setPoiKomersial(e.target.checked)} className="size-3.5 rounded accent-yellow-500" />
            Komersial
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={poiHiburan} onChange={(e) => setPoiHiburan(e.target.checked)} className="size-3.5 rounded accent-pink-500" />
            Hiburan
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={poiTransit} onChange={(e) => setPoiTransit(e.target.checked)} className="size-3.5 rounded accent-violet-500" />
            Transit
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" checked={tampilkanMissions} onChange={(e) => setTampilkanMissions(e.target.checked)} className="size-3.5 rounded accent-sky-500" />
            Misi MAPID
          </label>
        </div>
      </div>
    </div>
  );

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // PDF Generation without map
  const handleGeneratePDF = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    
    // Beri jeda sejenak agar React sempat merender animasi loading sebelum main thread diblokir
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      // Dynamically import to avoid SSR issues
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("pdf-report-template");
      if (!element) return;
      
      const opt = {
        margin:       15,
        filename:     `Laporan-Titik-Temu-${terpilih.nama.replace(/\s+/g, '-')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().from(element).set(opt).save();
    } catch (e) {
      console.error("Failed to generate PDF", e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Detail Kawasan Component
  const detailContent = (
    <div>
      {/* Kawasan Header */}
      <div className="flex items-center justify-between mb-1.5 print:hidden">
        <span className="text-[11px] font-semibold tracking-wide text-ink dark:text-white uppercase">
          {terpilih.klaster}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {isGeneratingPdf ? <Loader2 className="size-3 animate-spin" /> : "Unduh Laporan PDF"}
          </button>
        </div>
      </div>

      {/* Title + Score */}
      <div className="flex items-start justify-between gap-3 mt-1.5 mb-4">
        <div className="min-w-0">
          <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground/50">
            {terpilih.id} · {terpilih.koridor}
          </p>
          <h2 className="mt-1 truncate text-[18px] font-semibold tracking-tight">{terpilih.nama}</h2>
          <p className="mt-1 text-[12px] font-medium leading-snug" style={{ color: warnaSkor(skorTerpilih) }}>
            Vitalitas {kelasSkor(skorTerpilih).label} · {peran.tagline}
          </p>
        </div>
        <div
          className="flex size-[44px] shrink-0 items-center justify-center rounded-xl border-[2px] text-[18px] font-extrabold"
          style={{ borderColor: warnaSkor(skorTerpilih), color: warnaSkor(skorTerpilih), backgroundColor: `color-mix(in srgb, ${warnaSkor(skorTerpilih)} 6%, transparent)` }}
        >
          {skorTerpilih}
        </div>
      </div>

      {/* Score Bars */}
      <div className="rounded-xl bg-secondary/30 p-3.5 dark:bg-white/5">
        <div className="space-y-3">
          {COMPONENTS.map((c) => {
            const nilai = terpilih.skor[c.id];
            return (
              <div key={c.id}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[12px] font-medium text-foreground/70">{c.label}</span>
                  <span className="font-display text-[12px] font-semibold text-foreground">
                    {nilai}
                    <span className="ml-1 text-[9px] text-muted-foreground/60">
                      ×{peran.weights[c.id].toFixed(2)}
                    </span>
                  </span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-secondary/60 dark:bg-white/8">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ width: `${nilai}%`, backgroundColor: warnaSkor(nilai) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demographics */}
      {terpilih.penduduk && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-secondary/30 p-3.5 dark:bg-white/5">
          <div>
            <span className="block text-[10px] text-muted-foreground mb-0.5">Penduduk (2024)</span>
            <span className="font-display text-[13px] font-semibold"><AnimatedNumber value={terpilih.penduduk} /></span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground mb-0.5">Kepadatan</span>
            <span className="font-display text-[13px] font-semibold"><AnimatedNumber value={Math.round(terpilih.kepadatan || 0)} suffix=" /km²" /></span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground mb-0.5">Pelajar & Mhs</span>
            <span className="font-display text-[13px] font-semibold"><AnimatedNumber value={terpilih.pelajar || 0} /></span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground mb-0.5">Total Fasilitas</span>
            <span className="font-display text-[13px] font-semibold"><AnimatedNumber value={terpilih.totalFasilitas || 0} suffix=" POI" /></span>
          </div>
        </div>
      )}

      {/* Quick Facts */}
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-secondary/30 p-3 text-center dark:bg-white/5">
        <Fact label="Transit" value={terpilih.jarakTransit || 0} suffix="m" fallback="N/A" />
        <Fact label="UMKM" value={terpilih.umkm || 0} fallback="N/A" />
        <div className="group relative flex flex-col items-center justify-center cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-secondary/50" onClick={() => handleEditHarga(terpilih.id, terpilih.hargaTanah)}>
          <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-blue-500 transition-colors">
            Harga
          </dt>
          <dd className="mt-1 font-display text-[14px] font-semibold">
            {terpilih.hargaTanah ? `${terpilih.hargaTanah} jt` : "N/A"}
          </dd>
          {customPrices[terpilih.id] && (
            <span className="absolute top-1 right-1 flex h-1 w-1 rounded-full bg-blue-500" />
          )}
        </div>
      </dl>

      {/* Anomaly */}
      {terpilih.anomali && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-ink/10 bg-ink/[0.03] p-3 text-[12px] text-ink dark:text-white/80">
          <img src={aiStar.url} alt="" className="mt-0.5 size-3.5 shrink-0" />
          <span className="leading-relaxed">
            <strong className="font-semibold block mb-0.5">Anomali peluang tersembunyi</strong>
            Aktivitas ekonomi di atas ekspektasi dibanding harga tanah dan kualitas layanan.
          </span>
        </div>
      )}

      {/* AI Recommendation */}
      <div className="mt-3 rounded-xl border border-ink/10 bg-ink/[0.03] p-4">
        {!aiRecommendation && !isAiLoading && (
          <button
            onClick={() => handleAskAI(terpilih)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[12px] font-medium text-ink-foreground transition-all hover:opacity-90 active:scale-95 print:hidden shadow-sm dark:bg-white dark:text-black"
          >
            <img src={aiStar.url} alt="" className="size-3.5 brightness-0 invert dark:invert-0" /> 
            {role === "investor" ? "Analisis Properti" : role === "pemerintah" ? "Analisis Perencanaan" : "Analisis Usaha"}
          </button>
        )}

        {isAiLoading && (
          <div className="flex items-center justify-center gap-2 text-[12px] text-ink/80 py-2 dark:text-white/80">
            <Loader2 className="size-3.5 animate-spin" /> Menganalisis pasar...
          </div>
        )}

        {aiRecommendation && (
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink dark:text-white mb-2">
              <img src={aiStar.url} alt="" className="size-3" /> {role === "investor" ? "Analisis Properti" : role === "pemerintah" ? "Analisis Perencanaan" : "Analisis Usaha"}
            </div>
            <p 
              className="text-[12px] leading-relaxed text-foreground/85"
              dangerouslySetInnerHTML={{
                __html: aiRecommendation
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  // Rankings Component
  const rankingsContent = (
    <div className="flex flex-col overflow-hidden">
      <div className="px-4 pt-3.5 pb-2.5 border-b border-border/10 shrink-0 flex items-center justify-between bg-white dark:bg-zinc-900">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
          Peringkat Kawasan
        </h3>
        <Link
          to="/analisis"
          className="text-[11px] font-medium text-ink hover:underline dark:text-white"
        >
          Bandingkan ›
        </Link>
      </div>
      {/* Max height set to ~190px to comfortably show exactly 5 items before scrolling */}
      <div
        className="overflow-y-auto px-2 py-2 floating-scrollbar"
        style={{ maxHeight: "190px" }}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <ol className="space-y-0.5">
          {peringkat.map(({ k, skor }, i) => (
            <li key={k.id}>
              <button
                onClick={() => setSelectedId(k.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-[12px] transition-all",
                  k.id === selectedId
                    ? "bg-secondary font-medium text-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-secondary/50"
                )}
              >
                <span className="w-4 font-display text-[11px] text-muted-foreground/40">{i + 1}</span>
                <span className="flex-1 truncate">{k.nama}</span>
                <span
                  className="rounded-md px-1.5 py-0.5 font-display text-[11px] font-semibold"
                  style={{
                    color: warnaSkor(skor),
                    backgroundColor: `color-mix(in srgb, ${warnaSkor(skor)} 8%, transparent)`,
                  }}
                >
                  {skor}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  // Role Selector Component
  const roleSelectorContent = (
    <div className="grid grid-cols-3 gap-1 w-full">
      {ROLES.map((r) => (
        <button
          key={r.id}
          onClick={() => {
            setRole(r.id);
            setAiRecommendation("");
          }}
          className={cn(
            "rounded-lg px-2 py-1.5 text-[11px] sm:text-[12px] font-medium transition-all duration-200 text-center truncate flex items-center justify-center min-w-0",
            role === r.id
              ? "bg-ink text-ink-foreground shadow-sm dark:bg-white dark:text-black font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <span className="sm:hidden truncate">{r.shortLabel}</span>
          <span className="hidden sm:inline truncate">{r.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">

      {/* ── GLOBAL NAV ── */}
      <div className="shrink-0 z-50 print:hidden">
        <SiteHeader />
      </div>

      {/* ── MAIN CONTAINER ── */}
      <div className="relative flex-1 overflow-hidden flex flex-col lg:block">
        
        {/* Toast Error Floating */}
        {analyzeError && (
          <div className="absolute bottom-6 left-6 z-[100] max-w-sm rounded-xl border border-destructive/20 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl dark:bg-black/95 dark:border-destructive/30 animate-in fade-in slide-in-from-bottom-5">
            <p className="text-[13px] font-medium leading-relaxed text-foreground">
              {analyzeError}
            </p>
          </div>
        )}

        {/* ── MAP AREA ── */}
        <main className="relative shrink-0 h-[40vh] lg:h-full w-full z-0 bg-muted/10 lg:absolute lg:inset-0 print:hidden">
          <VitalityMap
            className="size-full"
            fill
            kawasan={kawasans}
            role={role}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setIsMapMaximized(false);
            }}
            layer={layer}
            tampilkanKoridor={koridor}
            tampilkanSensus={sensus}
            tampilkanAngkot={angkot}
            tampilkanBus={bus}
            poiPendidikan={poiPendidikan}
            poiKesehatan={poiKesehatan}
            poiKomersial={poiKomersial}
            poiHiburan={poiHiburan}
            poiTransit={poiTransit}
            tampilkanPedestrian={pedestrian}
            tampilkanMissions={tampilkanMissions}
            tampilkanAnomali={anomaliLayer}
            missions={missions}
          />

          {/* Desktop Floating Button: Toggle Sidebar */}
          <button
            onClick={() => setIsMapMaximized(!isMapMaximized)}
            className="hidden lg:flex pointer-events-auto absolute bottom-[84px] right-4 z-20 size-9 items-center justify-center rounded-xl bg-white/90 text-foreground/70 shadow-md backdrop-blur-md border border-border/30 transition-all hover:bg-white hover:text-foreground dark:bg-zinc-900/90 dark:text-white/80 print:hidden"
            title={isMapMaximized ? "Tampilkan Cards" : "Sembunyikan Cards"}
          >
            {isMapMaximized ? <Shrink className="size-4" /> : <Expand className="size-4" />}
          </button>

          {/* Desktop Floating: Legend */}
          <div className="hidden lg:block absolute bottom-4 right-4 z-20 rounded-xl bg-white dark:bg-zinc-900 px-3.5 py-3 shadow-xl border border-border/30 print:hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">Legenda Skor</span>
              <span className="text-[10px] text-muted-foreground/50 ml-3">r=800m</span>
            </div>
            <div className="flex items-center gap-1.5 w-40">
              <span className="font-display text-[10px] text-muted-foreground/60">0</span>
              <div className="flex-1 flex h-[6px] rounded-full overflow-hidden shadow-inner">
                {[20, 48, 60, 72, 88].map((s) => (
                  <div key={s} className="h-full flex-1" style={{ backgroundColor: warnaSkor(s) }} />
                ))}
              </div>
              <span className="font-display text-[10px] text-muted-foreground/60">100</span>
            </div>
          </div>
        </main>

        {/* ── DESKTOP OVERLAY LAYOUT (lg:flex) ── */}
        {/* Left Side: Detail Kawasan */}
        <div
          className={cn(
            "hidden lg:flex flex-col gap-3 absolute top-4 left-4 z-30 w-[360px] max-h-[calc(100vh-96px)] pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:hidden",
            isMapMaximized && "left-[-420px] opacity-0"
          )}
        >
          <div
            className="pointer-events-auto rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-xl border border-border/30 overflow-y-auto max-h-full floating-scrollbar"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {detailContent}
          </div>
        </div>

        {/* Right Side: Search & Filter (Top) + Rankings (Bottom) */}
        <div
          className={cn(
            "hidden lg:flex flex-col gap-3 absolute top-4 right-4 z-30 w-[320px] max-h-[calc(100vh-124px)] pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:hidden",
            isMapMaximized && "right-[-420px] opacity-0"
          )}
        >
          {/* Search Card */}
          <div
            className="pointer-events-auto rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-xl border border-border/30 shrink-0"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {searchFilterContent}
          </div>

          {/* Rankings Card */}
          <div
            className="pointer-events-auto rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-border/30 flex-1 min-h-0 overflow-hidden flex flex-col h-[330px] max-h-[calc(100vh-140px)]"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {rankingsContent}
          </div>
        </div>

        {/* Desktop Floating Center: Role Selector Pill */}
        <div className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-white dark:bg-zinc-900 shadow-xl border border-border/30 rounded-xl p-1 w-[420px] print:hidden">
          {roleSelectorContent}
        </div>

        {/* ── MOBILE CONTENT SECTION (< lg) ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-950 p-3 pb-24 flex flex-col gap-3.5 lg:hidden z-10 print:hidden">
          
          {/* Card 1: Search & Filter */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-sm border border-border/40">
            {searchFilterContent}
          </div>

          {/* Card 2: Detail Kawasan */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-sm border border-border/40">
            {detailContent}
          </div>

          {/* Card 3: Peringkat Kawasan */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-border/40 flex flex-col overflow-hidden pointer-events-auto">
            {rankingsContent}
          </div>
        </div>

        {/* Mobile Floating Bottom Bar: Role Selector */}
        <div className="lg:hidden fixed bottom-3 left-2 right-2 z-40 flex justify-center pointer-events-none print:hidden">
          <div className="pointer-events-auto bg-white/95 dark:bg-zinc-900/95 shadow-2xl border border-border/50 backdrop-blur-md rounded-xl p-1 flex gap-1 justify-center max-w-[360px] w-full">
            {roleSelectorContent}
          </div>
        </div>

        {/* ── PDF REPORT TEMPLATE (Hidden from screen) ── */}
        <div className="absolute top-0 left-0 w-[210mm] z-[-100] opacity-0 pointer-events-none print:hidden">
          <div id="pdf-report-template" className="bg-white text-black font-latex px-[10mm] pt-[15mm] pb-[10mm]">
            <h1 className="text-center text-[22pt] font-bold uppercase border-b-2 border-black pb-4 mb-6 tracking-wide">
              Laporan Analisis Vitalitas Kawasan
            </h1>
            
            <div className="flex justify-between items-start mb-10 text-[11pt] leading-relaxed">
              <div>
                <p><strong>Platform:</strong> Titik Temu Pintar</p>
                <p><strong>Kawasan:</strong> {terpilih.nama} ({terpilih.klaster})</p>
                <p><strong>Perspektif:</strong> {peran.label}</p>
              </div>
              <div className="text-right">
                <p><strong>Tanggal:</strong> {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Radius Analisis:</strong> 800m</p>
              </div>
            </div>

            <h2 className="text-[14pt] font-bold mb-4">1. Ringkasan Skor Vitalitas</h2>
            <p className="text-[11pt] text-justify mb-4 leading-relaxed">
              Berdasarkan model pembobotan untuk peran <strong>{peran.label}</strong>, kawasan {terpilih.nama} mendapatkan skor vitalitas sebesar <strong>{skorTerpilih}</strong> dari 100, menempatkannya pada kelas <strong>{kelasSkor(skorTerpilih).label}</strong>. Berikut adalah rincian kontribusi masing-masing komponen pembentuk:
            </p>

            <table className="w-full text-[11pt] border-collapse border border-black text-left mb-10">
              <thead>
                <tr>
                  <th className="border border-black px-4 py-3 bg-gray-100">Komponen</th>
                  <th className="border border-black px-4 py-3 bg-gray-100 text-center w-24">Skor</th>
                  <th className="border border-black px-4 py-3 bg-gray-100 text-center w-24">Bobot</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENTS.map(c => (
                  <tr key={c.id}>
                    <td className="border border-black px-4 py-3">{c.label}</td>
                    <td className="border border-black px-4 py-3 text-center font-bold">
                      {terpilih.skor[c.id]}
                    </td>
                    <td className="border border-black px-4 py-3 text-center text-gray-600">
                      {peran.weights[c.id] * 100}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="text-[14pt] font-bold mb-4">2. Analisis & Rekomendasi Sistem</h2>
            {aiRecommendation ? (
              <div className="text-[11pt] text-justify leading-relaxed [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-2 [&_li]:mb-1 [&_strong]:font-bold border-l-4 border-black pl-4 py-1">
                <div dangerouslySetInnerHTML={{ __html: aiRecommendation }} />
              </div>
            ) : (
              <p className="text-[11pt] italic text-gray-500">Hasil analisis AI belum di-generate untuk kawasan ini.</p>
            )}
            
            <div className="mt-16 text-center text-[10pt] italic text-gray-500 border-t border-gray-300 pt-4">
              Dokumen ini dihasilkan secara otomatis dari platform Titik Temu Pintar. Seluruh hasil didasarkan pada data faktual dan model analisis spasial komprehensif.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function Fact({ label, value, suffix, fallback }: { label: string; value: string | number; suffix?: string; fallback?: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-[14px] font-semibold">
        {typeof value === 'number' && value > 0 ? <AnimatedNumber value={value} suffix={suffix} /> : fallback || value}
      </dd>
    </div>
  );
}
