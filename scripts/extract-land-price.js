import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, "../public/Harga Rumah Kota Bandung/results_cleaned.csv");
const outputPath = path.join(__dirname, "../public/harga-tanah-ekstraksi.json");

const lines = fs.readFileSync(csvPath, "utf8").split("\n").filter(l => l.trim() !== "");

const locationData = {};
const BIAYA_BANGUN = 5000000;

for (let i = 1; i < lines.length; i++) {
  const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
  if (row && row.length >= 8) {
    const loc = row[1].replace(/"/g, "").trim();
    const price = parseFloat(row[5]);
    const landArea = parseFloat(row[6]);
    const buildArea = parseFloat(row[7]);
    
    if (isNaN(price) || isNaN(landArea) || isNaN(buildArea) || landArea <= 0) continue;
    
    const buildingValue = buildArea * BIAYA_BANGUN;
    let landValue = price - buildingValue;
    
    // Jika landValue negatif, artinya bangunan sangat menyusut / beban pembongkaran.
    // Anggap saja harga jual = harga tanah murni (pembeli beli lahan, bongkar bangunan)
    if (landValue <= 0) {
      landValue = price; 
    }
    
    const pricePerM2 = landValue / landArea;
    
    // Filter outlier ekstrim (misal < 500rb atau > 100jt per m2) agar rata-rata rasional
    if (pricePerM2 < 500000 || pricePerM2 > 100000000) continue;

    if (!locationData[loc]) {
      locationData[loc] = { sum: 0, count: 0 };
    }
    locationData[loc].sum += pricePerM2;
    locationData[loc].count += 1;
  }
}

const results = {};
for (const loc in locationData) {
  results[loc] = Math.round(locationData[loc].sum / locationData[loc].count);
}

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log("Successfully extracted land prices and saved to", outputPath);
