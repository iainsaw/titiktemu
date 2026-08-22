import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, BarChart3, MapPin, Loader2, Search as SearchIcon, Printer, Edit2, Maximize, Minimize } from "lucide-react";

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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">

      {/* ── GLOBAL NAV — always visible, full width ── */}
      <div className="shrink-0 z-50 print:hidden">
        <SiteHeader />
      </div>

      {/* ── BODY: Sidebar + Map ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ═══════════════════════════════════════════════════
            LEFT SIDEBAR — Control + Supporting Combined
            macOS vibrancy, border-right separator
            ═══════════════════════════════════════════════════ */}
        <aside className={cn(
          "relative z-30 flex h-full shrink-0 flex-col border-r border-border/30 bg-white/70 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] dark:bg-black/60 print:static print:w-full print:border-none",
          isMapMaximized ? "w-0 -ml-[380px] opacity-0" : "w-[380px] ml-0 opacity-100"
        )}>

          {/* ── CONTROL ZONE ── */}
          <div className="shrink-0 border-b border-border/20 px-5 py-4 print:hidden">

            {/* Role Segmented Control */}
            <div className="flex w-full items-center gap-0.5 rounded-[10px] bg-secondary/50 p-[3px] dark:bg-white/8">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-200",
                    role === r.id
                      ? "bg-white text-foreground shadow-sm dark:bg-white/15 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleAnalisis} className="relative mt-3">
              <input
                type="text"
                placeholder={analyzing ? "Menganalisis..." : "Cari lokasi..."}
                value={searchNewPlace}
                onChange={e => { setSearchNewPlace(e.target.value); setAnalyzeError(""); }}
                disabled={analyzing}
                className="h-[34px] w-full rounded-[10px] bg-secondary/40 pl-9 pr-4 text-[14px] transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-white/8 disabled:opacity-50"
              />
              <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                {analyzing ? <Loader2 className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
              </div>
              {analyzeError && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full rounded-[10px] border border-destructive/15 bg-destructive/8 px-3 py-2 text-[12px] text-destructive backdrop-blur-xl">
                  {analyzeError}
                </div>
              )}
            </form>

            {/* Layer Pill Chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayer(l.id)}
                  className={cn(
                    "rounded-full px-3 py-[5px] text-[12px] font-medium transition-all duration-200",
                    layer === l.id
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 dark:bg-white/8"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Overlay Toggles */}
            <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" checked={koridor} onChange={(e) => setKoridor(e.target.checked)} className="size-3.5 rounded accent-blue-500" />
                Koridor
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" checked={angkot} onChange={(e) => setAngkot(e.target.checked)} className="size-3.5 rounded accent-amber-500" />
                Angkot
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" checked={bus} onChange={(e) => setBus(e.target.checked)} className="size-3.5 rounded accent-emerald-500" />
                Bus (BRT)
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" checked={poiPendidikan} onChange={(e) => setPoiPendidikan(e.target.checked)} className="size-3.5 rounded accent-blue-500" />
                Pendidikan
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" checked={poiKesehatan} onChange={(e) => setPoiKesehatan(e.target.checked)} className="size-3.5 rounded accent-red-500" />
                Kesehatan
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" checked={poiKomersial} onChange={(e) => setPoiKomersial(e.target.checked)} className="size-3.5 rounded accent-yellow-500" />
                Komersial
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" checked={poiHiburan} onChange={(e) => setPoiHiburan(e.target.checked)} className="size-3.5 rounded accent-pink-500" />
                Hiburan
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                <input type="checkbox" checked={poiTransit} onChange={(e) => setPoiTransit(e.target.checked)} className="size-3.5 rounded accent-violet-500" />
                Transit
              </label>
            </div>
          </div>

          {/* ── SUPPORTING ZONE (Scrollable) ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-5">

              {/* Kawasan Header */}
              <div className="flex items-center justify-between mb-2 print:hidden">
                <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-blue-500" /> {terpilih.klaster}
                </span>
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/temudata"
                    search={{ peran: role, kawasan: terpilih.id }}
                    className="flex items-center gap-1 rounded-lg bg-blue-500/8 px-2.5 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-500/15 dark:text-blue-400"
                  >
                    <img src={aiStar.url} alt="" className="size-3" />
                    Chat
                  </Link>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 rounded-lg bg-secondary/50 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-secondary"
                  >
                    <Printer className="size-3" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Title + Score */}
              <div className="flex items-start justify-between gap-4 mt-2 mb-5">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/50">
                    {terpilih.id} · {terpilih.koridor}
                  </p>
                  <h2 className="mt-1 truncate text-[22px] font-semibold tracking-tight">{terpilih.nama}</h2>
                  <p className="mt-1.5 text-[13px] font-medium" style={{ color: warnaSkor(skorTerpilih) }}>
                    Vitalitas {kelasSkor(skorTerpilih).label} · {peran.tagline}
                  </p>
                </div>
                <div
                  className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl border-[2.5px] text-[20px] font-extrabold"
                  style={{ borderColor: warnaSkor(skorTerpilih), color: warnaSkor(skorTerpilih), backgroundColor: `color-mix(in oklab, ${warnaSkor(skorTerpilih)} 6%, transparent)` }}
                >
                  {skorTerpilih}
                </div>
              </div>

              {/* Score Bars */}
              <div className="rounded-2xl bg-secondary/25 p-5 dark:bg-white/5">
                <div className="space-y-3.5">
                  {COMPONENTS.map((c) => {
                    const nilai = terpilih.skor[c.id];
                    return (
                      <div key={c.id}>
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <span className="text-[13px] font-medium text-foreground/70">{c.label}</span>
                          <span className="font-mono text-[13px] font-semibold text-foreground">
                            {nilai}
                            <span className="ml-1 text-[10px] text-muted-foreground/60">
                              ×{peran.weights[c.id].toFixed(2)}
                            </span>
                          </span>
                        </div>
                        <div className="h-[6px] overflow-hidden rounded-full bg-secondary/50 dark:bg-white/8">
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
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-secondary/25 p-5 dark:bg-white/5">
                  <div>
                    <span className="block text-[11px] text-muted-foreground mb-1">Penduduk (2024)</span>
                    <span className="font-mono text-[15px] font-semibold">{terpilih.penduduk.toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-muted-foreground mb-1">Kepadatan</span>
                    <span className="font-mono text-[15px] font-semibold">{Math.round(terpilih.kepadatan || 0).toLocaleString('id-ID')} /km²</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-muted-foreground mb-1">Pelajar & Mhs</span>
                    <span className="font-mono text-[15px] font-semibold">{(terpilih.pelajar || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-muted-foreground mb-1">Total Fasilitas</span>
                    <span className="font-mono text-[15px] font-semibold">{terpilih.totalFasilitas || 0} POI</span>
                  </div>
                </div>
              )}

              {/* Quick Facts */}
              <dl className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-secondary/25 p-4 text-center dark:bg-white/5">
                <Fact label="Transit" value={terpilih.jarakTransit ? `${terpilih.jarakTransit}m` : "N/A"} />
                <Fact label="UMKM" value={terpilih.umkm ? `${terpilih.umkm}` : "N/A"} />
                <div className="group relative flex flex-col items-center justify-center cursor-pointer rounded-xl p-2 transition-colors hover:bg-secondary/40" onClick={() => handleEditHarga(terpilih.id, terpilih.hargaTanah)}>
                  <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Harga <Edit2 className="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                  </dt>
                  <dd className="mt-0.5 font-mono text-[13px] font-semibold">
                    {terpilih.hargaTanah ? `${terpilih.hargaTanah} jt` : "N/A"}
                  </dd>
                  {customPrices[terpilih.id] && (
                    <span className="absolute top-1 right-1 flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
              </dl>

              {/* Anomaly */}
              {terpilih.anomali && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-500/10 bg-blue-500/[0.03] p-4 text-[13px] text-blue-700 dark:text-blue-300">
                  <img src={aiStar.url} alt="" className="mt-0.5 size-4 shrink-0" />
                  <span className="leading-relaxed">
                    <strong className="font-semibold block mb-0.5">Anomali peluang tersembunyi</strong>
                    Aktivitas ekonomi di atas ekspektasi dibanding harga tanah dan kualitas layanan.
                  </span>
                </div>
              )}

              {/* AI Recommendation */}
              <div className="mt-4 rounded-2xl border border-blue-500/10 bg-blue-500/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-blue-600 dark:text-blue-400">
                    <img src={aiStar.url} alt="" className="size-4" /> Peluang Usaha AI
                  </div>
                  {!aiRecommendation && !isAiLoading && (
                    <button
                      onClick={() => handleAskAI(terpilih)}
                      className="flex items-center gap-1.5 rounded-full bg-blue-500 px-3 py-[5px] text-[11px] font-medium text-white transition-all hover:bg-blue-600 active:scale-95 print:hidden"
                    >
                      <img src={aiStar.url} alt="" className="size-3 brightness-0 invert" /> Tanya AI
                    </button>
                  )}
                </div>

                {isAiLoading && (
                  <div className="flex items-center gap-1.5 text-[12px] text-blue-500/60 mt-3">
                    <Loader2 className="size-3.5 animate-spin" /> Menganalisis pasar...
                  </div>
                )}

                {aiRecommendation && (
                  <p className="mt-3 text-[13px] leading-relaxed text-foreground/75">
                    {aiRecommendation}
                  </p>
                )}
              </div>

              {/* Compare CTA */}
              <Link
                to="/analisis"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500/8 py-3 text-[13px] font-medium text-blue-600 transition-all hover:bg-blue-500/12 active:scale-[0.98] dark:text-blue-400 print:hidden"
              >
                Bandingkan di Vitality Twin <ArrowRight className="size-4" />
              </Link>

              {/* Rankings */}
              <div className="mt-7 border-t border-border/20 pt-5 print:hidden">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                  <BarChart3 className="size-3.5" /> Peringkat Kawasan
                </h3>
                <ol className="space-y-0.5">
                  {peringkat.map(({ k, skor }, i) => (
                    <li key={k.id}>
                      <button
                        onClick={() => setSelectedId(k.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all",
                          k.id === selectedId
                            ? "bg-secondary font-medium text-foreground"
                            : "text-foreground/60 hover:bg-secondary/40"
                        )}
                      >
                        <span className="w-4 font-mono text-[11px] text-muted-foreground/40">{i + 1}</span>
                        <span className="flex-1 truncate">{k.nama}</span>
                        <span
                          className="rounded-lg px-2 py-0.5 font-mono text-[11px] font-semibold"
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
        </aside>

        {/* ═══════════════════════════════════════════════════
            MAP AREA (flex-1)
            ═══════════════════════════════════════════════════ */}
        <main className="relative flex-1 bg-muted/10 print:static print:w-full">
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

          {/* Floating: Toggle Sidebar */}
          <button
            onClick={() => setIsMapMaximized(!isMapMaximized)}
            className="absolute top-3 right-3 z-20 flex size-8 items-center justify-center rounded-[10px] bg-white/70 text-foreground/60 shadow-sm backdrop-blur-xl border border-border/20 transition-all hover:bg-white hover:text-foreground hover:shadow-md dark:bg-black/50 dark:text-white/70 dark:border-white/10 print:hidden"
            title={isMapMaximized ? "Tampilkan Sidebar" : "Layar Penuh"}
          >
            {isMapMaximized ? <Minimize className="size-[14px]" /> : <Maximize className="size-[14px]" />}
          </button>

          {/* Floating: Legend */}
          <div className="absolute bottom-3 right-3 z-20 rounded-[10px] bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-xl border border-border/20 dark:bg-black/50 dark:border-white/10 print:hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Legenda Skor</span>
              <span className="text-[10px] text-muted-foreground/40 ml-3">r=800m</span>
            </div>
            <div className="flex items-center gap-1.5 w-36">
              <span className="text-[10px] text-muted-foreground/50">0</span>
              <div className="flex-1 flex h-[5px] rounded-full overflow-hidden">
                {[20, 48, 60, 72, 88].map((s) => (
                  <div key={s} className="h-full flex-1" style={{ backgroundColor: warnaSkor(s) }} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground/50">100</span>
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
