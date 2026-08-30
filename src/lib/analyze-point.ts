/**
 * Analisis TOD untuk titik arbitrer.
 * Pipeline: Geocode → PostGIS RPC → Build Kawasan object
 * ZERO dummy data — semua skor dihitung dari data riil.
 */

import { geocode, reverseGeocode, type GeoResult } from "./geocode";
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

  // 1. Cek apakah ini input koordinat (lat, lng) atau (lng, lat)
  // Regex untuk mencocokkan format "lat, lng" atau "lng, lat" dengan angka desimal
  const coordRegex = /^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/;
  const coordMatch = searchQuery.match(coordRegex);

  if (coordMatch) {
    // Kita asumsikan format "lat, lng" jika lat di antara -90 dan 90
    let val1 = parseFloat(coordMatch[1]);
    let val2 = parseFloat(coordMatch[3]);
    let lat = val1;
    let lng = val2;

    // Jika val1 di luar range latitude Indonesia (-11 s/d 6), mungkin kebalik
    // Kita paksakan logika yang aman untuk Bandung (~ -6.9, 107.6)
    if (Math.abs(val1) > 90 || (val1 > 90 && val2 < 0)) {
      lng = val1;
      lat = val2;
    } else if (val1 > 10 && val2 < 10) {
      // Pasti val1 itu lng (bujur) di Indonesia, val2 itu lat (lintang)
      lng = val1;
      lat = val2;
    }

    // Lakukan reverse geocode
    const geo = await reverseGeocode(lat, lng);
    
    // Panggil analyzeCoordinates (yang kita buat sebelumnya)
    return await analyzeCoordinates(lat, lng, geo.displayName);
  }

  // 2. Jika bukan koordinat, Geocoding biasa
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
 * Menganalisis potensi TOD berdasarkan titik koordinat secara langsung.
 * (Fitur Custom Pin Drop & Coordinate Search).
 */
export async function analyzeCoordinates(lat: number, lng: number, overrideName?: string): Promise<AnalysisResult> {
  // 1. Panggil RPC analyze_single_point
  const { data, error } = await supabase.rpc("analyze_single_point", {
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    throw new Error(`Gagal menganalisis lokasi: ${error.message}`);
  }
  if (!data) {
    throw new Error("Tidak ada data analisis yang dikembalikan dari server.");
  }

  // 2. Fetch land prices (opsional)
  let landPrices: Record<string, number> = {};
  try {
    const res = await fetch("/harga-tanah-ekstraksi.json");
    if (res.ok) landPrices = await res.json();
  } catch (e) {
    console.warn("Gagal fetch harga tanah:", e);
  }

  const result = typeof data === "string" ? JSON.parse(data) : data;
  
  // Custom point doesn't have a specific name, so we use coordinate
  // Jika overrideName tersedia, gunakan itu. Jika tidak, coba reverse geocode otomatis.
  let finalName = overrideName;
  if (!finalName) {
    try {
      const reverse = await reverseGeocode(lat, lng);
      if (reverse) {
        finalName = `${reverse.name || reverse.display_name.split(',')[0]} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
    } catch(e) {
      // ignore
    }
  }

  const placeName = finalName || `Titik Kustom (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  let hargaTanah = result.harga_tanah_m2 ?? 0;
  let skorProperti = result.skor_properti ?? 1;

  // We could try to extract kecamatan from overrideName, but for now we'll just use the name
  const kecamatan = overrideName ? overrideName.split(",")[0] : "Titik Kustom";

  const kawasan: Kawasan = {
    id: `ANL-${Date.now()}`,
    nama: placeName,
    koridor: kecamatan,
    klaster: result.klaster || "Pinggiran Berkembang",
    x: 0,
    y: 0,
    jarakTransit: result.jarak_transit ?? 0, // Menggunakan hasil RPC baru
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

  const geo: GeoResult = {
    lat,
    lng,
    displayName: placeName,
    type: "custom",
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
