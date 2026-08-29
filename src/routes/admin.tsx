import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Database, Users, Map,
  TrendingUp, RefreshCw, ShieldAlert, Loader2,
  BarChart3, CheckCircle2, AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminStats } from "@/lib/auth.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Titik Temu" },
      { name: "robots", content: "noindex, nofollow" }, // Sembunyikan dari search engine
    ],
  }),
  component: AdminDashboard,
});

type Stats = {
  stations: Array<{
    id: string; nama: string;
    skor_ekonomi: number; skor_layanan: number; skor_akses: number; skor_properti: number;
    umkm_count: number; updated_at: string;
  }>;
  counts: {
    poi_umkm: number; layanan: number; akses: number; harga_tanah: number;
  };
};

function AdminDashboard() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Guard: redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate({ to: "/" });
    }
  }, [user, isAdmin, loading, navigate]);

  // Load stats
  const loadStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await getAdminStats({ data: { userId: user.id } });
      setStats(data as Stats);
    } catch (e) {
      setStatsError("Gagal memuat statistik. Pastikan Anda memiliki akses admin.");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) loadStats();
  }, [user, isAdmin]);

  // Show loading while auth resolves
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Redirect guard (shows briefly before redirect)
  if (!user || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <ShieldAlert className="size-10 text-destructive" />
          <p className="text-[15px] font-medium">Akses Ditolak</p>
          <p className="text-[13px] text-muted-foreground">Anda tidak memiliki izin mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  const avgSkor = (station: Stats["stations"][0]) =>
    Math.round((station.skor_ekonomi + station.skor_layanan + station.skor_akses + station.skor_properti) / 4);

  const skorColor = (s: number) =>
    s >= 70 ? "text-emerald-600 dark:text-emerald-400"
    : s >= 50 ? "text-amber-600 dark:text-amber-400"
    : "text-rose-600 dark:text-rose-400";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-5 sm:py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-amber-600 dark:text-amber-400 uppercase mb-2">
              <LayoutDashboard className="size-3.5" />
              Admin Dashboard
            </div>
            <h1 className="text-[clamp(24px,6vw,40px)] font-bold tracking-tight">
              Pusat Kendali Titik Temu
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Selamat datang, <strong>{user.user_metadata?.display_name || user.email?.split("@")[0]}</strong>.
              Statistik data dan kawasan secara real-time.
            </p>
          </div>
          <button
            onClick={loadStats}
            disabled={statsLoading}
            className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/50 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-secondary"
          >
            <RefreshCw className={cn("size-3.5", statsLoading && "animate-spin")} />
            Muat Ulang
          </button>
        </div>

        {statsError && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {statsError}
          </div>
        )}

        {/* Database Overview Cards */}
        <section className="mb-8">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Overview Dataset
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Titik UMKM & Komersial", value: stats?.counts.poi_umkm, icon: TrendingUp, color: "text-amber-500" },
              { label: "Fasilitas Layanan Publik", value: stats?.counts.layanan, icon: Users, color: "text-blue-500" },
              { label: "Titik Akses Transit", value: stats?.counts.akses, icon: Map, color: "text-emerald-500" },
              { label: "Sampel Harga Tanah", value: stats?.counts.harga_tanah, icon: Database, color: "text-violet-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-border/30 bg-secondary/20 p-4">
                <div className={cn("mb-2.5 flex size-9 items-center justify-center rounded-xl bg-background/60", color.replace("text-", "bg-").replace("-500", "-500/10"))}>
                  <Icon className={cn("size-4.5", color)} />
                </div>
                <p className="text-[22px] font-bold font-mono">
                  {statsLoading ? (
                    <span className="inline-block h-5 w-16 animate-pulse rounded bg-secondary" />
                  ) : (
                    (value ?? 0).toLocaleString("id-ID")
                  )}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Kawasan TOD Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 className="size-3.5" />
              Skor Kawasan TOD
            </h2>
            <span className="text-[12px] text-muted-foreground/60">
              {stats?.stations.length ?? 0} kawasan aktif
            </span>
          </div>

          <div className="rounded-2xl border border-border/30 bg-secondary/10 overflow-hidden">
            {statsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : stats?.stations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Database className="size-8 mb-3 opacity-30" />
                <p className="text-[13px]">Belum ada data kawasan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/20 bg-secondary/30">
                      {["ID", "Nama Kawasan", "UMKM", "Ekonomi", "Layanan", "Akses", "Properti", "Rata-rata", "Diperbarui"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {stats?.stations.map((s) => {
                      const avg = avgSkor(s);
                      return (
                        <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground/60">{s.id}</td>
                          <td className="px-4 py-3 font-medium">{s.nama}</td>
                          <td className="px-4 py-3 font-mono">{s.umkm_count}</td>
                          <td className={cn("px-4 py-3 font-mono font-semibold", skorColor(s.skor_ekonomi))}>{s.skor_ekonomi}</td>
                          <td className={cn("px-4 py-3 font-mono font-semibold", skorColor(s.skor_layanan))}>{s.skor_layanan}</td>
                          <td className={cn("px-4 py-3 font-mono font-semibold", skorColor(s.skor_akses))}>{s.skor_akses}</td>
                          <td className={cn("px-4 py-3 font-mono font-semibold", skorColor(s.skor_properti))}>{s.skor_properti}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1 font-mono font-bold", skorColor(avg))}>
                              <CheckCircle2 className="size-3" />
                              {avg}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground/50 text-[11px]">
                            {s.updated_at ? new Date(s.updated_at).toLocaleDateString("id-ID") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Security Note */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-border/20 bg-secondary/10 p-4 text-[12px] text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <span className="font-semibold text-foreground/80">Catatan Keamanan:</span>{" "}
            Halaman ini hanya dapat diakses oleh akun dengan role <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">admin</code>.
            Pengecekan dilakukan di sisi server menggunakan Supabase Service Role Key.
            Untuk mengubah role pengguna, gunakan Supabase Dashboard → SQL Editor.
          </div>
        </div>
      </main>
    </div>
  );
}
