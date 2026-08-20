import { createClient } from '@supabase/supabase-js';

// Baca .env manual jika tidak menggunakan flag --env-file
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
    console.log("Tidak bisa membaca .env, menggunakan variabel environment yang ada.");
  }
}
loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAPID_API_KEY = process.env.MAPID_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL atau SUPABASE_KEY tidak ditemukan!");
  process.exit(1);
}

if (!MAPID_API_KEY) {
  console.error("❌ MAPID_API_KEY tidak ditemukan di .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MAPID_BASE_URL = "https://api.mapid.io/api/v1";

async function testSync() {
  const lat = -6.9147;
  const lng = 107.6098;
  const radius = 1000;

  console.log(`\n========================================`);
  console.log(`🧪 TESTING MAPID SYNC LOGIC (Direct Node.js)`);
  console.log(`Koordinat: ${lat}, ${lng} (Radius ${radius}m)`);
  console.log(`========================================\n`);

  const headers = {
    "Authorization": `Bearer ${MAPID_API_KEY}`,
    "Content-Type": "application/json",
  };

  const queryParams = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius: radius.toString(),
    const MAPID_BASE_URL = "https://mapid.co.id";
    const LAYER_PROPERTI = process.env.MAPID_LAYER_PROPERTI || "/prop_go_layer_xyz123";
    const LAYER_MENU = process.env.MAPID_LAYER_MENU || "/menu_go_layer_xyz123";
    const LAYER_AKTIVITAS = process.env.MAPID_LAYER_AKTIVITAS || "/act_go_layer_xyz123";

    console.log("1️⃣ Fetching data dari MAPID API...");
    const [propRes, menuRes, actRes] = await Promise.all([
      fetch(`${MAPID_BASE_URL}${LAYER_PROPERTI}/features`, { headers }),
      fetch(`${MAPID_BASE_URL}${LAYER_MENU}/features`, { headers }),
      fetch(`${MAPID_BASE_URL}${LAYER_AKTIVITAS}/features`, { headers }),
    ]);

    if (!propRes.ok) console.error("❌ MAPID PropertiGo Error:", await propRes.text());
    if (!menuRes.ok) console.error("❌ MAPID MenuGo Error:", await menuRes.text());
    if (!actRes.ok) console.error("❌ MAPID Activities Error:", await actRes.text());

    const propData = propRes.ok ? await propRes.json() : { features: [] };
    const menuData = menuRes.ok ? await menuRes.json() : { features: [] };
    const actData = actRes.ok ? await actRes.json() : { features: [] };

    console.log(`\n✅ Hasil dari MAPID:`);
    console.log(`- PropertiGo: ${(propData.features || []).length} item`);
    if ((propData.features || []).length > 0) console.log("  Contoh:", JSON.stringify(propData.features[0], null, 2));
    
    console.log(`- MenuGo: ${(menuData.features || []).length} item`);
    if ((menuData.features || []).length > 0) console.log("  Contoh:", JSON.stringify(menuData.features[0], null, 2));
    
    console.log(`- Activities: ${(actData.features || []).length} item`);
    if ((actData.features || []).length > 0) console.log("  Contoh:", JSON.stringify(actData.features[0], null, 2));

    console.log("\n2️⃣ Transformasi data ke format PostGIS (WKT)...");
    
    const formatPoint = (longitude, latitude) => `SRID=4326;POINT(${longitude} ${latitude})`;

    const propertiPayload = (propData.features || []).map(feature => ({
      external_id: feature.properties.id_transaksi || feature.properties._id || crypto.randomUUID(),
      name: feature.properties.nama_tempat || "Unknown Property",
      category: feature.properties.jenis_modul || "PropertiGo",
      price: feature.properties.nominal_struk || (feature.properties.detail_properti?.harga_per_tahun) || 0,
      timestamp: feature.properties.waktu_input || new Date().toISOString(),
      geom: formatPoint(feature.geometry.coordinates[0], feature.geometry.coordinates[1]),
    })).filter(item => item.geom);

    const menuPayload = (menuData.features || []).map(feature => ({
      external_id: feature.properties.id_transaksi || feature.properties._id || crypto.randomUUID(),
      name: feature.properties.nama_tempat || "Unknown Resto",
      category: feature.properties.jenis_modul || "MenuGo",
      rating: feature.properties.rating || 0,
      timestamp: feature.properties.waktu_input || new Date().toISOString(),
      geom: formatPoint(feature.geometry.coordinates[0], feature.geometry.coordinates[1]),
    })).filter(item => item.geom);

    const actPayload = (actData.features || []).map(feature => ({
      external_id: feature.properties.id_transaksi || feature.properties._id || crypto.randomUUID(),
      name: feature.properties.nama_tempat || "Unknown Activity",
      activity_type: feature.properties.jenis_modul || "Activities",
      timestamp: feature.properties.waktu_input || new Date().toISOString(),
      geom: formatPoint(feature.geometry.coordinates[0], feature.geometry.coordinates[1]),
    })).filter(item => item.geom);

    console.log("\n3️⃣ Menyimpan ke Supabase Database (Upsert)...");
    
    if (propertiPayload.length > 0) {
      console.log(`Mengunggah ${propertiPayload.length} data ke tod_grid_profiles...`);
      const { data, error } = await supabase.from("tod_grid_profiles").upsert(propertiPayload, { onConflict: "external_id" });
      if (error) console.error("❌ Error Upsert PropertiGo:", error);
      else console.log("✅ Sukses Upsert PropertiGo");
    } else {
      console.log("⏩ Skip PropertiGo (Kosong)");
    }

    if (menuPayload.length > 0) {
      console.log(`Mengunggah ${menuPayload.length} data ke vitality_scores...`);
      const { data, error } = await supabase.from("vitality_scores").upsert(menuPayload, { onConflict: "external_id" });
      if (error) console.error("❌ Error Upsert MenuGo:", error);
      else console.log("✅ Sukses Upsert MenuGo");
    } else {
      console.log("⏩ Skip MenuGo (Kosong)");
    }

    if (actPayload.length > 0) {
      console.log(`Mengunggah ${actPayload.length} data ke field_surveys...`);
      const { data, error } = await supabase.from("field_surveys").upsert(actPayload, { onConflict: "external_id" });
      if (error) console.error("❌ Error Upsert Activities:", error);
      else console.log("✅ Sukses Upsert Activities");
    } else {
      console.log("⏩ Skip Activities (Kosong)");
    }

    console.log("\n🎉 TESTING SELESAI!");
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error);
  }
}

testSync();
