export type MissionFeature = {
  _id: string;
  mission: string;
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  key: string;
  properties: Record<string, any>;
};

export function createCirclePolygon(
  centerLng: number,
  centerLat: number,
  radiusMeters: number = 800,
) {
  const points = 32;
  const coords: [number, number][] = [];
  const km = radiusMeters / 1000;

  const distanceX = km / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }
  coords.push(coords[0]);

  return {
    type: "Polygon",
    coordinates: [coords],
  };
}

export function createBandungBoundingBox() {
  // Approximate bounding box of Bandung city
  // minLng, minLat, maxLng, maxLat
  const minLng = 107.5;
  const minLat = -6.98;
  const maxLng = 107.75;
  const maxLat = -6.85;

  return {
    type: "Polygon",
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

export async function fetchMAPIDMission(
  missionType: "propertigo" | "menugo" | "struckgo",
  polygon: any,
  apiKey: string,
): Promise<MissionFeature[]> {
  let allFeatures: MissionFeature[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await fetch(`https://server.mapid.io/web/competition/${missionType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          feature: polygon,
          offset,
        }),
      });

      if (!res.ok) {
        console.error(`Failed to fetch ${missionType}`, await res.text());
        break;
      }

      const data = await res.json();

      if (data.success && data.features) {
        allFeatures = allFeatures.concat(data.features);
      }

      if (data.pagination && data.pagination.hasMore) {
        offset += data.pagination.limit || 100;
      } else {
        hasMore = false;
      }
    } catch (err) {
      console.error(`Error fetching ${missionType}`, err);
      break;
    }
  }

  return allFeatures;
}

export async function fetchAllMAPIDMissions(polygon: any, apiKey: string) {
  const [properti, menu, struk] = await Promise.all([
    fetchMAPIDMission("propertigo", polygon, apiKey),
    fetchMAPIDMission("menugo", polygon, apiKey),
    fetchMAPIDMission("struckgo", polygon, apiKey),
  ]);

  return { properti, menu, struk };
}
