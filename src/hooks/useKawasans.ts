import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { KAWASAN as STATIC_KAWASAN, type Kawasan } from "@/lib/vitality-data";
import { KOORDINAT } from "@/components/VitalityMap";

let cachedKawasans: Kawasan[] | null = null;
let fetchPromise: Promise<Kawasan[]> | null = null;

// Haversine distance helper (meters)
const getDistanceMeters = (lon1: number, lat1: number, lon2: number, lat2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function useKawasans() {
  const [kawasans, setKawasans] = useState<Kawasan[]>(cachedKawasans || STATIC_KAWASAN);
  const [loading, setLoading] = useState<boolean>(!cachedKawasans);

  useEffect(() => {
    if (cachedKawasans) {
      setKawasans(cachedKawasans);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = (async () => {
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

          if (error || !data || data.length === 0) return STATIC_KAWASAN;

          const baseIds = ["KWS-01", "KWS-02", "KWS-03", "KWS-04", "KWS-05"];
          const combined = new Map<string, Kawasan>();

          const seenNames = new Set<string>();
          const deduplicatedData = data.filter(dbData => {
            const normalizedName = dbData.nama.toLowerCase().replace(/\s+/g, '');
            if (seenNames.has(normalizedName)) return false;
            seenNames.add(normalizedName);
            return true;
          });

          const parsedData = deduplicatedData.map(dbData => {
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

            const coord = KOORDINAT[kws.id];
            if (coord && gridFeatures.length > 0) {
              let sumPenduduk = 0;
              let sumPelajar = 0;
              let sumPekerja = 0;
              let sumFasilitas = 0;
              let gridsInRadius = 0;
              let sumDistance = 0;

              gridFeatures.forEach(f => {
                if (f.geometry?.type === 'Polygon' && f.geometry.coordinates[0]) {
                  const poly = f.geometry.coordinates[0];
                  let sumLng = 0, sumLat = 0;
                  for (let i = 0; i < 4; i++) {
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
                    sumDistance += dist;
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
                kws.jarakTransit = Math.round(sumDistance / gridsInRadius);
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

          const result = Array.from(combined.values());
          cachedKawasans = result;
          return result;
        } catch (e) {
          console.error("Gagal load data asli:", e);
          return STATIC_KAWASAN;
        }
      })();
    }

    fetchPromise.then(res => {
      setKawasans(res);
      setLoading(false);
    });

  }, []);

  return { kawasans, setKawasans, loading };
}
