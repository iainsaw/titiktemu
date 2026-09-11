import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const KAWASAN_KECAMATAN_MAP = {
  "KWS-01": "Sumurbandung, Bandung",
  "KWS-02": "Cicendo, Bandung",
  "KWS-03": "Bojongloa Kidul, Bandung",
  "KWS-04": "Regol, Bandung",
  "KWS-05": "Coblong, Bandung",
};

const KOORDINAT = {
  "KWS-01": [107.6061, -6.9218],
  "KWS-02": [107.6019, -6.9137],
  "KWS-03": [107.596, -6.9458],
  "KWS-04": [107.6033, -6.9328],
  "KWS-05": [107.6158, -6.8906],
};

async function main() {
  const hargaPath = path.join(__dirname, "../public/harga-tanah-ekstraksi.json");
  const extractedPrices = JSON.parse(fs.readFileSync(hargaPath, "utf8"));

  const geoPath = path.join(__dirname, "../public/datasetfix.geojson");
  const geoJson = JSON.parse(fs.readFileSync(geoPath, "utf8"));
  const gridFeatures = geoJson.features || [];

  const getDistanceMeters = (lon1, lat1, lon2, lat2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const { data: dbData, error } = await supabase.from("tod_stations").select("*");
  if (error) throw error;

  for (const station of dbData) {
    if (!KOORDINAT[station.id]) continue;

    // 1. Harga Tanah & Skor Properti
    const kecamatan = KAWASAN_KECAMATAN_MAP[station.id];
    let hargaTanahJt = station.harga_tanah_m2;
    let skorProperti = station.skor_properti;

    if (kecamatan && extractedPrices[kecamatan]) {
      const absolutePrice = extractedPrices[kecamatan];
      hargaTanahJt = Math.round((absolutePrice / 1000000) * 10) / 10;

      // Kalkulasi skor properti: Max 25jt = 100
      skorProperti = Math.round((hargaTanahJt / 25) * 100);
      skorProperti = Math.min(100, Math.max(1, skorProperti));
    }

    // 2. Layanan (Total POI) & UMKM dari GeoJSON
    let sumFasilitas = 0;
    let sumPekerja = 0;
    const coord = KOORDINAT[station.id];

    gridFeatures.forEach((f) => {
      if (f.geometry?.type === "Polygon" && f.geometry.coordinates[0]) {
        const poly = f.geometry.coordinates[0];
        let sumLng = 0,
          sumLat = 0;
        for (let i = 0; i < 4; i++) {
          sumLng += poly[i][0];
          sumLat += poly[i][1];
        }
        const cLng = sumLng / 4;
        const cLat = sumLat / 4;

        const dist = getDistanceMeters(coord[0], coord[1], cLng, cLat);
        if (dist <= 800) {
          sumFasilitas += f.properties["Total POI in Grid"] || 0;
          sumPekerja += f.properties["[Raw] WIRASWASTA"] || 0; // Asumsi pelaku UMKM
        }
      }
    });

    const layananCount = sumFasilitas > 0 ? sumFasilitas : station.layanan_count;
    // Skor layanan kasar: 50 fasilitas = 100
    let skorLayanan = Math.round((layananCount / 50) * 100);
    skorLayanan = Math.min(100, Math.max(1, skorLayanan));

    const umkmCount = sumPekerja > 0 ? sumPekerja : station.umkm_count;
    let skorEkonomi = Math.round((umkmCount / 200) * 100);
    skorEkonomi = Math.min(100, Math.max(1, skorEkonomi));

    console.log(
      `Updating ${station.id} (${station.nama}): Harga ${hargaTanahJt} jt/m2, Skor Prop ${skorProperti}, Layanan ${layananCount}, UMKM ${umkmCount}`,
    );

    const { error: updateError } = await supabase
      .from("tod_stations")
      .update({
        harga_tanah_m2: hargaTanahJt,
        skor_properti: skorProperti,
        layanan_count: layananCount,
        skor_layanan: skorLayanan,
        umkm_count: umkmCount,
        skor_ekonomi: skorEkonomi,
      })
      .eq("id", station.id);

    if (updateError) {
      console.error("Update failed for", station.id, updateError);
    }
  }

  console.log("Migration complete.");
}

main().catch(console.error);
