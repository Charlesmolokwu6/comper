/** Straight-line distances for "nearest terminal". Locations are approximate, so are these. */

export interface LatLon {
  lat: number;
  lon: number;
}

export function distanceKm(a: LatLon, b: LatLon): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** "about 3 km" — rounded, because both ends are approximate. */
export function formatDistance(km: number): string {
  if (km < 1) return "under 1 km";
  return `about ${km < 30 ? Math.round(km) : Math.round(km / 5) * 5} km`;
}
