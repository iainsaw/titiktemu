import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envData = fs.readFileSync(envPath, 'utf8');
    envData.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    });
  } catch (e) {
    console.log("Menggunakan default env variables.");
  }
}
loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL atau SUPABASE_KEY tidak ditemukan!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const CHUNK_SIZE = 500;

/**
 * Generik: baca GeoJSON, ekstrak Point, upload ke tabel tertentu.
 */
async function uploadGeoJSON(filePath, category, tableName) {
  try {
    console.log(`  📄 ${path.basename(filePath)} → tabel "${tableName}"...`);
    const rawData = fs.readFileSync(filePath, 'utf8');
    const geojson = JSON.parse(rawData);
    
    if (!geojson.features || geojson.features.length === 0) {
      console.log(`  ⏭️ Kosong, skip.`);
      return 0;
    }

    const payload = geojson.features.map(f => {
      if (f.geometry.type !== "Point") return null;
      const lng = f.geometry.coordinates[0];
      const lat = f.geometry.coordinates[1];
      return {
        external_id: f.id || crypto.randomUUID(),
        name: f.properties.name || f.properties.amenity || f.properties.shop || "Unknown",
        category: category,
        geom: `SRID=4326;POINT(${lng} ${lat})`
      };
    }).filter(item => item !== null);

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'external_id' });
      if (error) {
        console.error(`  ❌ Chunk ${i}-${i + CHUNK_SIZE}: ${error.message}`);
      }
    }
    console.log(`  ✅ ${payload.length} titik berhasil.`);
    return payload.length;
  } catch (e) {
    console.error(`  ❌ Gagal: ${e.message}`);
    return 0;
  }
}

async function uploadStations() {
  const STATIONS = [
    { id: "KWS-01", nama: "Alun-Alun Bandung", koridor: "Pusat Kota", lat: -6.9218, lng: 107.6061 },
    { id: "KWS-02", nama: "Stasiun Bandung", koridor: "Stasiun Utama", lat: -6.9137, lng: 107.6019 },
    { id: "KWS-03", nama: "Terminal Leuwipanjang", koridor: "Terminal", lat: -6.9458, lng: 107.5960 },
    { id: "KWS-04", nama: "Tegalega", koridor: "Pusat Kota", lat: -6.9328, lng: 107.6033 },
    { id: "KWS-05", nama: "Dipatiukur", koridor: "Pendidikan & Komersial", lat: -6.8906, lng: 107.6158 }
  ];

  console.log(`\n🚄 Uploading ${STATIONS.length} Stations...`);
  await supabase.from('tod_stations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const payload = STATIONS.map(s => ({
    id: s.id, nama: s.nama, koridor: s.koridor,
    geom: `SRID=4326;POINT(${s.lng} ${s.lat})`
  }));

  const { error } = await supabase.from('tod_stations').upsert(payload);
  if (error) console.error("❌ Error:", error.message);
  else console.log("✅ Stasiun berhasil.");
}

async function main() {
  const osmDir = path.resolve(process.cwd(), 'openstreetmap');

  // ═══════════════════════════════════════════════════════
  // A) TABEL osm_pois — Data UMKM / Komersial (untuk Skor Ekonomi)
  // ═══════════════════════════════════════════════════════
  console.log("\n═══ [1/4] SKOR EKONOMI: Upload Data UMKM ═══");
  await supabase.from('osm_pois').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const umkmFiles = [
    { file: 'amenity_restaurant.geojson', cat: 'F&B' },
    { file: 'amenity_cafe.geojson', cat: 'F&B' },
    { file: 'amenity_fast_food.geojson', cat: 'F&B' },
    { file: 'marketplace.geojson', cat: 'Komersial' },
    { file: 'shop_convenience.geojson', cat: 'Komersial' },
    { file: 'supermarket.geojson', cat: 'Komersial' },
  ];
  let totalUmkm = 0;
  for (const { file, cat } of umkmFiles) {
    const fullPath = path.join(osmDir, file);
    if (fs.existsSync(fullPath)) totalUmkm += await uploadGeoJSON(fullPath, cat, 'osm_pois');
  }
  console.log(`  📊 Total UMKM: ${totalUmkm} titik`);

  // ═══════════════════════════════════════════════════════
  // B) TABEL osm_layanan — Fasilitas Publik (untuk Skor Layanan)
  // ═══════════════════════════════════════════════════════
  console.log("\n═══ [2/4] SKOR LAYANAN: Upload Data Fasilitas Publik ═══");
  await supabase.from('osm_layanan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const layananFiles = [
    { file: 'amenity_hospital.geojson', cat: 'hospital' },
    { file: 'amenity_clinic.geojson', cat: 'clinic' },
    { file: 'amenity_school.geojson', cat: 'school' },
    { file: 'amenity_university.geojson', cat: 'university' },
  ];
  let totalLayanan = 0;
  for (const { file, cat } of layananFiles) {
    const fullPath = path.join(osmDir, file);
    if (fs.existsSync(fullPath)) totalLayanan += await uploadGeoJSON(fullPath, cat, 'osm_layanan');
  }
  console.log(`  📊 Total Layanan: ${totalLayanan} titik`);

  // ═══════════════════════════════════════════════════════
  // C) TABEL osm_akses — Titik Transit (untuk Skor Akses)
  // ═══════════════════════════════════════════════════════
  console.log("\n═══ [3/4] SKOR AKSES: Upload Data Titik Transit ═══");
  await supabase.from('osm_akses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const aksesFiles = [
    { file: 'bus_stop.geojson', cat: 'bus_stop' },
    { file: 'amenity_bus_station.geojson', cat: 'bus_station' },
    { file: 'stasiun_rail.geojson', cat: 'stasiun_rail' },
  ];
  let totalAkses = 0;
  for (const { file, cat } of aksesFiles) {
    const fullPath = path.join(osmDir, file);
    if (fs.existsSync(fullPath)) totalAkses += await uploadGeoJSON(fullPath, cat, 'osm_akses');
  }
  console.log(`  📊 Total Akses Transit: ${totalAkses} titik`);

  // ═══════════════════════════════════════════════════════
  // D) Upload Stasiun & Jalankan Analisis PostGIS
  // ═══════════════════════════════════════════════════════
  console.log("\n═══ [4/4] STASIUN & ANALISIS POSTGIS ═══");
  await uploadStations();

  console.log(`\n🧠 Memanggil RPC analyze_tod_clusters()...`);
  const { error } = await supabase.rpc('analyze_tod_clusters');
  if (error) console.error("❌ RPC gagal:", error.message);
  else console.log("✅ Analisis PostGIS selesai.");

  console.log("\n🎉 100% DATA RIIL — ZERO DUMMY — PIPELINE SELESAI!");
}

main();
