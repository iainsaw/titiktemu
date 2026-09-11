require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const stations = [
  {
    id: "KWS-06",
    nama: "Stasiun Kiaracondong",
    koridor: "Stasiun Utama",
    klaster: "Inti Komersial",
    lng: 107.6465,
    lat: -6.9248,
  },
  {
    id: "KWS-07",
    nama: "Stasiun Ciroyom",
    koridor: "Stasiun Utama",
    klaster: "Transit Campuran",
    lng: 107.5878,
    lat: -6.9142,
  },
  {
    id: "KWS-08",
    nama: "Stasiun Cikudapateuh",
    koridor: "Stasiun Utama",
    klaster: "Inti Komersial",
    lng: 107.6272,
    lat: -6.9213,
  },
  {
    id: "KWS-09",
    nama: "Stasiun Andir",
    koridor: "Stasiun Utama",
    klaster: "Transit Campuran",
    lng: 107.5794,
    lat: -6.9135,
  },
  {
    id: "KWS-10",
    nama: "Stasiun Cimindi",
    koridor: "Stasiun Utama",
    klaster: "Pinggiran Berkembang",
    lng: 107.5583,
    lat: -6.8986,
  },
  {
    id: "KWS-11",
    nama: "Terminal Cicaheum",
    koridor: "Terminal",
    klaster: "Transit Campuran",
    lng: 107.6548,
    lat: -6.9038,
  },
  {
    id: "KWS-12",
    nama: "Terminal Ledeng",
    koridor: "Terminal",
    klaster: "Pinggiran Berkembang",
    lng: 107.596,
    lat: -6.8615,
  },
  {
    id: "KWS-13",
    nama: "Gasibu",
    koridor: "Pusat Kota",
    klaster: "Inti Komersial",
    lng: 107.6186,
    lat: -6.9003,
  },
  {
    id: "KWS-14",
    nama: "Braga",
    koridor: "Pusat Kota",
    klaster: "Inti Komersial",
    lng: 107.6105,
    lat: -6.9175,
  },
  {
    id: "KWS-15",
    nama: "Kiara Artha Park",
    koridor: "Pusat Kota",
    klaster: "Transit Campuran",
    lng: 107.6421,
    lat: -6.9135,
  },
  {
    id: "KWS-16",
    nama: "Antapani",
    koridor: "Permukiman",
    klaster: "Permukiman Padat",
    lng: 107.6545,
    lat: -6.9163,
  },
];

async function run() {
  for (const st of stations) {
    const geomStr = `POINT(${st.lng} ${st.lat})`;
    const { error } = await supabase.from("tod_stations").upsert({
      id: st.id,
      nama: st.nama,
      koridor: st.koridor,
      klaster: st.klaster,
    });
    if (error) {
      console.error("Error upserting", st.id, error);
    } else {
      // Since the supabase-js client can't easily insert PostGIS geometry directly via standard upsert without postgrest ST_GeomFromText,
      // let's do it via an RPC or we can just fetch and update.
      console.log("Upserted", st.id);
    }
  }
}
run();
