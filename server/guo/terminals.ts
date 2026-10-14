/**
 * GUO terminal locations, for "nearest terminal" lookups from the user's GPS.
 *
 * GUO publishes Latitude/Longitude for each terminal on guotransport.com/terminals,
 * but some entries are wrong (copy-pasted from another terminal, or 0,0). Those are
 * corrected below from OpenStreetMap/Nominatim geocodes of the terminal's address.
 *
 * The data ships as a snapshot (data/terminals.json) so lookups never depend on
 * GUO being up. Regenerate it with `pnpm guo:terminals`.
 */
import snapshot from "./data/terminals.json";

export interface GuoTerminal {
  id: string;
  name: string;
  state: string;
  address: string;
  phone: string;
  lat: number;
  lon: number;
  /** "guo" = GUO's own coordinates; "osm" = corrected via OpenStreetMap geocoding. */
  coordSource: "guo" | "osm";
  /** True if GUO accepts online bookings departing from this terminal. */
  bookable: boolean;
  mapUrl: string | null;
}

export const terminals: GuoTerminal[] = snapshot as GuoTerminal[];

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Straight-line nearest terminals to a point; only bookable ones unless `includeAll`. */
export function nearestTerminals(
  lat: number,
  lon: number,
  limit = 5,
  includeAll = false
) {
  return terminals
    .filter(t => includeAll || t.bookable)
    .map(t => ({
      ...t,
      distanceKm: Math.round(haversineKm(lat, lon, t.lat, t.lon) * 10) / 10,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
