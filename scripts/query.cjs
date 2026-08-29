require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('tod_stations').select('id, nama, umkm_count, jarak_transit, harga_tanah_m2');
  console.log(data);
}
run();
