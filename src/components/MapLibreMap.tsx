import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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

import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Load maplibregl from CDN — this completely bypasses Vite's bundler/worker
 * issues that cause the map to hang in dev mode.
 */
async function loadMaplibre(): Promise<any> {
  if ((window as any).maplibregl) {
    return (window as any).maplibregl;
  }
  
  try {
    // 1. Ensure CSS is loaded first so container has dimensions
    if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
      await new Promise<void>((resolve) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@6.3.0/dist/maplibre-gl.css";
        link.onload = () => resolve();
        link.onerror = () => resolve(); // continue anyway
        document.head.appendChild(link);
      });
    }

    // 2. Load JS module natively
    const cdnUrl = "https://unpkg.com/maplibre-gl@6.3.0/dist/maplibre-gl.mjs";
    const module = await import(/* @vite-ignore */ cdnUrl);
    const maplibregl = module.default || module;
    (window as any).maplibregl = maplibregl;
    return maplibregl;
  } catch (err) {
    console.error(err);
    throw new Error("Gagal memuat maplibre-gl dari CDN");
  }
}

/**
 * Reusable MapLibre GL basemap backed by the MAPID street-v2.0 style.
 *
 * SSR-safe: maplibre-gl is loaded from CDN inside useEffect so it never
 * touches `window` during server render, and Vite's worker bundling issues
 * are completely sidestepped.
 */
export function MapLibreMap({
  center = [107.6098, -6.9147],
  zoom = 13,
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

    if (!containerRef.current) {
      console.warn("⚠️ Container ref peta belum tersedia");
      return;
    }

    let cancelled = false;
    let map: MapInstance = null;
    let ro: ResizeObserver | null = null;

    console.log("🗺️ Memulai inisialisasi MapLibre...");

    const styleUrl = `https://v2.basemap.mapid.io/styles/street-v2.0/style.json?key=${apiKey}`;
    console.log("🗺️ Style URL:", styleUrl);

    loadMaplibre()
      .then((MLGL) => {
        if (cancelled || !containerRef.current) return;

        console.log("🗺️ maplibre-gl loaded from CDN, creating map...");

        map = new MLGL.Map({
          container: containerRef.current,
          style: styleUrl,
          center: center,
          zoom: zoom,
          attributionControl: false,
        });

        // NavigationControl di pojok kanan atas
        map.addControl(new MLGL.NavigationControl(), "top-right");

        // Mark ready after a short delay — the canvas starts rendering tiles
        let isReady = false;
        const setReady = () => {
          if (cancelled || isReady) return;
          isReady = true;
          console.log("✅ MapLibre: Peta siap ditampilkan!");
          if (onReadyRef.current) onReadyRef.current(map!);
          setState("ready");
          
          // Force resize aggressively to ensure canvas isn't trapped at 0x0
          for (let i = 1; i <= 5; i++) {
            setTimeout(() => map?.resize(), i * 200);
          }
        };

        map.once("load", setReady);
        setTimeout(setReady, 1500); // Fallback for broken sprites

        map.on("error", (e: any) => {
          console.error("❌ MapLibre Error:", e.error?.message || e);
        });

        // Keep the canvas in sync with responsive container resizes.
        ro = new ResizeObserver(() => map?.resize());
        ro.observe(containerRef.current!);
      })
      .catch((err) => {
        console.error("❌ Gagal memuat maplibre-gl:", err);
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
      ro?.disconnect();
      map?.remove();
      map = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "relative min-h-[500px] w-full flex flex-col overflow-hidden bg-secondary/30",
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
        ? "Gagal memuat basemap MAPID. Cek console untuk detail."
        : "Memuat peta…";
  return (
    <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
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
