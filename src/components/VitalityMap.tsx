import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import {
  hitungSkor,
  kelasSkor,
  warnaSkor,
  type ComponentId,
  type Kawasan,
  type RoleId,
} from "@/lib/vitality-data";
import { cn } from "@/lib/utils";
const aiStar = { url: "/titik-temu-ai-star.png" };
import { MapLibreMap } from "@/components/MapLibreMap";
import { getSecureAssetUrl } from "@/lib/supabase";

type Props = {
  kawasan: Kawasan[];
  role: RoleId;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** "total" = skor tertimbang, atau salah satu komponen sebagai layer aktif. */
  layer?: ComponentId | "total";
  tampilkanKoridor?: boolean;
  tampilkanAnomali?: boolean;
  compact?: boolean;
  /** true = isi penuh kontainer induk (layout kanvas), false = rasio 4:3 */
  fill?: boolean;
  tampilkanSensus?: boolean;
  tampilkanAngkot?: boolean;
  tampilkanBus?: boolean;
  poiPendidikan?: boolean;
  poiKesehatan?: boolean;
  poiKomersial?: boolean;
  poiHiburan?: boolean;
  poiTransit?: boolean;
  tampilkanPedestrian?: boolean;
  tampilkanMissions?: boolean;
  className?: string;
  missions?: any[];
};

/**
 * Koordinat geografis nyata (lng, lat) tiap kawasan pilot Kota Bandung,
 * dipetakan berdasarkan lokasi aktual titik transit terdekat. Digunakan
 * untuk menempatkan marker MapLibre secara geografis di atas basemap MAPID.
 */
export const KOORDINAT: Record<string, [number, number]> = {
  "KWS-01": [107.6061, -6.9218], // Alun-Alun Bandung
  "KWS-02": [107.6019, -6.9137], // Stasiun Bandung
  "KWS-03": [107.5960, -6.9458], // Terminal Leuwipanjang
  "KWS-04": [107.6033, -6.9328], // Tegalega
  "KWS-05": [107.6158, -6.8906], // Dipatiukur
  "KWS-06": [107.6465, -6.9248], // Stasiun Kiaracondong
  "KWS-07": [107.5878, -6.9142], // Stasiun Ciroyom
  "KWS-08": [107.6272, -6.9213], // Stasiun Cikudapateuh
  "KWS-09": [107.5794, -6.9135], // Stasiun Andir
  "KWS-10": [107.5583, -6.8986], // Stasiun Cimindi
  "KWS-11": [107.6548, -6.9038], // Terminal Cicaheum
  "KWS-12": [107.5960, -6.8615], // Terminal Ledeng
  "KWS-13": [107.6186, -6.9003], // Gasibu
  "KWS-14": [107.6095, -6.9174], // Braga
  "KWS-15": [107.6433, -6.9128], // Kiara Artha Park
  "KWS-16": [107.6558, -6.9145], // Antapani
};

/**
 * Mendaftarkan koordinat [lng, lat] untuk ID kawasan baru
 * (misalnya dari hasil geocoding). Dipanggil dari peta.tsx
 * sebelum kawasan ditambahkan ke state.
 */
export function addDynamicKoordinat(id: string, lngLat: [number, number]) {
  KOORDINAT[id] = lngLat;
}

