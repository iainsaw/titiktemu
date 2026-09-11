require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const readline = require("readline");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

const KECAMATAN_MAP = {
  "Andir, Bandung": [107.5794, -6.9135], // Stasiun Andir
  "Astanaanyar, Bandung": [107.6033, -6.9328], // Tegalega
  "Antapani, Bandung": [107.6545, -6.9163],
  "Sumurbandung, Bandung": [107.6105, -6.9175], // Braga
  "Coblong, Bandung": [107.6158, -6.8906], // Dipatiukur
  "Kiaracondong, Bandung": [107.6465, -6.9248], // Kiaracondong
  "Cidadap, Bandung": [107.596, -6.8615], // Ledeng
  "Cicendo, Bandung": [107.6019, -6.9137], // Stasiun Bandung
  "Bojongloa Kidul, Bandung": [107.596, -6.9458], // Leuwipanjang
  "Bandung Wetan, Bandung": [107.6186, -6.9003], // Gasibu
  "Regol, Bandung": [107.6061, -6.9218], // Alun-Alun
  "Batununggal, Bandung": [107.6421, -6.9135], // Kiara Artha Park
  "Cibeunying Kidul, Bandung": [107.6548, -6.9038], // Cicaheum
  "Bandung Kulon, Bandung": [107.5878, -6.9142], // Ciroyom
  "Lengkong, Bandung": [107.6272, -6.9213], // Cikudapateuh
  "Cimahi, Bandung": [107.5583, -6.8986], // Cimindi
  // Default fallback for others (approx center of bandung)
  default: [107.6098, -6.9175],
};

async function run() {
  console.log("Starting ingestion of CSV data...");
  const fileStream = fs.createReadStream(
    "/Users/courage/Documents/Titik Temu/titiktemu/public/Harga Rumah Kota Bandung/results_cleaned.csv",
  );
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let firstLine = true;
  const batch = [];
  let count = 0;

  for await (const line of rl) {
    if (firstLine) {
      firstLine = false;
      continue;
    }

    // Simple CSV parser
    let insideQuote = false;
    let currentPart = "";
    const parts = [];
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        insideQuote = !insideQuote;
      } else if (line[i] === "," && !insideQuote) {
        parts.push(currentPart);
        currentPart = "";
      } else {
        currentPart += line[i];
      }
    }
    parts.push(currentPart);

    if (parts.length < 8) continue;

    const location = parts[1].replace(/"/g, "").trim();
    const price = parseFloat(parts[5]);
    const land_area = parseFloat(parts[6]);
    const building_area = parseFloat(parts[7]);

    if (isNaN(price) || isNaN(land_area) || isNaN(building_area) || land_area === 0) continue;

    // Calculate harga_tanah_m2 directly as per user formula
    let vLahan = price - building_area * 5000000;
    if (vLahan < 0) vLahan = price;
    const hargaM2 = vLahan / land_area / 1000000;

    // Determine coordinates
    let anchor = KECAMATAN_MAP[location];
    if (!anchor) anchor = KECAMATAN_MAP["default"];

    // Add jitter within ~500m (0.0045 degrees) to spread them out realistically
    const jitterX = (Math.random() - 0.5) * 0.009;
    const jitterY = (Math.random() - 0.5) * 0.009;
    const geomStr = `POINT(${anchor[0] + jitterX} ${anchor[1] + jitterY})`;

    batch.push({
      external_id: `CSV-${count}-${Math.random().toString(36).substr(2, 9)}`,
      price: price,
      land_area: land_area,
      building_area: building_area,
      harga_tanah_m2: hargaM2,
      geom: geomStr,
    });

    count++;

    // Insert in batches of 1000
    if (batch.length === 1000) {
      console.log(`Inserting batch of 1000...`);
      const { error } = await supabase.from("harga_tanah").insert(batch);
      if (error) console.error("Insert error:", error.message);
      batch.length = 0; // clear
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    console.log(`Inserting final batch of ${batch.length}...`);
    const { error } = await supabase.from("harga_tanah").insert(batch);
    if (error) console.error("Insert error:", error.message);
  }

  console.log(`Inserted ${count} properties from CSV.`);
}

run();
