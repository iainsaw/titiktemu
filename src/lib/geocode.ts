/**
 * Geocoding service menggunakan Nominatim (OpenStreetMap).
 * Gratis, tanpa API key, rate limit 1 req/detik.
 */

export type GeoResult = {
  lat: number;
  lng: number;
  displayName: string;
};

// Bounding box Bandung Raya (viewbox: lon_min, lat_min, lon_max, lat_max)
const BANDUNG_VIEWBOX = "107.2,−7.2,107.9,−6.7";

/**
 * Geocode nama tempat menjadi koordinat.
 * Dibatasi di area Bandung Raya agar hasilnya relevan.
 * Mengembalikan null jika tidak ditemukan.
 */
export async function geocode(query: string): Promise<GeoResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    viewbox: "107.2,-7.2,107.9,-6.7",
    bounded: "1",
  });

  const url = `https://nominatim.openstreetmap.org/search?${params}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "TitikTemu-WebGIS/1.0 (hackathon project)",
    },
  });

  if (!response.ok) {
    throw new Error("Gagal menghubungi layanan geocoding");
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    return null;
  }

  const result = data[0];
  const displayName = result.display_name;
  
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: displayName,
  };
}