export function VitalityMap({
  kawasan,
  role,
  selectedId,
  onSelect,
  layer = "total",
  tampilkanKoridor = true,
  tampilkanSensus = true,
  tampilkanAngkot = false,
  tampilkanBus = false,
  poiPendidikan = false,
  poiKesehatan = false,
  poiKomersial = false,
  poiHiburan = false,
  poiTransit = false,
  tampilkanPedestrian = false,
  tampilkanMissions = false,
  tampilkanAnomali = true,
  compact = false,
  fill = false,
  className,
  missions = [],
}: Props) {
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [ready, setReady] = useState(false);

  // Latest-value refs so imperative handlers/effects never go stale.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const kawasanRef = useRef(kawasan);
  kawasanRef.current = kawasan;
  const propsRef = useRef({ role, layer, selectedId, tampilkanAnomali, compact });
  propsRef.current = { role, layer, selectedId, tampilkanAnomali, compact };

  // Create markers + koridor GeoJSON layer once the basemap is ready.
  const handleReady = useCallback(async (map: MLMap) => {
    mapRef.current = map;
    // IMPORTANT: use the CDN-loaded maplibregl (same version as the map instance)
    // instead of import("maplibre-gl") which loads npm v6.3.0 and causes
    // version mismatch errors (transform undefined).
    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      console.error("❌ window.maplibregl not available");
      return;
    }
    const markers = markersRef.current;

    for (const k of kawasanRef.current) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "vitality-marker";
      el.addEventListener("click", () => onSelectRef.current(k.id));
      let [lng, lat] = KOORDINAT[k.id] ?? [107.6098, -6.9147];
      if (!KOORDINAT[k.id]) {
        // Scatter slightly to avoid overlapping points at the exact center
        lng += (Math.random() - 0.5) * 0.05;
        lat += (Math.random() - 0.5) * 0.05;
      }
      new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
      markers.set(k.id, el);
    }

    // Add layers in correct order so beforeId references resolve correctly
    await addKoridorLayer(map, kawasanRef.current, tampilkanKoridor);
    await addSensusLayer(map, tampilkanSensus);
    await addAngkotLayer(map, tampilkanAngkot);
    await addBusLayer(map, tampilkanBus);
    await addPoiLayer(map); // Init POI layer (starts hidden)
    await addPedestrianLayer(map, tampilkanPedestrian);
    setReady(true);
    // Render initial marker content.
    renderAllMarkers(markers, kawasanRef.current, propsRef.current);
  }, []);

  // Re-render marker DOM (score, color, highlight, opacity) on any change.
  useEffect(() => {
    if (!ready) return;
    renderAllMarkers(markersRef.current, kawasanRef.current, propsRef.current);
  }, [ready, role, layer, selectedId, tampilkanAnomali, compact]);

  // Toggle koridor line visibility.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer("koridor-line")) {
      map.setLayoutProperty(
        "koridor-line",
        "visibility",
        tampilkanKoridor ? "visible" : "none",
      );
    }
  }, [ready, tampilkanKoridor]);

  // Toggle Sensus visibility.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer("sensus-fill")) {
      map.setLayoutProperty("sensus-fill", "visibility", tampilkanSensus ? "visible" : "none");
      map.setLayoutProperty("sensus-outline", "visibility", tampilkanSensus ? "visible" : "none");
    }
  }, [ready, tampilkanSensus]);

  // Toggle Angkot visibility.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer("angkot-line")) {
      map.setLayoutProperty("angkot-line", "visibility", tampilkanAngkot ? "visible" : "none");
    }
  }, [ready, tampilkanAngkot]);

  // Toggle Bus visibility.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer("bus-line")) {
      map.setLayoutProperty("bus-line", "visibility", tampilkanBus ? "visible" : "none");
    }
  }, [ready, tampilkanBus]);

  // Toggle Fasilitas visibility by category
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    
    const visibleCats: string[] = [];
    if (poiPendidikan) visibleCats.push("Pendidikan");
    if (poiKesehatan) visibleCats.push("Kesehatan");
    if (poiKomersial) visibleCats.push("Komersial");
    if (poiHiburan) visibleCats.push("Hiburan & Makanan");
    if (poiTransit) visibleCats.push("Transit");

    const layers = ["poi-points", "poi-polygons"];
    
    layers.forEach(layerId => {
      if (map.getLayer(layerId)) {
        if (visibleCats.length === 0) {
          map.setLayoutProperty(layerId, "visibility", "none");
        } else {
          map.setLayoutProperty(layerId, "visibility", "visible");
          
          const geomFilter = layerId === "poi-points" 
            ? ["==", ["geometry-type"], "Point"]
            : ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]];
            
          const catConditions = visibleCats.map(cat => ["==", ["get", "kategori"], cat]);
          const categoryFilter = ["any", ...catConditions];
          
          map.setFilter(layerId, ["all", geomFilter, categoryFilter] as any);
        }
      }
    });
  }, [ready, poiPendidikan, poiKesehatan, poiKomersial, poiHiburan, poiTransit]);

  // Toggle Pedestrian visibility.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer("pedestrian-line")) {
      map.setLayoutProperty("pedestrian-line", "visibility", tampilkanPedestrian ? "visible" : "none");
    }
  }, [ready, tampilkanPedestrian]);

  // Handle MAPID Missions
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    const sourceData = {
      type: "FeatureCollection",
      features: missions || []
    };

    if (map.getSource("mapid-missions")) {
      (map.getSource("mapid-missions") as any).setData(sourceData);
    } else {
      map.addSource("mapid-missions", {
        type: "geojson",
        data: sourceData as any,
      });

      map.addLayer({
        id: "missions-circle",
        type: "circle",
        source: "mapid-missions",
        layout: {
          visibility: tampilkanMissions ? "visible" : "none"
        },
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "match",
            ["get", "mission"],
            "properti", "#3b82f6", // blue
            "menu", "#f59e0b", // amber
            "struk", "#10b981", // emerald
            "#94a3b8" // default slate
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff"
        }
      });

      // Add popup on click
      map.on("click", "missions-circle", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties;
        const coordinates = (feature.geometry as any).coordinates.slice();
        
        let content = `<div style="font-family:sans-serif; padding:4px;">`;
        if (props.mission === "properti") {
          content += `<strong style="font-size:14px;display:block;margin-bottom:4px;">Properti: ${props.jenis_properti || '-'}</strong>`;
          content += `<p style="margin:0;font-size:12px;color:#666;">Kategori: ${props.kategori_properti || '-'}</p>`;
          if (props.foto_tampak_depan) {
             content += `<img src="${props.foto_tampak_depan}" style="width:100%;height:100px;object-fit:cover;margin-top:8px;border-radius:4px;"/>`;
          }
        } else if (props.mission === "menu") {
          content += `<strong style="font-size:14px;display:block;margin-bottom:4px;">${props.nama_tempat || '-'}</strong>`;
          content += `<p style="margin:0;font-size:12px;color:#666;">Menu: ${props.menu_utama || '-'}</p>`;
          if (props.foto_tempat) {
             content += `<img src="${props.foto_tempat}" style="width:100%;height:100px;object-fit:cover;margin-top:8px;border-radius:4px;"/>`;
          }
        } else if (props.mission === "struk") {
          content += `<strong style="font-size:14px;display:block;margin-bottom:4px;">${props.nama_tempat || '-'}</strong>`;
          content += `<p style="margin:0;font-size:12px;color:#666;">Tipe: ${props.kategori_tempat || '-'} (Struk)</p>`;
          if (props.foto_struk) {
             content += `<img src="${props.foto_struk}" style="width:100%;height:100px;object-fit:cover;margin-top:8px;border-radius:4px;"/>`;
          }
        }
        content += `</div>`;

        const maplibregl = (window as any).maplibregl;
        new maplibregl.Popup({ offset: 10, closeButton: false })
          .setLngLat(coordinates as [number, number])
          .setHTML(content)
          .addTo(map);
      });

      map.on("mouseenter", "missions-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "missions-circle", () => {
        map.getCanvas().style.cursor = "";
      });
    }

    if (map.getLayer("missions-circle")) {
      map.setLayoutProperty("missions-circle", "visibility", tampilkanMissions ? "visible" : "none");
    }
  }, [ready, missions, tampilkanMissions]);



  return (
    <MapLibreMap
      onReady={handleReady}
      className={cn(fill ? "h-full" : "aspect-[4/3]", className)}
    />
  );
}

