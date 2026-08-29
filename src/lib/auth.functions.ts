import { createServerFn } from "@tanstack/react-start";
import { supabaseServer } from "./supabase.server";

/**
 * Server-side role check menggunakan service_role key.
 * Pengecekan di server mencegah manipulasi dari sisi browser.
 */
export const getUserRole = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data: { userId } }) => {
    if (!supabaseServer) return "user";

    const { data, error } = await supabaseServer
      .from("user_profiles")
      .select("role, display_name")
      .eq("id", userId)
      .single();

    if (error || !data) return "user";
    return data.role as "admin" | "user";
  });

/**
 * Mengambil statistik dasar untuk admin dashboard (server-only).
 */
export const getAdminStats = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data: { userId } }) => {
    if (!supabaseServer) throw new Error("Server not configured");

    // Verifikasi role dulu
    const { data: profile } = await supabaseServer
      .from("user_profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile || profile.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Ambil statistik dari semua tabel
    const [stationsRes, poisRes, layananRes, aksesRes, hargaTanahRes] = await Promise.all([
      supabaseServer.from("tod_stations").select("id, nama, skor_ekonomi, skor_layanan, skor_akses, skor_properti, umkm_count, updated_at"),
      supabaseServer.from("osm_pois").select("id", { count: "exact", head: true }),
      supabaseServer.from("osm_layanan").select("id", { count: "exact", head: true }),
      supabaseServer.from("osm_akses").select("id", { count: "exact", head: true }),
      supabaseServer.from("harga_tanah").select("id", { count: "exact", head: true }),
    ]);

    return {
      stations: stationsRes.data || [],
      counts: {
        poi_umkm: poisRes.count || 0,
        layanan: layananRes.count || 0,
        akses: aksesRes.count || 0,
        harga_tanah: hargaTanahRes.count || 0,
      },
    };
  });
