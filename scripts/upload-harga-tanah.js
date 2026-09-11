import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import crypto from "crypto";

// Load Env
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    const envData = fs.readFileSync(envPath, "utf8");
    envData.split("\n").forEach((line) => {
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
const BIAYA_BANGUNAN_PER_M2 = 4000000; // Asumsi Rp 4 Juta per m2 bangunan

async function uploadHargaTanah() {
  const filePath = path.resolve(process.cwd(), "tanah/clean_df.csv");
  console.log(`\n📄 Membaca dataset ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    console.error("❌ File dataset tidak ditemukan.");
    return;
  }

  const results = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        const price = parseFloat(data.Price);
        const landArea = parseFloat(data.Land);
        const buildingArea = parseFloat(data.Building) || 0;
        const lat = parseFloat(data.Latitude);
        const lng = parseFloat(data.Longitude);

        if (isNaN(price) || isNaN(landArea) || isNaN(lat) || isNaN(lng) || landArea <= 0) return;

        // Building Deduction Method
        const buildingValue = buildingArea * BIAYA_BANGUNAN_PER_M2;
        let landValue = price - buildingValue;

        // Jika nilai deduksi membuat harga tanah minus (artinya harga rumah < estimasi bangunan),
        // fallback gunakan nilai Price asli.
        if (landValue <= 0) {
          landValue = price;
        }

        // Harga tanah per m2
        let hargaTanahM2 = landValue / landArea;

        // Konversi ke satuan "Juta Rupiah / m2" untuk frontend
        hargaTanahM2 = hargaTanahM2 / 1000000;

        results.push({
          external_id: crypto.randomUUID(),
          price: price,
          land_area: landArea,
          building_area: buildingArea,
          harga_tanah_m2: hargaTanahM2,
          geom: `SRID=4326;POINT(${lng} ${lat})`,
        });
      })
      .on("end", async () => {
        console.log(`Menemukan ${results.length} data valid. Membersihkan data lama...`);

        // Bersihkan data lama
        await supabase
          .from("harga_tanah")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        console.log(`Mulai upload ke Supabase...`);
        for (let i = 0; i < results.length; i += CHUNK_SIZE) {
          const chunk = results.slice(i, i + CHUNK_SIZE);
          const { error } = await supabase.from("harga_tanah").upsert(chunk);
          if (error) {
            console.error(`❌ Error upload chunk ${i} - ${i + CHUNK_SIZE}:`, error.message);
          } else {
            console.log(`✅ Uploaded chunk ${i} - ${i + CHUNK_SIZE} / ${results.length}`);
          }
        }
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function runAnalysis() {
  console.log(`\n🧠 Menjalankan Ulang Fungsi RPC analyze_tod_clusters()...`);
  const { error } = await supabase.rpc("analyze_tod_clusters");
  if (error) {
    console.error("❌ Gagal memanggil RPC:", error.message);
  } else {
    console.log("✅ Kalkulasi Harga Tanah Radius 1km Selesai! Tabel tod_stations telah di-update.");
  }
}

async function main() {
  try {
    await uploadHargaTanah();
    await runAnalysis();
    console.log("\n🎉 SELURUH DATA HARGA TANAH BERHASIL DIINTEGRASIKAN!");
  } catch (err) {
    console.error("Terjadi kesalahan:", err);
  }
}

main();
