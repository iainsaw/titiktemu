import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Layers, ArrowRight, BarChart3, MapPin, Loader2, Search as SearchIcon, Printer, Edit2, Lightbulb } from "lucide-react";

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
      {
        name: "description",
        content:
          "Peta interaktif Skor Vitalitas Transit Bandung Raya dengan pemilih peran, kontrol layer, panel AI Insight, dan chat assistant berbasis data kawasan.",
      },
      { property: "og:title", content: "Peta Interaktif — Titik Temu" },
      {
        property: "og:description",
        content:
          "Jelajahi kawasan pilot Bandung Raya: layer komponen skor, insight AI, dan asisten tanya-jawab data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PetaInteraktif,
});

const LAYERS: { id: ComponentId | "total"; label: string }[] = [
  { id: "total", label: "Skor total" },
  ...COMPONENTS.map((c) => ({ id: c.id as ComponentId, label: c.short })),
];

type PanelTab = "peringkat" | null;

function getRekomendasiUsaha(kws: Kawasan) {
  const { layanan, akses, properti, ekonomi } = kws.skor;
  if (layanan < 50 && ((kws.penduduk && kws.penduduk > 20000) || akses > 60)) {
    return "Apotek, Minimarket, atau Klinik (Kebutuhan dasar kurang di area padat/aksesibel).";
  }
  if (properti < 40 && akses > 70) {
    return "Kos-kosan komuter atau Kedai Kopi (Lahan masih murah tapi akses ke stasiun sangat mudah).";
  }
  if (ekonomi < 40 && layanan > 70) {
    return "F&B / Restoran atau Jasa Fotokopi (Fasilitas umum banyak tapi minim ritel komersial).";
  }
  return "Warung kelontong atau Jasa titip motor (Layanan dasar esensial pendukung stasiun).";
}

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
  const [tab, setTab] = useState<PanelTab>(null);
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

  const handleEditHarga = (id: string, currentVal: number) => {
    const val = window.prompt(`Masukkan benchmark Harga Tanah pasar riil (Juta/m²) untuk ${id}:`, currentVal.toString());
    if (val !== null) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        setCustomPrices(prev => ({ ...prev, [id]: num }));
      }
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

  return (
    <div className="min-h-screen bg-background print:bg-white print:min-h-0">
      <div className="print:hidden">
        <SiteHeader />
      </div>

      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5 print:p-0 print:m-0 print:max-w-none">
        <h1 className="sr-only">Peta Interaktif Skor Vitalitas Transit Bandung Raya</h1>

        <div className="relative flex flex-col gap-4 lg:block lg:h-[calc(100vh-112px)] lg:min-h-[680px] print:h-auto print:block">
          <div className="h-[440px] overflow-hidden sm:h-[520px] lg:h-full print:hidden">
            <VitalityMap
              className="size-full"
              fill
              kawasan={kawasans}
              role={role}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setTab(null);
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
          </div>

          {/* Toolbar mengambang: peran */}
          <div className="floating-card z-20 flex flex-wrap items-center gap-2 p-2 lg:absolute lg:left-5 lg:top-5 lg:max-w-[62%] print:hidden">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <img src={aiStar.url} alt="Titik Temu AI" className="size-5 drop-shadow-sm" />
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "pill px-3 py-1.5 text-[12px] font-medium transition-colors",
                    role === r.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            
            <div className="ml-auto flex-1 md:flex-none">
              <form onSubmit={handleAnalisis} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={analyzing ? "Menganalisis..." : "Analisis tempat baru..."}
                    value={searchNewPlace}
                    onChange={e => { setSearchNewPlace(e.target.value); setAnalyzeError(""); }}
                    disabled={analyzing}
                    className="pill h-8 w-full min-w-[200px] bg-surface/50 pl-8 pr-3 text-[12px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm disabled:opacity-50"
                  />
                  <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <SearchIcon className="size-3.5" />}
                  </div>
                </div>
                {analyzeError && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-destructive/30 bg-background/95 px-3 py-2 text-[11px] text-destructive shadow-lg backdrop-blur">
                    {analyzeError}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Panel layer kanan atas */}
          <div className="floating-card z-20 w-full overflow-y-auto p-4 lg:absolute lg:right-5 lg:top-5 lg:max-h-[85%] lg:w-[280px] print:hidden">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="size-3.5 text-primary" /> Layer
            </p>
            <div className="flex flex-wrap gap-1 lg:flex-col lg:items-stretch">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayer(l.id)}
                  className={cn(
                    "pill px-3 py-1.5 text-left text-[12px] font-medium transition-colors",
                    layer === l.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 border-t border-border pt-2.5 text-[11.5px]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={koridor}
                  onChange={(e) => setKoridor(e.target.checked)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                Garis koridor
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={angkot}
                  onChange={(e) => setAngkot(e.target.checked)}
                  className="size-3.5 accent-[#f59e0b]"
                />
                Rute Angkot
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bus}
                  onChange={(e) => setBus(e.target.checked)}
                  className="size-3.5 accent-[#10b981]"
                />
                Rute Bus (BRT)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={poiPendidikan}
                  onChange={(e) => setPoiPendidikan(e.target.checked)}
                  className="size-3.5 accent-[#3b82f6]"
                />
                Pendidikan
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={poiKesehatan}
                  onChange={(e) => setPoiKesehatan(e.target.checked)}
                  className="size-3.5 accent-[#ef4444]"
                />
                Kesehatan
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={poiKomersial}
                  onChange={(e) => setPoiKomersial(e.target.checked)}
                  className="size-3.5 accent-[#eab308]"
                />
                Komersial
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={poiHiburan}
                  onChange={(e) => setPoiHiburan(e.target.checked)}
                  className="size-3.5 accent-[#ec4899]"
                />
                Hiburan & Makanan
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={poiTransit}
                  onChange={(e) => setPoiTransit(e.target.checked)}
                  className="size-3.5 accent-[#8b5cf6]"
                />
                Transit
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pedestrian}
                  onChange={(e) => setPedestrian(e.target.checked)}
                  className="size-3.5 accent-[#06b6d4]"
                />
                Jalur Pejalan Kaki
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sensus}
                  onChange={(e) => setSensus(e.target.checked)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                Wilayah sensus
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={anomaliLayer}
                  onChange={(e) => setAnomaliLayer(e.target.checked)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                Anomali peluang
              </label>
            </div>
            <div className="mt-3 flex items-center gap-1 border-t border-border pt-2.5 text-[10px] text-muted-foreground">
              <span>Rendah</span>
              {[20, 48, 60, 72, 88].map((s) => (
                <span
                  key={s}
                  className="h-3 flex-1 rounded-sm"
                  style={{ backgroundColor: warnaSkor(s) }}
                />
              ))}
              <span>Tinggi</span>
            </div>
          </div>

          {/* Kartu detail kawasan kiri bawah */}
          <div className="floating-card z-20 w-full overflow-y-auto p-4 lg:absolute lg:bottom-5 lg:left-5 lg:max-h-[65%] lg:w-[380px] print:static print:w-full print:max-h-none print:shadow-none print:border-none print:bg-white print:p-0">
            <div className="animate-in fade-in-50 duration-300">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {terpilih.id} · {terpilih.koridor}
                  </p>
                  <h2 className="mt-0.5 truncate text-lg font-bold">{terpilih.nama}</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Klaster otomatis: {terpilih.klaster}
                  </p>
                </div>
                <div
                  className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 font-display text-xl font-bold"
                  style={{ borderColor: warnaSkor(skorTerpilih), color: warnaSkor(skorTerpilih) }}
                >
                  {skorTerpilih}
                </div>
              </div>

              <p className="mt-2 text-[11px] font-semibold" style={{ color: warnaSkor(skorTerpilih) }}>
                Vitalitas {kelasSkor(skorTerpilih).label} · {peran.tagline}
              </p>

              <div className="mt-3 space-y-2.5">
                {COMPONENTS.map((c) => {
                  const nilai = terpilih.skor[c.id];
                  return (
                    <div key={c.id}>
                      <div className="mb-1 flex items-baseline justify-between text-[11px]">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className="font-mono">
                          {nilai}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ×{peran.weights[c.id].toFixed(2)}
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${nilai}%`, backgroundColor: warnaSkor(nilai) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {terpilih.penduduk && (
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[11px]">
                  <div>
                    <span className="block text-muted-foreground mb-0.5">Penduduk (2024)</span>
                    <span className="font-mono font-semibold">{terpilih.penduduk.toLocaleString('id-ID')} jiwa</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground mb-0.5">Kepadatan</span>
                    <span className="font-mono font-semibold">{Math.round(terpilih.kepadatan || 0).toLocaleString('id-ID')} / km²</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground mb-0.5">Pelajar & Mahasiswa</span>
                    <span className="font-mono font-semibold">{(terpilih.pelajar || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground mb-0.5">Total Fasilitas (POI)</span>
                    <span className="font-mono font-semibold">{terpilih.totalFasilitas || 0}</span>
                  </div>
                </div>
              )}

              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <Fact label="Jarak transit" value={terpilih.jarakTransit ? `${terpilih.jarakTransit} m` : "N/A"} />
                <Fact label="UMKM" value={terpilih.umkm ? `${terpilih.umkm}` : "N/A"} />
                <div className="group relative cursor-pointer hover:bg-secondary/50 rounded-lg p-1 transition-colors" onClick={() => handleEditHarga(terpilih.id, terpilih.hargaTanah)}>
                  <dt className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Harga tanah <Edit2 className="size-2.5 opacity-50 group-hover:opacity-100" />
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs font-semibold">
                    {terpilih.hargaTanah ? `${terpilih.hargaTanah} jt/m²` : "N/A"}
                  </dd>
                  {customPrices[terpilih.id] && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-orange-500"></span>
                  )}
                </div>
              </dl>
              <p className="mt-1 text-center text-[9px] text-muted-foreground italic print:hidden">Estimasi via Extraction Method. Klik untuk override nilai patokan.</p>

              {terpilih.anomali && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11.5px] text-primary/90 shadow-sm transition-colors hover:bg-primary/10">
                  <img src={aiStar.url} alt="" className="mt-0.5 size-4 shrink-0 drop-shadow-sm" />
                  <span className="leading-relaxed">
                    <strong>Anomali peluang tersembunyi:</strong> aktivitas ekonomi jauh di atas ekspektasi dibanding
                    harga tanah dan kualitas layanan kawasan.
                  </span>
                </div>
              )}

              {/* Kalkulator Potensi Usaha */}
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-[11.5px] text-orange-700 shadow-sm print:border-gray-300 print:bg-white print:text-black">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-orange-500" />
                <span className="leading-relaxed">
                  <strong>Peluang Usaha Warga:</strong> {getRekomendasiUsaha(terpilih)}
                </span>
              </div>

              <Link
                to="/analisis"
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline print:hidden"
              >
                Bandingkan &amp; simulasikan <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Panel peringkat + pintasan TemuData AI */}
          <div className="z-20 flex w-full flex-col items-stretch gap-2 lg:absolute lg:bottom-5 lg:right-5 lg:w-[380px] lg:items-end print:hidden">
            {tab === "peringkat" && (
              <div className="floating-card max-h-[50vh] w-full overflow-y-auto p-1 lg:max-h-[52vh]">
                <div className="p-4">
                  <h3 className="mb-2 text-sm font-semibold">Peringkat kawasan</h3>
                  <ol className="space-y-1">
                    {peringkat.map(({ k, skor }, i) => (
                      <li key={k.id}>
                        <button
                          onClick={() => setSelectedId(k.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary",
                            k.id === selectedId && "bg-secondary",
                          )}
                        >
                          <span className="w-4 font-mono text-muted-foreground">{i + 1}</span>
                          <span className="flex-1 truncate">{k.nama}</span>
                          <span
                            className="rounded-lg px-1.5 py-0.5 font-mono text-[11px] font-semibold"
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
            )}

            <div className="floating-card flex items-center gap-1.5 p-1.5">
              <Link
                to="/temudata"
                search={{ peran: role, kawasan: terpilih.id }}
                className="group relative flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-[12px] font-semibold text-background shadow-md transition-all hover:scale-105 hover:bg-foreground/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <div className="flex size-5 items-center justify-center rounded-full bg-background/20">
                  <img src={aiStar.url} alt="" className="size-3.5 brightness-0 invert" />
                </div>
                TemuData AI
              </Link>

              <button
                onClick={() => window.print()}
                className="group relative flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-[12px] font-semibold shadow-md transition-all hover:scale-105 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Printer className="size-3.5" />
                Cetak Laporan PDF
              </button>

              <TabButton
                aktif={tab === "peringkat"}
                onClick={() => setTab(tab === "peringkat" ? null : "peringkat")}
              >
                <BarChart3 className="size-4" /> Peringkat
              </TabButton>
            </div>
          </div>

        </div>

        <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted-foreground print:hidden">
          <MapPin className="size-3.5" /> 5 kawasan pilot di sekitar titik transportasi massal
          Bandung — klik kawasan untuk melihat rincian dan penjelasan AI.
        </p>
      </main>

      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}

function TabButton({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "pill flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors",
        aktif
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs font-semibold">{value}</dd>
    </div>
  );
}
