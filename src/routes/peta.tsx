import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Layers, ArrowRight, BarChart3, MapPin, Loader2, Search as SearchIcon, Printer, Edit2, Lightbulb, Maximize, Minimize, Bot } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
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
    setAiRecommendation("");
    try {
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        setAiRecommendation("API Key OpenRouter tidak ditemukan di .env.");
        setIsAiLoading(false);
        return;
      }

      const prompt = `Anda adalah ahli tata kota dan penasihat bisnis UMKM profesional. 
Kawasan ${kws.nama} memiliki skor (0-100):
Layanan Umum: ${kws.skor.layanan}
Akses Transportasi: ${kws.skor.akses}
Pasar Properti: ${kws.skor.properti}
Keragaman Ekonomi: ${kws.skor.ekonomi}
Kepadatan Penduduk: ${kws.penduduk ? Math.round(kws.kepadatan || 0) + ' / km²' : 'Tidak diketahui'}.

Berdasarkan analisis GIS di atas, berikan 1 rekomendasi spesifik peluang usaha yang paling menguntungkan untuk dibuka di area ini, beserta alasan logisnya. Jawab HANYA dalam 2 kalimat singkat yang padat dan persuasif, tanpa basa-basi.`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await res.json();
      if (data.choices && data.choices[0]) {
        setAiRecommendation(data.choices[0].message.content);
      } else {
        setAiRecommendation("Gagal mendapatkan rekomendasi AI.");
      }
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
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* GLOBAL NAVIGATION HEADER */}
      <div className="shrink-0 print:hidden z-50">
        <SiteHeader />
      </div>

      {/* DASHBOARD AREA (100vh - 64px) */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px)] w-full">
        
        {/* PRIMARY ZONE (Map & Control) - 61.8% Golden Ratio */}
        <main 
          className={cn(
            "relative flex flex-col shrink-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] bg-muted/20 print:static print:w-full print:block",
            isMapMaximized ? "w-full" : "w-[61.8%]"
          )}
        >
          {/* CONTROL ZONE (Floating Top-Left) */}
          <header className="pointer-events-none absolute left-6 top-6 z-20 flex w-full max-w-[480px] flex-col items-start gap-4 transition-opacity print:hidden">
            {/* Dynamic Island Style Role Selector & Search */}
            <div className="pointer-events-auto flex w-full flex-col gap-3 rounded-3xl bg-white/70 p-4 shadow-xl backdrop-blur-3xl border border-white/30 dark:bg-black/60 dark:border-white/10">
              
              <div className="flex w-full items-center gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/10">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={cn(
                      "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300",
                      role === r.id
                        ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              
              <form onSubmit={handleAnalisis} className="relative w-full">
                <input
                  type="text"
                  placeholder={analyzing ? "Menganalisis..." : "Cari & Analisis Titik Baru..."}
                  value={searchNewPlace}
                  onChange={e => { setSearchNewPlace(e.target.value); setAnalyzeError(""); }}
                  disabled={analyzing}
                  className="h-12 w-full rounded-2xl bg-white/60 pl-12 pr-4 text-sm font-medium shadow-sm backdrop-blur-md transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:bg-black/40 disabled:opacity-50"
                />
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {analyzing ? <Loader2 className="size-5 animate-spin" /> : <SearchIcon className="size-5" />}
                </div>
                {analyzeError && (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive shadow-lg backdrop-blur-xl">
                    {analyzeError}
                  </div>
                )}
              </form>

            </div>

            {/* Floating Layer Controls (Collapsible or visible) */}
            <div className="pointer-events-auto w-[320px] rounded-3xl bg-white/70 p-5 shadow-xl backdrop-blur-3xl border border-white/30 dark:bg-black/60 dark:border-white/10">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Layers className="size-4 text-primary" /> Pengaturan Layer
              </h3>
              <div className="flex flex-col gap-2">
                {LAYERS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayer(l.id)}
                    className={cn(
                      "rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-all duration-200",
                      layer === l.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-muted-foreground"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-black/5 pt-5 dark:border-white/10 text-xs font-medium text-muted-foreground">
                <label className="flex items-center gap-3 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={koridor} onChange={(e) => setKoridor(e.target.checked)} className="size-4 rounded-md accent-[var(--primary)]" />
                  Batas Koridor
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={angkot} onChange={(e) => setAngkot(e.target.checked)} className="size-4 rounded-md accent-[#f59e0b]" />
                  Rute Angkot
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={bus} onChange={(e) => setBus(e.target.checked)} className="size-4 rounded-md accent-[#10b981]" />
                  Rute Bus (BRT)
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={poiPendidikan} onChange={(e) => setPoiPendidikan(e.target.checked)} className="size-4 rounded-md accent-[#3b82f6]" />
                  Pendidikan
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={poiKesehatan} onChange={(e) => setPoiKesehatan(e.target.checked)} className="size-4 rounded-md accent-[#ef4444]" />
                  Kesehatan
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={poiKomersial} onChange={(e) => setPoiKomersial(e.target.checked)} className="size-4 rounded-md accent-[#eab308]" />
                  Komersial
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={poiHiburan} onChange={(e) => setPoiHiburan(e.target.checked)} className="size-4 rounded-md accent-[#ec4899]" />
                  Hiburan & F&B
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={poiTransit} onChange={(e) => setPoiTransit(e.target.checked)} className="size-4 rounded-md accent-[#8b5cf6]" />
                  Titik Transit
                </label>
              </div>
            </div>
          </header>

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
          
          {/* Maximize Button */}
          <button
            onClick={() => setIsMapMaximized(!isMapMaximized)}
            className="absolute bottom-8 right-8 z-30 flex size-14 items-center justify-center rounded-full bg-white/90 text-foreground shadow-2xl backdrop-blur-2xl border border-white/40 transition-all hover:scale-105 hover:bg-white dark:bg-black/90 dark:border-white/10 dark:text-white"
            title={isMapMaximized ? "Tampilkan Data Panel" : "Layar Penuh (Peta Saja)"}
          >
            {isMapMaximized ? <Minimize className="size-6" /> : <Maximize className="size-6" />}
          </button>
        </main>

        {/* SUPPORTING ZONE (Data Area - Kanan) - 38.2% Golden Ratio */}
        <aside className={cn(
          "z-30 flex shrink-0 flex-col overflow-y-auto bg-background/90 backdrop-blur-3xl shadow-[-16px_0_48px_rgba(0,0,0,0.04)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border-l border-border/40 print:static print:w-full print:shadow-none print:border-none",
          isMapMaximized ? "translate-x-full w-0" : "w-[38.2%]"
        )}>
          <div className="flex flex-col p-8 min-w-[400px]">
            
            {/* Header Mini Actions */}
            <div className="flex items-center justify-between mb-8 print:hidden">
              <span className="text-sm font-semibold tracking-tight text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> {terpilih.klaster}
              </span>
              <div className="flex items-center gap-3">
                <Link
                  to="/temudata"
                  search={{ peran: role, kawasan: terpilih.id }}
                  className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold tracking-tight text-primary transition-colors hover:bg-primary/20"
                >
                  <img src={aiStar.url} alt="" className="size-3.5" />
                  Chat
                </Link>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-full bg-secondary/80 px-4 py-2 text-xs font-bold tracking-tight transition-colors hover:bg-secondary"
                >
                  <Printer className="size-3.5" />
                  PDF
                </button>
              </div>
            </div>

            <div className="animate-in fade-in-50 slide-in-from-right-4 duration-500">
              
              {/* Title Section */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {terpilih.id} · {terpilih.koridor}
                  </p>
                  <h2 className="mt-2 truncate text-3xl font-extrabold tracking-tight text-foreground">{terpilih.nama}</h2>
                </div>
                <div
                  className="flex size-16 shrink-0 items-center justify-center rounded-3xl border-[3px] font-display text-2xl font-black shadow-sm"
                  style={{ borderColor: warnaSkor(skorTerpilih), color: warnaSkor(skorTerpilih), backgroundColor: `color-mix(in oklab, ${warnaSkor(skorTerpilih)} 8%, transparent)` }}
                >
                  {skorTerpilih}
                </div>
              </div>

              <p className="mb-8 text-sm font-bold tracking-tight" style={{ color: warnaSkor(skorTerpilih) }}>
                Vitalitas {kelasSkor(skorTerpilih).label} · {peran.tagline}
              </p>

              {/* Bar Components */}
              <div className="space-y-5 rounded-3xl bg-secondary/20 p-6">
                {COMPONENTS.map((c) => {
                  const nilai = terpilih.skor[c.id];
                  return (
                    <div key={c.id}>
                      <div className="mb-2 flex items-baseline justify-between text-sm">
                        <span className="font-semibold tracking-tight text-foreground/80">{c.label}</span>
                        <span className="font-mono font-bold text-foreground">
                          {nilai}
                          <span className="ml-1.5 text-xs text-muted-foreground font-medium">
                            ×{peran.weights[c.id].toFixed(2)}
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
                          style={{ width: `${nilai}%`, backgroundColor: warnaSkor(nilai) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Demographics (Squircle Grid) */}
              {terpilih.penduduk && (
                <div className="mt-6 grid grid-cols-2 gap-4 rounded-3xl bg-secondary/20 p-6 text-sm">
                  <div>
                    <span className="block text-muted-foreground font-medium mb-1.5">Penduduk (2024)</span>
                    <span className="font-mono text-base font-bold">{terpilih.penduduk.toLocaleString('id-ID')} jiwa</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-medium mb-1.5">Kepadatan</span>
                    <span className="font-mono text-base font-bold">{Math.round(terpilih.kepadatan || 0).toLocaleString('id-ID')} / km²</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-medium mb-1.5">Pelajar & Mahasiswa</span>
                    <span className="font-mono text-base font-bold">{(terpilih.pelajar || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-medium mb-1.5">Total Fasilitas</span>
                    <span className="font-mono text-base font-bold">{terpilih.totalFasilitas || 0} POI</span>
                  </div>
                </div>
              )}

              {/* Quick Facts */}
              <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-border/40 py-6 text-center">
                <Fact label="Jarak transit" value={terpilih.jarakTransit ? `${terpilih.jarakTransit} m` : "N/A"} />
                <Fact label="UMKM" value={terpilih.umkm ? `${terpilih.umkm}` : "N/A"} />
                <div className="group relative flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 rounded-2xl p-2 transition-colors" onClick={() => handleEditHarga(terpilih.id, terpilih.hargaTanah)}>
                  <dt className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Harga <Edit2 className="size-3 opacity-40 group-hover:opacity-100 transition-opacity text-primary" />
                  </dt>
                  <dd className="mt-1.5 font-mono text-sm font-bold">
                    {terpilih.hargaTanah ? `${terpilih.hargaTanah} jt/m²` : "N/A"}
                  </dd>
                  {customPrices[terpilih.id] && (
                    <span className="absolute top-2 right-2 flex h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]"></span>
                  )}
                </div>
              </dl>

              {terpilih.anomali && (
                <div className="mt-6 flex items-start gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 text-sm text-primary/90 shadow-sm transition-colors hover:bg-primary/10">
                  <img src={aiStar.url} alt="" className="mt-1 size-5 shrink-0 drop-shadow-md" />
                  <span className="leading-relaxed font-medium">
                    <strong className="font-bold text-primary block mb-1">Anomali peluang tersembunyi</strong>
                    Aktivitas ekonomi jauh di atas ekspektasi dibanding harga tanah dan kualitas layanan kawasan saat ini.
                  </span>
                </div>
              )}

              {/* Kalkulator Potensi Usaha LLM */}
              <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-orange-500/20 bg-orange-500/5 p-6 shadow-sm print:border-gray-300 print:bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-orange-600">
                    <Lightbulb className="size-5" /> Peluang Usaha AI
                  </div>
                  {!aiRecommendation && !isAiLoading && (
                    <button 
                      onClick={() => handleAskAI(terpilih)}
                      className="flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 print:hidden"
                    >
                      <Bot className="size-4" /> Tanya AI
                    </button>
                  )}
                </div>
                
                {isAiLoading && (
                  <div className="flex items-center gap-2 text-xs font-medium text-orange-600/70 mt-2">
                    <Loader2 className="size-4 animate-spin" /> AI sedang menganalisis pasar...
                  </div>
                )}
                
                {aiRecommendation && (
                  <p className="mt-2 text-sm font-medium leading-relaxed tracking-tight text-orange-800 dark:text-orange-200">
                    {aiRecommendation}
                  </p>
                )}
              </div>

              <Link
                to="/analisis"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary/10 py-4 text-sm font-bold tracking-tight text-primary transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-[0.98] print:hidden"
              >
                Bandingkan di Vitality Twin <ArrowRight className="size-4" />
              </Link>

              {/* Peringkat List in Sidebar */}
              <div className="mt-10 border-t border-border/40 pt-8 print:hidden">
                <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="size-4" /> Peringkat Kawasan
                </h3>
                <ol className="space-y-2">
                  {peringkat.map(({ k, skor }, i) => (
                    <li key={k.id}>
                      <button
                        onClick={() => setSelectedId(k.id)}
                        className={cn(
                          "flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all hover:bg-secondary/80",
                          k.id === selectedId && "bg-secondary shadow-sm ring-1 ring-border/50"
                        )}
                      >
                        <span className="w-5 font-mono text-muted-foreground/50">{i + 1}</span>
                        <span className="flex-1 truncate tracking-tight">{k.nama}</span>
                        <span
                          className="rounded-xl px-2.5 py-1 font-mono text-xs font-bold shadow-sm"
                          style={{
                            color: warnaSkor(skor),
                            backgroundColor: `color-mix(in oklab, ${warnaSkor(skor)} 15%, transparent)`,
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
        </aside>

      </div>
      
      {/* GLOBAL FOOTER */}
      <div className="shrink-0 print:hidden z-50">
        <SiteFooter />
      </div>

    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 font-mono text-sm font-bold">{value}</dd>
    </div>
  );
}
