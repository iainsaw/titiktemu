require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

async function run() {
  const { data, error } = await supabase.from("harga_tanah").select("harga_tanah_m2");
  if (data) {
    const zeros = data.filter((d) => d.harga_tanah_m2 === 0).length;
    const nonZeros = data.filter((d) => d.harga_tanah_m2 > 0).length;
    console.log(`Zeros: ${zeros}, Non-Zeros: ${nonZeros}, Total: ${data.length}`);
  }
}
run();
