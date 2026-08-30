import { createServerFn } from "@tanstack/react-start";
import { supabaseServer } from "./supabase.server";

async function requireAdmin(userId: string) {
  if (!supabaseServer) throw new Error("Server not configured");
  const { data: profile } = await supabaseServer
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export const insertOfficialStation = createServerFn({ method: "POST" })
  .validator((data: { 
    userId: string;
    station: {
      id: string;
      nama: string;
      koridor: string;
      klaster: string;
      umkm_count: number;
      skor_properti: number;
      skor_layanan: number;
      skor_ekonomi: number;
      skor_akses: number;
      harga_tanah_m2: number;
      lng: number;
      lat: number;
    }
  }) => data)
  .handler(async ({ data: { userId, station } }) => {
    await requireAdmin(userId);

    const { error } = await supabaseServer.from("tod_stations").insert({
      id: station.id,
      nama: station.nama,
      koridor: station.koridor,
      klaster: station.klaster,
      geom: `POINT(${station.lng} ${station.lat})`,
      umkm_count: station.umkm_count,
      harga_tanah_m2: station.harga_tanah_m2,
      skor_properti: station.skor_properti,
      skor_layanan: station.skor_layanan,
      skor_ekonomi: station.skor_ekonomi,
      skor_akses: station.skor_akses,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteOfficialStation = createServerFn({ method: "POST" })
  .validator((data: { userId: string; stationId: string }) => data)
  .handler(async ({ data: { userId, stationId } }) => {
    await requireAdmin(userId);
    const { error } = await supabaseServer.from("tod_stations").delete().eq("id", stationId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
