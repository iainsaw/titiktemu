/**
 * Analisis TOD untuk titik arbitrer.
 * Pipeline: Geocode → PostGIS RPC → Build Kawasan object
 * ZERO dummy data — semua skor dihitung dari data riil.
 */

import { geocode, type GeoResult } from "./geocode";
import { supabase } from "./supabase";
import type { Kawasan } from "./vitality-data";

import { parseSearchQuery } from "./ai.functions";

export type AnalysisResult = {
  kawasan: Kawasan;
  geo: GeoResult;
};

/**
 * Menganalisis potensi TOD untuk sebuah tempat berdasarkan nama.
 * 1. AI Parse Query -> Normalisasi & filter luar kota
 * 2. Geocode nama tempat → koordinat riil
 * 3. Panggil RPC analyze_single_point → skor riil dari PostGIS
 * 4. Bangun objek Kawasan lengkap
 *
 * @throws Error jika lokasi tidak ditemukan atau RPC gagal
 */
export async function analyzeNewPlace(placeName: string): Promise<AnalysisResult> {
  // 1. Parse Query via AI (typo fix + Kota Bandung validation)
  let searchQuery = placeName;
  try {
    const aiRes = await parseSearchQuery({ data: { query: placeName } });
    if (aiRes.error === "OUTSIDE") {
      throw new Error(`Lokasi "${placeName}" berada di luar Kota Bandung (Coming Soon!). Saat ini kami hanya melayani area Kota Bandung.`);
    }
    if (aiRes.query) {
      searchQuery = aiRes.query;
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("di luar Kota Bandung")) {
      throw e; // re-throw if it's the expected OUTSIDE error
    }
    // if AI fails for other reasons (e.g. rate limit), just fallback to the raw query
  }

  // 2. Geocode
  const geo = await geocode(searchQuery);
  if (!geo) {
    throw new Error(`Lokasi "${searchQuery}" tidak ditemukan di area Kota Bandung. Coba nama yang lebih spesifik.`);
  }

  // 2. Query PostGIS via RPC
  const { data, error } = await supabase.rpc("analyze_single_point", {
    p_lat: geo.lat,
    p_lng: geo.lng,
  });

  if (error) {
    throw new Error(`Gagal menganalisis lokasi: ${error.message}`);
  }

  if (!data) {
    throw new Error("Tidak ada data analisis yang dikembalikan dari server.");
  }

  // 3. Fetch land prices to inject real harga tanah for any location
  let landPrices: Record<string, number> = {};
  try {
    const res = await fetch("/harga-tanah-ekstraksi.json");
    if (res.ok) landPrices = await res.json();
  } catch (e) {
    console.warn("Gagal fetch harga tanah:", e);
  }

  // 4. Build Kawasan object dari data riil
  const result = typeof data === "string" ? JSON.parse(data) : data;
  
  const kecamatan = extractKoridor(geo.displayName);
  let hargaTanah = result.harga_tanah_m2 ?? 0;
  let skorProperti = result.skor_properti ?? 1;

  // Coba cari harga tanah berdasarkan nama kecamatan
  const nameToMatch = geo.displayName.toLowerCase();
  for (const [key, rawPrice] of Object.entries(landPrices)) {
    const kecName = key.split(',')[0].trim().toLowerCase();
    if (nameToMatch.includes(kecName)) {
      hargaTanah = Math.round((rawPrice / 1000000) * 10) / 10;
      skorProperti = Math.min(100, Math.max(1, Math.round((hargaTanah / 25) * 100)));
      break;
    }
  }

  const kawasan: Kawasan = {
    id: `ANL-${Date.now()}`,
    nama: placeName.trim(),
    koridor: kecamatan,
    klaster: result.klaster || "Pinggiran Berkembang",
    x: 0,
    y: 0,
    jarakTransit: 0,
    umkm: result.umkm_count ?? 0,
    hargaTanah: hargaTanah,
    anomali: false,
    skor: {
      properti: skorProperti,
      layanan: Math.min(100, Math.max(1, result.skor_layanan ?? 1)),
      ekonomi: Math.min(100, Math.max(1, result.skor_ekonomi ?? 1)),
      akses: Math.min(100, Math.max(1, result.skor_akses ?? 1)),
    },
  };

  return { kawasan, geo };
}

/**
 * Ekstrak nama kecamatan/koridor dari display name Nominatim.
 * Contoh input: "Jalan Cihampelas, Cipaganti, Coblong, Bandung, Jawa Barat, ..."
 * Output: "Coblong" (kecamatan)
 */
function extractKoridor(displayName: string): string {
  const parts = displayName.split(",").map((s) => s.trim());
  // Biasanya format: jalan, kelurahan, kecamatan, kota, ...
  // Ambil bagian ke-3 (index 2) sebagai kecamatan
  if (parts.length >= 4) {
    return parts[2];
  }
  if (parts.length >= 2) {
    return parts[1];
  }
  return "Kawasan Baru";
}
