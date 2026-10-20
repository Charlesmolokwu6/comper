/**
 * Builds the terminal list from GUO's /terminals page and fixes its bad coordinates.
 * Used by scripts/guo-terminals.ts to (re)generate data/terminals.json.
 */
import type { GuoRoute } from "./client";
import type { GuoTerminal } from "./terminals";

/**
 * Corrections for coordinates GUO gets wrong. Values are Nominatim (OpenStreetMap)
 * results for the terminal's address, or its town when the street isn't in OSM.
 */
export const COORD_OVERRIDES: Record<
  string,
  { lat: number; lon: number; note: string }
> = {
  // GUO lists Aba's coordinates for Uyo.
  "113": { lat: 5.0355651, lon: 7.9256373, note: "Ikot Ekpene Road, Uyo" },
  // GUO lists Asaba's coordinates for Benin.
  "106": { lat: 6.400298, lon: 5.6100941, note: "Ugbowo, Benin City" },
  // GUO lists Lagos Island coordinates for Ikorodu and Ikosi-Ketu.
  "114": { lat: 6.6234109, lon: 3.504798, note: "Sagamu Road, Ikorodu" },
  "117": { lat: 6.5928001, lon: 3.3917483, note: "Ketu, Kosofe, Lagos" },
  // GUO lists 0,0.
  "70": { lat: 6.527803, lon: 8.6878448, note: "Ogoja town" },
  "100": { lat: 5.8837902, lon: 7.9372068, note: "Afikpo town" },
};

/** Bookable on GUO but missing from its /terminals page; town-level location only. */
export const EXTRA_TERMINALS: Record<
  string,
  { name: string; state: string; lat: number; lon: number }
> = {
  "13": { name: "GOMBE", state: "GOMBE", lat: 10.2822161, lon: 11.1629771 },
};

const inNigeria = (lat: number, lon: number) =>
  lat > 4 && lat < 14 && lon > 2.6 && lon < 14.7;

export function buildTerminals(
  raw: any[],
  routes: GuoRoute[]
): { terminals: GuoTerminal[]; warnings: string[] } {
  const bookable = new Set(routes.map(r => r.terminalId));
  const warnings: string[] = [];
  const out: GuoTerminal[] = [];

  for (const t of raw) {
    // Ghana terminals are disabled on GUO and out of scope for a Nigeria app.
    if (t.Country && String(t.Country).toUpperCase() !== "NIGERIA") continue;
    const id = String(t.LoadinID);
    const fix = COORD_OVERRIDES[id];
    const lat = fix ? fix.lat : Number(t.Latitude);
    const lon = fix ? fix.lon : Number(t.Longitude);
    out.push({
      id,
      name: t.Loading_Office,
      state: t.StateName,
      address: String(t.Address ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      phone: String(t.Phone1 ?? "").trim(),
      lat,
      lon,
      coordSource: fix ? "osm" : "guo",
      bookable: bookable.has(id),
      mapUrl: String(t.gmap ?? "").trim() || null,
    });
  }

  for (const [id, e] of Object.entries(EXTRA_TERMINALS)) {
    if (out.some(t => t.id === id)) continue;
    out.push({
      id,
      name: e.name,
      state: e.state,
      address: "",
      phone: "",
      lat: e.lat,
      lon: e.lon,
      coordSource: "osm",
      bookable: bookable.has(id),
      mapUrl: null,
    });
  }

  // Flag anything still suspicious so a new GUO data error gets noticed on regeneration.
  for (const t of out) {
    if (!inNigeria(t.lat, t.lon))
      warnings.push(
        `${t.id} ${t.name}: coordinates ${t.lat},${t.lon} outside Nigeria`
      );
    const twin = out.find(
      o => o !== t && o.lat === t.lat && o.lon === t.lon && o.state !== t.state
    );
    if (twin && t.coordSource === "guo")
      warnings.push(
        `${t.id} ${t.name}: same coordinates as ${twin.name} (${twin.state})`
      );
  }
  for (const r of routes) {
    if (!out.some(t => t.id === r.terminalId))
      warnings.push(
        `bookable terminal ${r.terminalId} ${r.terminalName} has no location`
      );
  }

  out.sort(
    (a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name)
  );
  return { terminals: out, warnings };
}