/** Build the koridor LineString GeoJSON layer connecting each corridor's kawasan. */
async function addKoridorLayer(map: MLMap, kawasan: Kawasan[], visible: boolean) {
  if (map.getSource("koridor")) return;
  
  const url = await getSecureAssetUrl("rute-kereta-jawa.geojson");
  if (!url) return;

  map.addSource("koridor", {
    type: "geojson",
    data: url,
  });
  
  map.addLayer({
    id: "koridor-line",
    type: "line",
    source: "koridor",
    layout: { visibility: visible ? "visible" : "none" },
    paint: {
      "line-color": "#3b82f6", // Warna biru rute transit
      "line-width": 3,
      "line-opacity": 0.8,
    },
  });
}

async function addSensusLayer(map: MLMap, visible: boolean) {
  if (map.getSource("sensus")) return;
  const url = await getSecureAssetUrl("sensus-penduduk-kawasan.geojson");
  if (!url) return;

  map.addSource("sensus", {
    type: "geojson",
    data: url,
  });
  
  // Base polygon fill layer
  map.addLayer({
    id: "sensus-fill",
    type: "fill",
    source: "sensus",
    layout: { visibility: visible ? "visible" : "none" },
    paint: {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["get", "SKOR TOTAL"],
        11.8, "#fef0d9",
        12.5, "#fdcc8a",
        13.0, "#fc8d59",
        13.4, "#d7301f"
      ],
      "fill-opacity": 0.5,
    },
  }, "koridor-line"); // place below koridor-line
  
  // Outline layer
  map.addLayer({
    id: "sensus-outline",
    type: "line",
    source: "sensus",
    layout: { visibility: visible ? "visible" : "none" },
    paint: {
      "line-color": "#ffffff",
      "line-width": 1,
      "line-opacity": 0.6,
    },
  }, "koridor-line");
}

