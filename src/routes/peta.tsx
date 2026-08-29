import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Search as SearchIcon, Expand, Shrink } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { AnimatedSection } from "@/components/AnimatedSection";
import { AnimatedNumber } from "@/components/AnimatedNumber";

import { VitalityMap } from "@/components/VitalityMap";
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
import { generateInsights, generateOpportunityInsight } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { analyzeNewPlace } from "@/lib/analyze-point";
import { addDynamicKoordinat, KOORDINAT } from "@/components/VitalityMap";
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
  
  const { kawasans, setKawasans } = useKawasans();
  const [selectedId, setSelectedId] = useState<string>(STATIC_KAWASAN[0].id);
  const [searchNewPlace, setSearchNewPlace] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [missions, setMissions] = useState<MissionFeature[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

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



  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);


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

  // Jika terpilih berubah, reset rekomendasi AI
  useEffect(() => {
    setAiRecommendation("");
  }, [selectedId]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">

      {/* ── GLOBAL NAV ── */}
      <div className="shrink-0 z-50 print:hidden">
        <SiteHeader />
      </div>

      {/* ── BODY: Map as background, Cards floating ── */}
      <div className="relative flex-1 overflow-hidden">
        
        {/* Toast Error Floating */}
        {analyzeError && (
          <div className="absolute bottom-6 left-6 z-[100] max-w-sm rounded-xl border border-destructive/20 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl dark:bg-black/95 dark:border-destructive/30 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-start">
              <p className="text-[13px] font-medium leading-relaxed text-foreground">
                {analyzeError}
              </p>
            </div>
          </div>
        )}

        {/* MAP AREA */}
        <main className="absolute inset-0 bg-muted/10 print:static print:w-full">
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

          {/* CARD 1: Role Selector (Bottom Center) */}
          <AnimatedSection animation="fade-in-up" delay={200} className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-white/90 p-1 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 print:hidden">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r.id);
                  setAiRecommendation("");
                }}
                className={cn(
                  "rounded-lg px-4 py-2 text-[12px] font-medium transition-all duration-200",
                  role === r.id
                    ? "bg-ink text-ink-foreground shadow-sm dark:bg-white dark:text-black"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {r.label}
              </button>
            ))}
          </AnimatedSection>

          {/* RIGHT CARDS CONTAINER */}
          <AnimatedSection animation="slide-in-right" delay={100} className={cn(
            "absolute top-4 right-4 z-40 flex max-h-[calc(100vh-32px)] w-[300px] flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:hidden",
            isMapMaximized ? "right-[-400px] opacity-0" : "opacity-100"
          )}>
            
            {/* CARD 2: Search & Layers */}
            <div className="shrink-0 flex flex-col rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10">
              {/* Search */}
              <form onSubmit={handleAnalisis} className="relative">
                <input
                  type="text"
                  placeholder={analyzing ? "Menganalisis..." : "Cari lokasi..."}
                  value={searchNewPlace}
                  onChange={e => { setSearchNewPlace(e.target.value); setAnalyzeError(""); }}
                  disabled={analyzing}
                  className="h-[36px] w-full rounded-xl bg-secondary/50 pl-9 pr-4 text-[13px] transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-white/8 disabled:opacity-50"
                />
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                  {analyzing ? <Loader2 className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
                </div>
              </form>

              {/* Layer Pill Chips */}
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {LAYERS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayer(l.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-200",
                      layer === l.id
                        ? "bg-ink text-ink-foreground shadow-sm dark:bg-white dark:text-black"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70 dark:bg-white/8"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Overlay Toggles */}
              <div className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] text-muted-foreground">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={koridor} onChange={(e) => setKoridor(e.target.checked)} className="size-3.5 rounded accent-ink" />
                  Koridor
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={angkot} onChange={(e) => setAngkot(e.target.checked)} className="size-3.5 rounded accent-amber-500" />
                  Angkot
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={bus} onChange={(e) => setBus(e.target.checked)} className="size-3.5 rounded accent-emerald-500" />
                  Bus (BRT)
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

            {/* CARD 4: Rankings */}
            <div className="flex flex-col rounded-2xl bg-white/90 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 overflow-hidden">
              <div className="px-4 pt-4 pb-2.5 border-b border-border/10 shrink-0 flex items-center justify-between">
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
              <div className="flex-1 overflow-y-auto px-2 py-2 floating-scrollbar max-h-[380px]">
                <ol className="space-y-0.5">
                  {peringkat.map(({ k, skor }, i) => (
                    <li key={k.id}>
                      <button
                        onClick={() => setSelectedId(k.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] transition-all",
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
                            backgroundColor: `color-mix(in oklab, ${warnaSkor(skor)} 8%, transparent)`,
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
          </AnimatedSection>

          {/* LEFT CARDS CONTAINER */}
          <AnimatedSection animation="slide-in-left" delay={100} className={cn(
            "absolute top-4 left-4 z-40 flex max-h-[calc(100vh-32px)] w-[320px] flex-col gap-4 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:static print:w-full",
            isMapMaximized ? "left-[-400px] opacity-0" : "opacity-100"
          )}>
            
            {/* CARD 3: Selected Details & AI */}
            <div className="flex flex-col rounded-2xl bg-white/90 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 p-4">
              {/* Kawasan Header */}
              <div className="flex items-center justify-between mb-1.5 print:hidden">
                <span className="text-[11px] font-semibold tracking-wide text-ink dark:text-white uppercase">
                  {terpilih.klaster}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-secondary"
                  >
                    PDF
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
                  style={{ borderColor: warnaSkor(skorTerpilih), color: warnaSkor(skorTerpilih), backgroundColor: `color-mix(in oklab, ${warnaSkor(skorTerpilih)} 6%, transparent)` }}
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
                  <dt className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-blue-500 transition-colors">
                    Harga
                  </dt>
                  <dd className="mt-0.5 font-display text-[12px] font-semibold">
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

              {/* AI Recommendation (Integrated into Card 3) */}
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
          </AnimatedSection>

          {/* Floating: Toggle Sidebar (Moved to right above legend) */}
          <button
            onClick={() => setIsMapMaximized(!isMapMaximized)}
            className="absolute bottom-[80px] right-4 z-50 flex size-9 items-center justify-center rounded-[12px] bg-white/80 text-foreground/60 shadow-md backdrop-blur-xl border border-border/20 transition-all hover:bg-white hover:text-foreground hover:shadow-lg dark:bg-black/50 dark:text-white/70 dark:border-white/10 print:hidden"
            title={isMapMaximized ? "Tampilkan Cards" : "Sembunyikan Cards"}
          >
            {isMapMaximized ? <Shrink className="size-4" /> : <Expand className="size-4" />}
          </button>

          {/* Floating: Legend */}
          <div className="absolute bottom-4 right-4 z-20 rounded-[14px] bg-white/90 px-3.5 py-3 shadow-xl backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 print:hidden">
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
