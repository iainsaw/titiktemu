require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function run() {
  const targetLat = -6.9218; // Alun-Alun Bandung
  const targetLon = 107.6061;
  let count = 0;
  let from = 0;
  let hasMore = true;

  while(hasMore) {
    const { data } = await supabase.from('harga_tanah').select('geom').range(from, from + 999);
    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }
    for (const d of data) {
      if (d.geom && d.geom.coordinates) {
        const [lon, lat] = d.geom.coordinates;
        if (getDistance(targetLat, targetLon, lat, lon) <= 0.8) { // 800m
          count++;
        }
      }
    }
    from += 1000;
  }
  console.log('Properties within 800m of Alun-Alun:', count);
}
run();