async function addAngkotLayer(map: MLMap, visible: boolean) {
  if (map.getSource("angkot")) return;
  const url = await getSecureAssetUrl("rute-angkot-bandung-micro.geojson");
  if (!url) return;

  map.addSource("angkot", {
    type: "geojson",
    data: url,
  });
  
  map.addLayer({
    id: "angkot-line",
    type: "line",
    source: "angkot",
    layout: { visibility: visible ? "visible" : "none" },
    paint: {
      "line-color": "#f59e0b", // Amber/Orange color for local transit
      "line-width": 1.5,
      "line-opacity": 0.5,
    },
  }, "koridor-line");
}

async function addBusLayer(map: MLMap, visible: boolean) {
  if (map.getSource("bus")) return;
  const url = await getSecureAssetUrl("rute-bus-bandung.geojson");
  if (!url) return;

  map.addSource("bus", {
    type: "geojson",
    data: url,
  });
  
  map.addLayer({
    id: "bus-line",
    type: "line",
    source: "bus",
    layout: { visibility: visible ? "visible" : "none" },
    paint: {
      "line-color": "#10b981", // Emerald green for BRT/Bus
      "line-width": 2,
      "line-opacity": 0.7,
    },
  }, "koridor-line");
}

async function addPoiLayer(map: MLMap) {
  if (map.getSource("poi")) return;
  const url = await getSecureAssetUrl("poi-fasilitas.geojson");
  if (!url) return;

  map.addSource("poi", {
    type: "geojson",
    data: url,
  });
  
  const colorMatch: any = [
    "match",
    ["get", "kategori"],
    "Pendidikan", "#3b82f6",
    "Kesehatan", "#ef4444",
    "Komersial", "#eab308",
    "Hiburan & Makanan", "#ec4899",
    "Transit", "#8b5cf6",
    "#9ca3af" // default
  ];

  map.addLayer({
    id: "poi-points",
    type: "circle",
    source: "poi",
    filter: ["==", ["geometry-type"], "Point"],
    layout: { visibility: "none" },
    paint: {
      "circle-radius": 4,
      "circle-color": colorMatch,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff"
    },
  });

  map.addLayer({
    id: "poi-polygons",
    type: "fill",
    source: "poi",
    filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
    layout: { visibility: "none" },
    paint: {
      "fill-color": colorMatch,
      "fill-opacity": 0.6,
      "fill-outline-color": "#ffffff"
    },
  });
}

async function addPedestrianLayer(map: MLMap, visible: boolean) {
  if (map.getSource("pedestrian")) return;
  const url = await getSecureAssetUrl("infrastruktur-pedestrian.geojson");
  if (!url) return;

  map.addSource("pedestrian", {
    type: "geojson",
    data: url,
  });
  
  map.addLayer({
    id: "pedestrian-line",
    type: "line",
    source: "pedestrian",
    layout: { visibility: visible ? "visible" : "none" },
    paint: {
      "line-color": "#06b6d4", // Cyan
      "line-width": 1.5,
      "line-dasharray": [2, 2]
    },
  }, "koridor-line");
}



/** Update the DOM of every marker to reflect the current score/selection. */
function renderAllMarkers(
  markers: Map<string, HTMLButtonElement>,
  kawasan: Kawasan[],
  props: { role: RoleId; layer: ComponentId | "total"; selectedId: string | null; tampilkanAnomali: boolean; compact: boolean },
) {
  for (const k of kawasan) {
    const el = markers.get(k.id);
    if (!el) continue;
    const skor = props.layer === "total" ? hitungSkor(k, props.role) : k.skor[props.layer];
    const aktif = props.selectedId === k.id;
    const opacity = props.tampilkanAnomali && k.anomali ? 1 : 0.65;
    const fontSize = (props.compact ? 15 : 22) + (skor / 100) * (props.compact ? 7 : 12);
    el.style.color = warnaSkor(skor);
    el.style.fontSize = `${fontSize}px`;
    el.classList.toggle("is-active", aktif);
    el.setAttribute("aria-label", `${k.nama}, skor ${skor}`);
    el.innerHTML =
      `<img src="${aiStar.url}" alt="" class="vm-star" style="opacity:${opacity}">` +
      `<span class="vm-num">${skor}</span>` +
      `<span class="vm-tip">${k.nama} · ${kelasSkor(skor).label}</span>`;
  }
}
