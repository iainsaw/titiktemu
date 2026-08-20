import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Fungsi Haversine untuk menghitung jarak antara 2 koordinat (dalam km)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius bumi dalam km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Jarak dalam km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

async function run() {
  const subdistricts = [];
  const prices = [];

  // Baca subdistricts
  await new Promise((resolve) => {
    fs.createReadStream(path.resolve('tanah/clean_subdistricts.csv'))
      .pipe(csv())
      .on('data', (row) => {
        if (row['City/Regency'] === 'Bandung City') {
           subdistricts.push({
             name: row.Location,
             lat: parseFloat(row.Latitude),
             lng: parseFloat(row.Longitude)
           });
        }
      })
      .on('end', resolve);
  });

  // Baca prices
  await new Promise((resolve) => {
    fs.createReadStream(path.resolve('tanah/clean_df.csv'))
      .pipe(csv())
      .on('data', (row) => {
         prices.push({
           lat: parseFloat(row.Latitude),
           lng: parseFloat(row.Longitude),
           price: parseFloat(row.Price)
         });
      })
      .on('end', resolve);
  });

  const emptySubdistricts = [];
  
  // Cek tiap kecamatan
  for (const sub of subdistricts) {
    let count = 0;
    for (const p of prices) {
      if (isNaN(p.lat) || isNaN(p.lng)) continue;
      // Cek radius 800m (0.8 km)
      if (getDistanceFromLatLonInKm(sub.lat, sub.lng, p.lat, p.lng) <= 0.8) {
        count++;
      }
    }
    if (count === 0) {
      emptySubdistricts.push(sub.name);
    }
  }

  console.log("Kecamatan di Kota Bandung yang KOSONG data harga tanahnya (radius 800m):");
  console.log(emptySubdistricts.join(', '));
  if(emptySubdistricts.length === 0) console.log("Tidak ada! Semua kecamatan memiliki data terdekat.");
}

run();
