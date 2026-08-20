const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DIR = 'tfb-route-shp';
const ANGKOT_DIR = 'tmp-angkot';
const BUS_DIR = 'tmp-bus';

// Create temp dirs
if (!fs.existsSync(ANGKOT_DIR)) fs.mkdirSync(ANGKOT_DIR);
if (!fs.existsSync(BUS_DIR)) fs.mkdirSync(BUS_DIR);

// Regex for BRT / Bus
const busRegex = /tmp|tmb|trans|koridor|jalur|feeder/i;

const files = fs.readdirSync(SOURCE_DIR);

// To avoid copying the same base name multiple times, we'll find unique base names
const baseNames = new Set(files.filter(f => f.endsWith('.shp')).map(f => f.replace('.shp', '')));

baseNames.forEach(baseName => {
  const isBus = busRegex.test(baseName);
  const targetDir = isBus ? BUS_DIR : ANGKOT_DIR;

  // Copy all related extensions
  ['.shp', '.dbf', '.shx', '.prj', '.cpg', '.qml'].forEach(ext => {
    const src = path.join(SOURCE_DIR, baseName + ext);
    const dest = path.join(targetDir, baseName + ext);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });
});

console.log("Files separated. Running mapshaper...");

try {
  console.log("Generating rute-bus.geojson...");
  execSync(`npx -y mapshaper -i ${BUS_DIR}/*.shp combine-files -merge-layers force -filter-fields name,ref -simplify dp 5% -o public/rute-bus-bandung.geojson format=geojson`, { stdio: 'inherit' });
  
  console.log("Generating rute-angkot-bandung-micro.geojson...");
  execSync(`npx -y mapshaper -i ${ANGKOT_DIR}/*.shp combine-files -merge-layers force -filter-fields name,ref -simplify dp 5% -o public/rute-angkot-bandung-micro.geojson format=geojson`, { stdio: 'inherit' });

  console.log("Cleanup...");
  fs.rmSync(ANGKOT_DIR, { recursive: true, force: true });
  fs.rmSync(BUS_DIR, { recursive: true, force: true });
  console.log("Done!");
} catch (e) {
  console.error("Error running mapshaper:", e.message);
}
