const fs = require("fs");
const path = require("path");

const SOURCE_DIR = "openstreetmap";
const PUBLIC_DIR = "public";

const POI_CATEGORIES = {
  Pendidikan: ["amenity_school.geojson", "amenity_university.geojson"],
  Kesehatan: ["amenity_hospital.geojson", "amenity_clinic.geojson"],
  Komersial: [
    "shop_convenience.geojson",
    "supermarket.geojson",
    "marketplace.geojson",
    "amenity_bank.geojson",
    "amenity_atm.geojson",
  ],
  "Hiburan & Makanan": [
    "amenity_restaurant.geojson",
    "amenity_cafe.geojson",
    "amenity_fast_food.geojson",
    "leisure_park.geojson",
  ],
  Transit: [
    "bus_stop.geojson",
    "amenity_bus_station.geojson",
    "stasiun_rail.geojson",
    "amenity_taxi.geojson",
  ],
};

const PEDESTRIAN_FILES = [
  "jalur_trotoar.geojson",
  "jalur_pejalan kaki.geojson",
  "zebracross.geojson",
];

// 1. Process POIs
let poiFeatures = [];

for (const [kategori, files] of Object.entries(POI_CATEGORIES)) {
  for (const file of files) {
    const filePath = path.join(SOURCE_DIR, file);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const geojson = JSON.parse(raw);
        // Ensure it's a FeatureCollection
        if (geojson.type === "FeatureCollection" && geojson.features) {
          geojson.features.forEach((f) => {
            // Keep it light, only retain necessary properties
            f.properties = {
              kategori: kategori,
              name: f.properties.name || f.properties.amenity || f.properties.shop || "",
            };
            poiFeatures.push(f);
          });
        }
      } catch (e) {
        console.error("Error processing", file, e);
      }
    } else {
      console.warn("File not found:", file);
    }
  }
}

const poiOutput = {
  type: "FeatureCollection",
  features: poiFeatures,
};

fs.writeFileSync(path.join(PUBLIC_DIR, "poi-fasilitas.geojson"), JSON.stringify(poiOutput));
console.log(`Generated poi-fasilitas.geojson with ${poiFeatures.length} features.`);

// 2. Process Pedestrian
let pedFeatures = [];

for (const file of PEDESTRIAN_FILES) {
  const filePath = path.join(SOURCE_DIR, file);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const geojson = JSON.parse(raw);
      if (geojson.type === "FeatureCollection" && geojson.features) {
        geojson.features.forEach((f) => {
          f.properties = {
            type: "pedestrian",
          };
          pedFeatures.push(f);
        });
      }
    } catch (e) {
      console.error("Error processing", file, e);
    }
  } else {
    console.warn("File not found:", file);
  }
}

const pedOutput = {
  type: "FeatureCollection",
  features: pedFeatures,
};

fs.writeFileSync(
  path.join(PUBLIC_DIR, "infrastruktur-pedestrian.geojson"),
  JSON.stringify(pedOutput),
);
console.log(`Generated infrastruktur-pedestrian.geojson with ${pedFeatures.length} features.`);
