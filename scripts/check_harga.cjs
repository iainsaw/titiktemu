require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

async function run() {
  const { data, error } = await supabase
    .from("harga_tanah")
    .select("id, price, land_area, building_area")
    .limit(10);
  console.log(data);
}
run();
