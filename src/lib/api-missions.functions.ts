import { createServerFn } from "@tanstack/react-start";
import { fetchMAPIDMission } from "./api-missions";

export const fetchAllMAPIDMissionsFn = createServerFn({ method: "POST" })
  .validator((data: { polygon: any }) => data)
  .handler(async ({ data: { polygon } }) => {
    const apiKey = process.env.MAPID_API_KEY;
    if (!apiKey) {
      throw new Error("Missing MAPID_API_KEY");
    }

    const [properti, menu, struk] = await Promise.all([
      fetchMAPIDMission("propertigo", polygon, apiKey),
      fetchMAPIDMission("menugo", polygon, apiKey),
      fetchMAPIDMission("struckgo", polygon, apiKey),
    ]);

    const tagMission = (features: any[], type: string) => features.map(f => {
      f.properties = f.properties || {};
      f.properties.mission = type;
      return f;
    });

    return { 
      properti: tagMission(properti, "properti"), 
      menu: tagMission(menu, "menu"), 
      struk: tagMission(struk, "struk") 
    };
  });
