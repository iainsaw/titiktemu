// Server-only: fetch MAPID basemap style JSON and ensure the API key is
// present on every referenced URL (tiles, sprite, glyphs). Kept server-side
// so the key never lands in the client bundle.
//
// Reads the secret inside the function body (env injected at request time).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchMapidStyle(): Promise<Record<string, any> | null> {
  const key = process.env["MAPID_API_KEY"];
  if (!key) return null;

  const url = `https://v2.basemap.mapid.io/styles/street-v2.0/style.json?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`MAPID style fetch failed: ${res.status} ${res.statusText}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style = (await res.json()) as Record<string, any>;
  injectKey(style, key);
  return style;
}

/** Append ?key= to style-referenced URLs that don't already carry it. */
function injectKey(style: Record<string, unknown>, key: string): void {
  const ensure = (u: unknown): unknown => {
    if (typeof u !== "string") return u;
    if (/[?&]key=/.test(u)) return u;
    return u + (u.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(key);
  };

  const sources = style.sources as
    Record<string, { tiles?: unknown[]; data?: unknown; url?: unknown }> | undefined;
  if (sources) {
    for (const s of Object.values(sources)) {
      if (Array.isArray(s.tiles)) s.tiles = s.tiles.map((t) => ensure(t));
      if (typeof s.data !== "undefined") s.data = ensure(s.data);
      if (typeof s.url !== "undefined") s.url = ensure(s.url);
    }
  }
  if (typeof style.sprite === "string") style.sprite = ensure(style.sprite) as string;
  if (typeof style.glyphs === "string") style.glyphs = ensure(style.glyphs) as string;
}
