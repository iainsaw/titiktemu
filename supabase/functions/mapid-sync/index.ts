import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius_meters } = await req.json();

    if (!lat || !lng || !radius_meters) {
      throw new Error("Parameter lat, lng, dan radius_meters diperlukan.");
    }

    const MAPID_API_KEY = Deno.env.get("MAPID_API_KEY");
    if (!MAPID_API_KEY) {
      throw new Error("MAPID_API_KEY belum dikonfigurasi di secrets.");
    }

    // Initialize Supabase Client
    // Uses the automatic environment variables injected by Supabase Edge Functions
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const headers = {
      "Authorization": `Bearer ${MAPID_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Construct the query params
    const queryParams = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius_meters.toString(),
    }).toString();

    // Base URL & Layer IDs from Environment (or dummy for now)
    const MAPID_BASE_URL = "https://mapid.co.id";
    const LAYER_PROPERTI = Deno.env.get("MAPID_LAYER_PROPERTI") || "/prop_go_layer_xyz123";
    const LAYER_MENU = Deno.env.get("MAPID_LAYER_MENU") || "/menu_go_layer_xyz123";
    const LAYER_AKTIVITAS = Deno.env.get("MAPID_LAYER_AKTIVITAS") || "/act_go_layer_xyz123";

    // 1. Fetch data concurrently from MAPID feature layers
    const [propRes, menuRes, actRes] = await Promise.all([
      fetch(`${MAPID_BASE_URL}${LAYER_PROPERTI}/features`, { headers }),
      fetch(`${MAPID_BASE_URL}${LAYER_MENU}/features`, { headers }),
      fetch(`${MAPID_BASE_URL}${LAYER_AKTIVITAS}/features`, { headers }),
    ]);

    const propData = propRes.ok ? await propRes.json() : { features: [] };
    const menuData = menuRes.ok ? await menuRes.json() : { features: [] };
    const actData = actRes.ok ? await actRes.json() : { features: [] };

    // 2. Transform & Format Data dari GeoJSON MAPID
    // Menggunakan format WKT (Well-Known Text) dengan SRID 4326
    const formatPoint = (longitude: number, latitude: number) => 
      `SRID=4326;POINT(${longitude} ${latitude})`;

    const propertiPayload = (propData.features || []).map((feature: any) => ({
      external_id: feature.properties.id_transaksi || feature.properties._id || crypto.randomUUID(),
      name: feature.properties.nama_tempat || "Unknown Property",
      category: feature.properties.jenis_modul || "PropertiGo",
      price: feature.properties.nominal_struk || (feature.properties.detail_properti?.harga_per_tahun) || 0,
      timestamp: feature.properties.waktu_input || new Date().toISOString(),
      geom: formatPoint(feature.geometry.coordinates[0], feature.geometry.coordinates[1]),
    })).filter((item: any) => item.geom);

    const menuPayload = (menuData.features || []).map((feature: any) => ({
      external_id: feature.properties.id_transaksi || feature.properties._id || crypto.randomUUID(),
      name: feature.properties.nama_tempat || "Unknown Resto",
      category: feature.properties.jenis_modul || "MenuGo",
      rating: feature.properties.rating || 0,
      timestamp: feature.properties.waktu_input || new Date().toISOString(),
      geom: formatPoint(feature.geometry.coordinates[0], feature.geometry.coordinates[1]),
    })).filter((item: any) => item.geom);

    const actPayload = (actData.features || []).map((feature: any) => ({
      external_id: feature.properties.id_transaksi || feature.properties._id || crypto.randomUUID(),
      name: feature.properties.nama_tempat || "Unknown Activity",
      activity_type: feature.properties.jenis_modul || "Activities",
      timestamp: feature.properties.waktu_input || new Date().toISOString(),
      geom: formatPoint(feature.geometry.coordinates[0], feature.geometry.coordinates[1]),
    })).filter((item: any) => item.geom);

    // 3. Upsert into Supabase PostGIS
    // Menggunakan onConflict untuk melakukan update jika external_id sudah ada
    const upsertPromises = [];

    if (propertiPayload.length > 0) {
      upsertPromises.push(
        supabaseClient.from("tod_grid_profiles").upsert(propertiPayload, { onConflict: "external_id" })
      );
    }

    if (menuPayload.length > 0) {
      upsertPromises.push(
        supabaseClient.from("vitality_scores").upsert(menuPayload, { onConflict: "external_id" })
      );
    }

    if (actPayload.length > 0) {
      upsertPromises.push(
        supabaseClient.from("field_surveys").upsert(actPayload, { onConflict: "external_id" })
      );
    }

    // Wait for all upserts to finish
    const results = await Promise.all(upsertPromises);

    // Check for errors in upsert
    for (const result of results) {
      if (result.error) {
        console.error("Supabase Upsert Error:", result.error);
        throw new Error(`Database error: ${result.error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sinkronisasi MAPID ke Supabase PostGIS berhasil.",
        synced: {
          propertigo: propertiPayload.length,
          menugo: menuPayload.length,
          activities: actPayload.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
