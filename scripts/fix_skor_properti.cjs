require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

async function run() {
  console.log("Running analyze_tod_clusters RPC...");
  // This calculates everything based on 15 jt/m2 logic first
  const { error: rpcError } = await supabase.rpc("analyze_tod_clusters");
  if (rpcError) {
    console.error("Error running RPC:", rpcError.message);
  } else {
    console.log("Successfully ran analyze_tod_clusters RPC");
  }

  // Now we fetch the newly calculated harga_tanah_m2 and manually update skor_properti to use 25 jt/m2 logic
  console.log("Fetching stations to correct skor_properti...");
  const { data: stations, error: fetchError } = await supabase
    .from("tod_stations")
    .select("id, harga_tanah_m2");
  if (fetchError) {
    console.error("Error fetching stations:", fetchError);
    return;
  }

  for (const st of stations) {
    let s_properti = 1;
    if (st.harga_tanah_m2 > 0) {
      s_properti = Math.min(100, Math.max(1, Math.round((st.harga_tanah_m2 * 100) / 25)));
    }
    const { error: updateError } = await supabase
      .from("tod_stations")
      .update({ skor_properti: s_properti })
      .eq("id", st.id);

    if (updateError) {
      console.error("Error updating skor_properti for", st.id, updateError);
    }
  }

  console.log("Successfully corrected skor_properti for all stations based on 25 jt/m2 bound!");
}

run();
