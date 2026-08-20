import { createServerFn } from "@tanstack/react-start";
import { fetchMapidStyle } from "./mapid.server";

/**
 * Returns the MAPID street-v2.0 style object (with the API key injected into
 * every source URL) or `null` when the MAPID_API_KEY secret is not configured.
 *
 * Thin wrapper — all runtime logic lives in mapid.server.ts.
 */
export const getMapidStyle = createServerFn({ method: "GET" }).handler(async () => {
  return fetchMapidStyle();
});
