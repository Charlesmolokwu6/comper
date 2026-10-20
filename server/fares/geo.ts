/**
 * Approximate stop locations, for suggesting the boarding point nearest the traveller.
 * Data: server/fares/data/areas.json (GUO's published terminal coordinates where they
 * match, otherwise OpenStreetMap). Places we couldn't confirm are left unknown.
 */
import areas from "./data/areas.json";
import type { CityMatch } from "./cities";

interface Point {
  lat: number;
  lon: number;
}

const STOPS = areas.stops as Record<
  string,
  Record<string, Point & { source: string }>
>;
const HOODS = areas.neighbourhoods as Record<
  string,
  { name: string; lat: number; lon: number }[]
>;

/** Location of a stop from its matched district, or null when unknown. */
export function stopLocation(
  m: Pick<CityMatch, "city" | "area">
): Point | null {
  const p = m.area ? STOPS[m.city]?.[m.area] : undefined;
  return p ? { lat: p.lat, lon: p.lon } : null;
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, c => c.toUpperCase());

/**
 * Places a traveller can say they're near, for one city: common neighbourhoods plus the
 * districts operators board from. Deduplicated by name.
 */
export function placesNear(city: string) {
  const out = new Map<string, { name: string; lat: number; lon: number }>();
  for (const h of HOODS[city] ?? []) out.set(h.name.toLowerCase(), h);
  for (const [alias, p] of Object.entries(STOPS[city] ?? {})) {
    if (
      /^(maza ?maza|first gate|mile2|ojo alaba|iyana school|maraba|cele|bolade)$/.test(
        alias
      )
    )
      continue;
    const name = titleCase(alias);
    if (!out.has(name.toLowerCase()))
      out.set(name.toLowerCase(), { name, lat: p.lat, lon: p.lon });
  }
  return Array.from(out.values()).sort((a, b) => a.name.localeCompare(b.name));
}
