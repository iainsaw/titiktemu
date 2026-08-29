require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const batchSize = 1000;
  let from = 0;
  let hasMore = true;
  let totalUpdated = 0;

  console.log('Starting batch update...');

  while (hasMore) {
    const to = from + batchSize - 1;
    const { data, error } = await supabase
      .from('harga_tanah')
      .select('id, price, land_area, building_area')
      .order('id')
      .range(from, to);

    if (error) {
      console.error('Error fetching data:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    const updates = data.map(row => {
      // Formula: V_lahan = price - (building_area * 5,000,000)
      // If V_lahan < 0, V_lahan = price (bangunan dianggap tear-down)
      let vLahan = row.price - (row.building_area * 5000000);
      if (vLahan < 0) {
        vLahan = row.price;
      }

      // harga_tanah_m2 = V_lahan / land_area
      let hargaM2 = 0;
      if (row.land_area && row.land_area > 0) {
        // We convert to millions per m2 directly if needed? No, wait!
        // In the SQL RPC: `rata_harga * 100 / 15`
        // Wait! The user formula doesn't mention million.
        // Let's look at the old DB row: `price: 1600000000`, `harga_tanah_m2: 19.444444`. 
        // 19.4444 is in MILLIONS! 
        // V_lahan = 1,350,000,000. harga_tanah_m2_raw = 1,350,000,000 / 72 = 18,750,000.
        // To get it in millions: 18.75.
        // Let's divide by 1,000,000.
        hargaM2 = (vLahan / row.land_area) / 1000000;
      }

      return {
        id: row.id,
        harga_tanah_m2: hargaM2
      };
    });

    const { error: updateError } = await supabase
      .from('harga_tanah')
      .upsert(updates);

    if (updateError) {
      console.error('Error updating batch:', updateError);
      break;
    }

    totalUpdated += data.length;
    console.log(`Updated ${totalUpdated} rows...`);
    from += batchSize;
  }

  console.log(`Finished updating ${totalUpdated} rows.`);
}

run();
