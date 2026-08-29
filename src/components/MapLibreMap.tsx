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
 *
 * Fully Firefox & Cross-Browser Compatible:
 * - Uses local node_modules maplibre-gl dynamic import (bypasses CDN CORS/CSP errors in Firefox)
 * - Uses debounced ResizeObserver to prevent layout thrashing and lag in Gecko engine
 */
export function MapLibreMap({
  center = [107.6098, -6.9147],
  zoom = typeof window !== "undefined" && window.innerWidth < 1024 ? 12 : 13,
  onReady,
  children,
  className,
  fallback,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const [state, setState] = useState<"loading" | "ready" | "no-key" | "error">("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apiKey = import.meta.env.VITE_MAPID_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ VITE_MAPID_API_KEY tidak ditemukan di .env");
      setState("no-key");
      return;
    }

    if (!containerRef.current) return;

    let cancelled = false;
    let map: MapInstance = null;
    let ro: ResizeObserver | null = null;
    let resizeTimer: any = null;

    const styleUrl = `https://v2.basemap.mapid.io/styles/street-v2.0/style.json?key=${apiKey}`;

    import("maplibre-gl")
      .then((module) => {
        if (cancelled || !containerRef.current) return;

        const MLGL = module.default || module;
        (window as any).maplibregl = MLGL;

        map = new MLGL.Map({
          container: containerRef.current,
          style: styleUrl,
          center: center,
          zoom: zoom,
          attributionControl: false,
        });

        // NavigationControl in top-right
        map.addControl(new MLGL.NavigationControl(), "top-right");

        let isReady = false;
        const setReady = () => {
          if (cancelled || isReady) return;
          isReady = true;
          if (onReadyRef.current) onReadyRef.current(map!);
          setState("ready");
          setTimeout(() => {
            if (!cancelled && map) map.resize();
          }, 100);
        };

        map.once("load", setReady);
        setTimeout(setReady, 1500);

        map.on("error", (e: any) => {
          console.error("❌ MapLibre Error:", e.error?.message || e);
        });

        // Debounced ResizeObserver to prevent Firefox lag and layout thrashing
        ro = new ResizeObserver(() => {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (!cancelled && map) map.resize();
          }, 150);
        });
        ro.observe(containerRef.current!);
      })
      .catch((err) => {
        console.error("❌ Gagal memuat maplibre-gl:", err);
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      ro?.disconnect();
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "relative min-h-[400px] w-full flex flex-col overflow-hidden bg-secondary/30",
        className,
      )}
    >
      <div ref={containerRef} className="flex-1 w-full" />

      {state !== "ready" && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-6 text-center">
          {fallback ?? <DefaultFallback state={state} />}
        </div>
      )}
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
        : "Memuat peta…";
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
