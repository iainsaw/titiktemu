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
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-background font-sans text-foreground">
      
      {/* SUPPORTING ZONE (Data Area - Kiri) */}
      <aside className={cn(
        "z-30 flex shrink-0 flex-col border-r border-border/40 bg-background/80 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] print:static print:w-full print:shadow-none print:border-none",
        isMapMaximized ? "-ml-[380px] w-[380px]" : "w-[380px]"
      )}>
        {/* Header mini */}
        <div className="flex items-center justify-between border-b border-border/30 p-4 print:hidden">
          <Link to="/" className="text-lg font-bold tracking-tight transition-opacity hover:opacity-80">Titik Temu.</Link>
          <div className="flex items-center gap-2">
            <Link
              to="/temudata"
              search={{ peran: role, kawasan: terpilih.id }}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <img src={aiStar.url} alt="" className="size-3" />
              Chat
            </Link>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-full bg-secondary/70 px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-secondary"
            >
              <Printer className="size-3" />
              PDF
            </button>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-5 print:p-0">
          
          <div className="animate-in fade-in-50 duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {terpilih.id} · {terpilih.koridor}
                </p>
                <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight">{terpilih.nama}</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Klaster otomatis: {terpilih.klaster}
                </p>
              </div>
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 font-display text-xl font-bold shadow-sm"
                style={{ borderColor: warnaSkor(skorTerpilih), color: warnaSkor(skorTerpilih), backgroundColor: `color-mix(in oklab, ${warnaSkor(skorTerpilih)} 5%, transparent)` }}
              >
                {skorTerpilih}
              </div>
            </div>

            <p className="mt-2 text-[11px] font-semibold" style={{ color: warnaSkor(skorTerpilih) }}>
              Vitalitas {kelasSkor(skorTerpilih).label} · {peran.tagline}
            </p>

            {/* Bar Components */}
            <div className="mt-5 space-y-3">
              {COMPONENTS.map((c) => {
                const nilai = terpilih.skor[c.id];
                return (
                  <div key={c.id}>
                    <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
                      <span className="font-medium text-foreground/80">{c.label}</span>
                      <span className="font-mono font-semibold">
                        {nilai}
                        <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                          ×{peran.weights[c.id].toFixed(2)}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary/50">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${nilai}%`, backgroundColor: warnaSkor(nilai) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Demographics */}
            {terpilih.penduduk && (
              <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-secondary/30 p-4 text-[11px]">
                <div>
                  <span className="block text-muted-foreground mb-1">Penduduk (2024)</span>
                  <span className="font-mono font-semibold text-sm">{terpilih.penduduk.toLocaleString('id-ID')} jiwa</span>
                </div>
                <div>
                  <span className="block text-muted-foreground mb-1">Kepadatan</span>
                  <span className="font-mono font-semibold text-sm">{Math.round(terpilih.kepadatan || 0).toLocaleString('id-ID')} / km²</span>
                </div>
                <div>
                  <span className="block text-muted-foreground mb-1">Pelajar & Mahasiswa</span>
                  <span className="font-mono font-semibold text-sm">{(terpilih.pelajar || 0).toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground mb-1">Total Fasilitas (POI)</span>
                  <span className="font-mono font-semibold text-sm">{terpilih.totalFasilitas || 0}</span>
                </div>
              </div>
            )}

            {/* Quick Facts */}
            <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-border/40 py-4 text-center">
              <Fact label="Jarak transit" value={terpilih.jarakTransit ? `${terpilih.jarakTransit} m` : "N/A"} />
              <Fact label="UMKM" value={terpilih.umkm ? `${terpilih.umkm}` : "N/A"} />
              <div className="group relative flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 rounded-xl p-1.5 transition-colors" onClick={() => handleEditHarga(terpilih.id, terpilih.hargaTanah)}>
                <dt className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Harga <Edit2 className="size-2.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </dt>
                <dd className="mt-1 font-mono text-xs font-semibold">
                  {terpilih.hargaTanah ? `${terpilih.hargaTanah} jt/m²` : "N/A"}
                </dd>
                {customPrices[terpilih.id] && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
                )}
              </div>
            </dl>

            {terpilih.anomali && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-[11.5px] text-primary/90 shadow-sm transition-colors hover:bg-primary/10">
                <img src={aiStar.url} alt="" className="mt-0.5 size-4 shrink-0 drop-shadow-sm" />
                <span className="leading-relaxed">
                  <strong>Anomali peluang tersembunyi:</strong> aktivitas ekonomi jauh di atas ekspektasi dibanding
                  harga tanah dan kualitas layanan kawasan.
                </span>
              </div>
            )}

            {/* Kalkulator Potensi Usaha LLM */}
            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 shadow-sm print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-orange-600">
                  <Lightbulb className="size-4" /> Peluang Usaha AI
                </div>
                {!aiRecommendation && !isAiLoading && (
                  <button 
                    onClick={() => handleAskAI(terpilih)}
                    className="flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow hover:bg-orange-600 transition-colors print:hidden"
                  >
                    <Bot className="size-3" /> Tanya AI
                  </button>
                )}
              </div>
              
              {isAiLoading && (
                <div className="flex items-center gap-2 text-[11px] text-orange-600/70 mt-1">
                  <Loader2 className="size-3.5 animate-spin" /> AI sedang menganalisis pasar...
                </div>
              )}
              
              {aiRecommendation && (
                <p className="mt-1 text-[11.5px] leading-relaxed text-orange-800 dark:text-orange-200">
                  {aiRecommendation}
                </p>
              )}
            </div>

            <Link
              to="/analisis"
              className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20 print:hidden"
            >
              Bandingkan di Vitality Twin <ArrowRight className="size-3.5" />
            </Link>

            {/* Peringkat List in Sidebar */}
            <div className="mt-8 border-t border-border/30 pt-6 print:hidden">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="size-3.5" /> Peringkat Kawasan
              </h3>
              <ol className="space-y-1.5">
                {peringkat.map(({ k, skor }, i) => (
                  <li key={k.id}>
                    <button
                      onClick={() => setSelectedId(k.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[11.5px] font-medium transition-colors hover:bg-secondary/70",
                        k.id === selectedId && "bg-secondary shadow-sm ring-1 ring-border"
                      )}
                    >
                      <span className="w-4 font-mono text-muted-foreground/60">{i + 1}</span>
                      <span className="flex-1 truncate">{k.nama}</span>
                      <span
                        className="rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold shadow-sm"
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

      {/* SISA LAYAR (Map & Control) */}
      <div className="relative flex flex-1 flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] print:static print:h-auto print:block">
        
        {/* CONTROL ZONE (Top Floating Bar) */}
        <header className={cn(
          "pointer-events-none absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-4 transition-all duration-500 print:hidden",
          isMapMaximized ? "opacity-0 translate-y-[-20px]" : "opacity-100 translate-y-0"
        )}>
           {/* Kiri: Role Filter & Search */}
           <div className="pointer-events-auto flex flex-col gap-2 w-full max-w-[320px]">
              <div className="flex items-center p-1 rounded-full bg-white/70 backdrop-blur-2xl border border-white/40 shadow-sm dark:bg-black/70 dark:border-white/10">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={cn(
                      "flex-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-all",
                      role === r.id
                        ? "bg-primary text-primary-foreground shadow-md"
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
                  placeholder={analyzing ? "Menganalisis..." : "Analisis tempat baru..."}
                  value={searchNewPlace}
                  onChange={e => { setSearchNewPlace(e.target.value); setAnalyzeError(""); }}
                  disabled={analyzing}
                  className="w-full rounded-full bg-white/70 backdrop-blur-2xl border border-white/40 h-10 pl-10 pr-4 text-[12px] shadow-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:bg-black/70 dark:border-white/10 disabled:opacity-50"
                />
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {analyzing ? <Loader2 className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
                </div>
                {analyzeError && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-destructive/30 bg-background/95 px-4 py-3 text-[11px] text-destructive shadow-xl backdrop-blur-md">
                    {analyzeError}
                  </div>
                )}
              </form>
           </div>
           
           {/* Kanan: Layers */}
           <div className="pointer-events-auto flex flex-col items-end gap-2">
              <div className="rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/40 shadow-sm p-4 w-[240px] dark:bg-black/70 dark:border-white/10 max-h-[70vh] overflow-y-auto hidden md:block">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Layers className="size-3.5 text-primary" /> Pengaturan Layer
                </p>
                <div className="flex flex-col gap-1.5">
                  {LAYERS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLayer(l.id)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-left text-[11px] font-semibold transition-all",
                        layer === l.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-secondary/70 text-muted-foreground"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2.5 border-t border-border/30 pt-4 text-[11px] font-medium text-muted-foreground">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" checked={koridor} onChange={(e) => setKoridor(e.target.checked)} className="size-3.5 rounded-sm accent-[var(--primary)]" />
                    Batas Koridor
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" checked={angkot} onChange={(e) => setAngkot(e.target.checked)} className="size-3.5 rounded-sm accent-[#f59e0b]" />
                    Rute Angkot
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" checked={bus} onChange={(e) => setBus(e.target.checked)} className="size-3.5 rounded-sm accent-[#10b981]" />
                    Rute Bus (BRT)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" checked={poiPendidikan} onChange={(e) => setPoiPendidikan(e.target.checked)} className="size-3.5 rounded-sm accent-[#3b82f6]" />
                    Pendidikan
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" checked={poiKesehatan} onChange={(e) => setPoiKesehatan(e.target.checked)} className="size-3.5 rounded-sm accent-[#ef4444]" />
                    Kesehatan
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" checked={poiKomersial} onChange={(e) => setPoiKomersial(e.target.checked)} className="size-3.5 rounded-sm accent-[#eab308]" />
                    Komersial
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" checked={poiHiburan} onChange={(e) => setPoiHiburan(e.target.checked)} className="size-3.5 rounded-sm accent-[#ec4899]" />
                    Hiburan & F&B
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <input type="checkbox" checked={poiTransit} onChange={(e) => setPoiTransit(e.target.checked)} className="size-3.5 rounded-sm accent-[#8b5cf6]" />
                    Titik Transit
                  </label>
                </div>
              </div>
           </div>
        </header>

        {/* PRIMARY ZONE (Map Area) */}
        <main className="relative flex-1 z-10 bg-muted/20 print:hidden">
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
            className="absolute bottom-6 right-6 z-30 flex size-12 items-center justify-center rounded-full bg-white/80 text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all hover:scale-110 hover:bg-white dark:bg-black/80 dark:text-white"
            title={isMapMaximized ? "Tampilkan Data Panel" : "Layar Penuh (Peta Saja)"}
          >
            {isMapMaximized ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </main>
        
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-xs font-semibold">{value}</dd>
    </div>
  );
}
