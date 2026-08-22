import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Search as SearchIcon, Expand, Shrink } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";

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
import { fetchAllMAPIDMissions, createCirclePolygon, type MissionFeature } from "@/lib/api-missions";

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
  const [anomaliLayer, setAnomaliLayer] = useState(true);
  
  const [kawasans, setKawasans] = useState<Kawasan[]>(STATIC_KAWASAN);
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
    fetchAllMAPIDMissions(polygon, apiKey).then(data => {
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
      // Register koordinat riil untuk marker peta
      addDynamicKoordinat(kawasan.id, [geo.lng, geo.lat]);
      setKawasans(prev => [kawasan, ...prev].slice(0, 16));
      setSelectedId(kawasan.id);
      setSearchNewPlace("");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Gagal menganalisis lokasi");
    } finally {
      setAnalyzing(false);
    }
  };

  // Fetch 100% real computed analytics dari PostGIS Supabase dan dataset tambahan
  useEffect(() => {
    async function loadRealData() {
      try {
        const [{ data, error }, geoRes] = await Promise.all([
          supabase.from('tod_stations').select('*'),
          fetch("/datasetfix.geojson").catch(() => null)
        ]);
        
        let gridFeatures: any[] = [];
        if (geoRes && geoRes.ok) {
          const geoJson = await geoRes.json();
          gridFeatures = geoJson.features || [];
        }

        if (error || !data || data.length === 0) return;

        // Haversine distance helper (meters)
        const getDistanceMeters = (lon1: number, lat1: number, lon2: number, lat2: number) => {
          const R = 6371e3;
          const φ1 = lat1 * Math.PI/180;
          const φ2 = lat2 * Math.PI/180;
          const Δφ = (lat2-lat1) * Math.PI/180;
          const Δλ = (lon2-lon1) * Math.PI/180;
          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c; 
        };

        const baseIds = ["KWS-01", "KWS-02", "KWS-03", "KWS-04", "KWS-05"];
        const combined = new Map<string, Kawasan>();

        const parsedData = data.map(dbData => {
          
          const kws: Kawasan = {
            id: dbData.id,
            nama: dbData.nama,
            koridor: dbData.koridor || "Kawasan Transit",
            klaster: (dbData.klaster as Kawasan['klaster']) || "Pinggiran Berkembang",
            x: 0, y: 0,
            jarakTransit: dbData.jarak_transit ?? 0,
            umkm: dbData.umkm_count ?? 0,
            hargaTanah: dbData.harga_tanah_m2 ? Math.round(dbData.harga_tanah_m2 * 10) / 10 : 0,
            anomali: false,
            skor: {
              properti: Math.min(100, Math.max(1, dbData.skor_properti ?? 0)),
              layanan: Math.min(100, Math.max(1, dbData.skor_layanan ?? 0)),
              ekonomi: Math.min(100, Math.max(1, dbData.skor_ekonomi ?? 0)),
              akses: Math.min(100, Math.max(1, dbData.skor_akses ?? 0)),
            }
          };

          // Enrich dengan data dari datasetfix.geojson dalam radius 800m
          const coord = KOORDINAT[kws.id];
          if (coord && gridFeatures.length > 0) {
            let sumPenduduk = 0;
            let sumPelajar = 0;
            let sumPekerja = 0;
            let sumFasilitas = 0;
            let gridsInRadius = 0;

            gridFeatures.forEach(f => {
              if (f.geometry?.type === 'Polygon' && f.geometry.coordinates[0]) {
                const poly = f.geometry.coordinates[0];
                let sumLng = 0, sumLat = 0;
                for(let i=0; i<4; i++) {
                   sumLng += poly[i][0];
                   sumLat += poly[i][1];
                }
                const cLng = sumLng / 4;
                const cLat = sumLat / 4;
                
                const dist = getDistanceMeters(coord[0], coord[1], cLng, cLat);
                if (dist <= 800) {
                  const props = f.properties;
                  sumPenduduk += (props['[Raw] JUMLAH PENDUDUK 2024'] || 0);
                  sumPelajar += (props['[Raw] PELAJAR DAN MAHASISWA'] || 0);
                  sumPekerja += (props['[Raw] WIRASWASTA'] || 0);
                  sumFasilitas += (props['Total POI in Grid'] || 0);
                  gridsInRadius++;
                }
              }
            });

            if (gridsInRadius > 0) {
              kws.penduduk = sumPenduduk;
              const totalLuasKm2 = gridsInRadius * 0.16; // 400x400m = 0.16km2 per grid
              kws.kepadatan = totalLuasKm2 > 0 ? (sumPenduduk / totalLuasKm2) : 0;
              kws.pelajar = sumPelajar;
              kws.pekerja = sumPekerja;
              kws.totalFasilitas = sumFasilitas;
            }
          }
          return kws;
        });

        baseIds.forEach(id => {
          const staticKws = STATIC_KAWASAN.find(k => k.id === id);
          const dbData = parsedData.find(d => d.id === id);
          if (staticKws) {
             combined.set(id, dbData ? { 
               ...staticKws, 
               ...dbData, 
               jarakTransit: dbData.jarakTransit ?? 0,
               hargaTanah: dbData.hargaTanah ?? 0,
               anomali: staticKws.anomali 
             } : staticKws);
          }
        });

        const otherData = parsedData.filter(d => !baseIds.includes(d.id));
        otherData.sort((a, b) => {
          const scoreA = a.skor.properti + a.skor.layanan + a.skor.ekonomi + a.skor.akses;
          const scoreB = b.skor.properti + b.skor.layanan + b.skor.ekonomi + b.skor.akses;
          return scoreB - scoreA;
        });

        otherData.slice(0, 10).forEach(d => {
          combined.set(d.id, d);
        });

        setKawasans(Array.from(combined.values()));
      } catch (e) {
        console.error("Gagal load data asli:", e);
      }
    }
    loadRealData();
  }, []);


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
      const insight = await generateOpportunityInsight({ data: { kws } });
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
            tampilkanAnomali={anomaliLayer}
            missions={missions}
          />

          {/* CARD 1: Role Selector (Bottom Center) */}
          <div className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-white/90 p-1 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 print:hidden">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
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
          </div>

          {/* RIGHT CARDS CONTAINER */}
          <div className={cn(
            "absolute top-4 right-4 bottom-24 z-40 flex w-[300px] flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:hidden",
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
                {analyzeError && (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full rounded-[10px] border border-destructive/15 bg-destructive/8 px-3 py-2 text-[12px] text-destructive backdrop-blur-xl">
                    {analyzeError}
                  </div>
                )}
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
              </div>
            </div>

            {/* CARD 4: Rankings */}
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl bg-white/90 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 overflow-hidden">
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
              <div className="flex-1 overflow-y-auto px-2 py-2 floating-scrollbar">
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
                        <span className="w-4 font-mono text-[11px] text-muted-foreground/40">{i + 1}</span>
                        <span className="flex-1 truncate">{k.nama}</span>
                        <span
                          className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold"
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
          </div>

          {/* LEFT CARDS CONTAINER */}
          <div className={cn(
            "absolute top-4 bottom-24 left-4 z-40 flex w-[320px] flex-col gap-4 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:static print:w-full",
            isMapMaximized ? "left-[-400px] opacity-0" : "opacity-100"
          )}>
            
            {/* CARD 3: Selected Details & AI */}
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl bg-white/90 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 p-4 overflow-y-auto floating-scrollbar">
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
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
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
                          <span className="font-mono text-[12px] font-semibold text-foreground">
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
                    <span className="font-mono text-[13px] font-semibold">{terpilih.penduduk.toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground mb-0.5">Kepadatan</span>
                    <span className="font-mono text-[13px] font-semibold">{Math.round(terpilih.kepadatan || 0).toLocaleString('id-ID')} /km²</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground mb-0.5">Pelajar & Mhs</span>
                    <span className="font-mono text-[13px] font-semibold">{(terpilih.pelajar || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground mb-0.5">Total Fasilitas</span>
                    <span className="font-mono text-[13px] font-semibold">{terpilih.totalFasilitas || 0} POI</span>
                  </div>
                </div>
              )}

              {/* Quick Facts */}
              <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-secondary/30 p-3 text-center dark:bg-white/5">
                <Fact label="Transit" value={terpilih.jarakTransit ? `${terpilih.jarakTransit}m` : "N/A"} />
                <Fact label="UMKM" value={terpilih.umkm ? `${terpilih.umkm}` : "N/A"} />
                <div className="group relative flex flex-col items-center justify-center cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-secondary/50" onClick={() => handleEditHarga(terpilih.id, terpilih.hargaTanah)}>
                  <dt className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-blue-500 transition-colors">
                    Harga
                  </dt>
                  <dd className="mt-0.5 font-mono text-[12px] font-semibold">
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
                    Analisis Usaha dengan TemuData AI
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
                      <img src={aiStar.url} alt="" className="size-3" /> Analisis TemuData AI
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
          </div>

          {/* Floating: Toggle Sidebar (Moved to right since left has cards) */}
          <button
            onClick={() => setIsMapMaximized(!isMapMaximized)}
            className="absolute bottom-4 left-4 z-20 flex size-9 items-center justify-center rounded-[12px] bg-white/80 text-foreground/60 shadow-md backdrop-blur-xl border border-border/20 transition-all hover:bg-white hover:text-foreground hover:shadow-lg dark:bg-black/50 dark:text-white/70 dark:border-white/10 print:hidden"
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
              <span className="font-mono text-[10px] text-muted-foreground/60">0</span>
              <div className="flex-1 flex h-[6px] rounded-full overflow-hidden shadow-inner">
                {[20, 48, 60, 72, 88].map((s) => (
                  <div key={s} className="h-full flex-1" style={{ backgroundColor: warnaSkor(s) }} />
                ))}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground/60">100</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-[14px] font-semibold">{value}</dd>
    </div>
  );
}
