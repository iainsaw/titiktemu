import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

type MapInstance = any;

type Props = {
  /** Map center as [lng, lat]. Defaults to Bandung. */
  center?: [number, number];
  zoom?: number;
  /** Fired once the basemap has loaded; receives the live map instance. */
  onReady?: (map: MapInstance) => void;
  /** Absolutely-positioned overlay rendered above the canvas (after load). */
  children?: ReactNode;
  className?: string;
  /** Content shown while the basemap is loading or the API key is missing. */
  fallback?: ReactNode;
};

/**
 * Reusable MapLibre GL basemap backed by the MAPID street-v2.0 style.
 * Uses MAPID basemap only (required by competition).
 */
export function MapLibreMap({
  center = [107.6098, -6.9147],
  zoom = typeof window !== "undefined" && window.innerWidth < 1024 ? 12 : 13,
  onReady,
  children,
  className,
  fallback,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const [state, setState] = useState<"loading" | "ready" | "no-key" | "error">("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;

    let cancelled = false;
    let map: MapInstance = null;
    let ro: ResizeObserver | null = null;

    // VITE_MAPID_API_KEY is baked at build time — may be domain-restricted to localhost.
    // VITE_MAPID_API_KEY_PROD is the key allowed for the deployed domain.
    // Falls back to VITE_MAPID_API_KEY if no prod key is set.
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const apiKey = isLocalhost
      ? (import.meta.env.VITE_MAPID_API_KEY || import.meta.env.VITE_MAPID_API_KEY_PROD)
      : (import.meta.env.VITE_MAPID_API_KEY_PROD || import.meta.env.VITE_MAPID_API_KEY);

    if (!apiKey) {
      setState("no-key");
      return;
    }

    console.log("🔑 Using MapID key for", isLocalhost ? "localhost" : window.location.hostname);
    const styleUrl = `https://v2.basemap.mapid.io/styles/street-v2.0/style.json?key=${apiKey}`;

    import("maplibre-gl")
      .then((module) => {
        if (cancelled || !containerRef.current) return;

        const MLGL = module.default || module;
        (window as any).maplibregl = MLGL;

        // Ensure the container has a non-zero size before init
        const el = containerRef.current;
        const rect = el.getBoundingClientRect();
        console.log("🗺️ Map container size:", rect.width, "×", rect.height);

        map = new MLGL.Map({
          container: el,
          style: styleUrl,
          center,
          zoom,
          attributionControl: false,
          // Prevent MapLibre from resizing itself on window resize (we manage it)
          trackResize: true,
        });

        map.addControl(new MLGL.NavigationControl({ showCompass: true }), "top-right");

        let isReady = false;
        const setReady = () => {
          if (cancelled || isReady) return;
          isReady = true;
          console.log("✅ Peta MAPID berhasil dimuat!");
          setState("ready");
          if (onReadyRef.current) onReadyRef.current(map!);
          // Force resize at several intervals to handle late layout reflows
          [50, 200, 500, 1000, 2000].forEach((ms) => {
            setTimeout(() => { if (!cancelled && map) map.resize(); }, ms);
          });
        };

        map.once("load", setReady);

        map.on("error", (e: any) => {
          const msg = e.error?.message || String(e);
          console.error("❌ MapLibre Error:", msg);
          // Don't crash on tile 404s (normal when zooming out)
          if (msg.includes("status 404") || msg.includes("status 403")) return;
        });

        // Hard safety net: show map anyway after 12s
        setTimeout(() => {
          if (!isReady && !cancelled && map) {
            console.warn("⚠️ Peta dipaksa tampil setelah 12 detik.");
            setReady();
          }
        }, 12000);

        // ResizeObserver: reflow the map canvas when wrapper changes size
        ro = new ResizeObserver(() => {
          if (!cancelled && map) map.resize();
        });
        ro.observe(el);
      })
      .catch((err) => {
        console.error("❌ Gagal memuat maplibre-gl:", err);
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
      ro?.disconnect();
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", className)}
      style={{ minHeight: 400 }}
    >
      {/* Map canvas target — fills the wrapper completely */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* Loading / error overlay */}
      {state !== "ready" && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-6 text-center">
          {fallback ?? <DefaultFallback state={state} />}
        </div>
      )}

      {/* Slot for markers / overlays shown only after map is ready */}
      {state === "ready" && children}
    </div>
  );
}

function DefaultFallback({ state }: { state: "loading" | "no-key" | "error" }) {
  const msg =
    state === "no-key"
      ? "API key MAPID belum dikonfigurasi. Tambahkan VITE_MAPID_API_KEY di file .env"
      : state === "error"
        ? "Gagal memuat basemap MAPID. Cek koneksi internet Anda."
        : "Memuat peta MAPID…";
  return (
    <div className="flex items-center gap-2 rounded-full bg-background/90 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-md backdrop-blur border border-border/40">
      <span
        className={cn(
          "size-2 rounded-full",
          state === "loading" && "animate-pulse bg-primary",
          state === "no-key" && "bg-yellow-500",
          state === "error" && "bg-red-500",
        )}
      />
      {msg}
    </div>
  );
}
