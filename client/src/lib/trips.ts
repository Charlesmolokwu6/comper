/**
 * Saved trips for "My trip": the route, the towns along it and the map around it, kept on
 * the phone so the trip can be followed with no network (GPS works without one). Nothing
 * here is sent to our server: positions stay on the device.
 */
import { fetchRoute, type ComparedTrip } from "./api";
import { allCentres, centreOf } from "./cityCentres";
import { distanceKm, type LatLon } from "./geo";
import { prettyStop } from "./format";

export interface Place extends LatLon {
  name: string;
}

/** A Book tap we may ask about later ("Did you book?"). */
export interface PendingBooking {
  operator: string;
  operatorName: string;
  from: Place;
  to: Place;
  /** "YYYY-MM-DD HH:mm", Lagos time. */
  departure: string;
  fare: number;
  bookingUrl: string;
  tappedAt: number;
}

export interface Town extends Place {
  /** Km along the route from the start. */
  at: number;
}

export interface SavedTrip extends PendingBooking {
  id: string;
  /** [lat, lon] along the road. */
  line: [number, number][];
  km: number;
  towns: Town[];
  /** Map files saved for offline use (cache keys), so deleting the trip can free them. */
  tiles: string[];
  savedAt: number;
}

const PENDING_KEY = "compare.pendingBooking";
const TRIPS_KEY = "compare.trips";
export const MAP_CACHE = "compare-map-v1";

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the feature quietly does less.
  }
};

/** Remember a Book tap on a bus trip, to ask "Did you book?" when they come back. */
export function rememberBooking(t: ComparedTrip) {
  const place = (s: ComparedTrip["from"]): Place | null => {
    const at =
      s.lat != null && s.lon != null
        ? { lat: s.lat, lon: s.lon }
        : centreOf(s.city);
    return at ? { name: prettyStop(s.name), lat: at.lat, lon: at.lon } : null;
  };
  const from = place(t.from);
  const to = place(t.to);
  if (!from || !to) return;
  write(PENDING_KEY, {
    operator: t.operator,
    operatorName: t.operatorName,
    from,
    to,
    departure: t.departure,
    fare: t.fare,
    bookingUrl: t.bookingUrl,
    tappedAt: Date.now(),
  } satisfies PendingBooking);
}

/** The Book tap to ask about: at least 20 s old (they went to book) and under a day. */
export function pendingBooking(now = Date.now()): PendingBooking | null {
  const p = read<PendingBooking | null>(PENDING_KEY, null);
  if (!p) return null;
  const age = now - p.tappedAt;
  if (age > 24 * 3600_000) {
    write(PENDING_KEY, null);
    return null;
  }
  return age >= 20_000 ? p : null;
}

export const clearPendingBooking = () => write(PENDING_KEY, null);

export const savedTrips = (): SavedTrip[] =>
  read<SavedTrip[]>(TRIPS_KEY, []).sort((a, b) =>
    a.departure.localeCompare(b.departure)
  );

export const savedTrip = (id: string) =>
  savedTrips().find(t => t.id === id) ?? null;

// ---- Route geometry -------------------------------------------------------------------

const toXY = (p: LatLon, lat0: number) => {
  // Equirectangular km, accurate enough over a few hundred km for "how far along".
  const k = (Math.PI / 180) * 6371;
  return { x: p.lon * k * Math.cos((lat0 * Math.PI) / 180), y: p.lat * k };
};

/**
 * Where a point is along a route: km from the start of the nearest point on the line, and
 * how far off the line it is.
 */
export function alongRoute(line: [number, number][], p: LatLon) {
  if (line.length < 2) return { at: 0, off: Infinity };
  const lat0 = line[0][0];
  const P = toXY(p, lat0);
  let best = { at: 0, off: Infinity };
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const a = { lat: line[i - 1][0], lon: line[i - 1][1] };
    const b = { lat: line[i][0], lon: line[i][1] };
    const A = toXY(a, lat0);
    const B = toXY(b, lat0);
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len2 = dx * dx + dy * dy;
    const t = len2
      ? Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2))
      : 0;
    const off = Math.hypot(A.x + t * dx - P.x, A.y + t * dy - P.y);
    const seg = Math.sqrt(len2);
    if (off < best.off) best = { at: walked + t * seg, off };
    walked += seg;
  }
  return best;
}

/** Length of a route line in km (same measure as alongRoute). */
export function lineKm(line: [number, number][]) {
  let km = 0;
  for (let i = 1; i < line.length; i++)
    km += distanceKm(
      { lat: line[i - 1][0], lon: line[i - 1][1] },
      { lat: line[i][0], lon: line[i][1] }
    );
  return km;
}

/** Towns the road passes within `withinKm` of, in the order you reach them. */
export function townsAlong(
  line: [number, number][],
  towns: Place[],
  withinKm = 15
): Town[] {
  const total = alongRoute(line, {
    lat: line[line.length - 1][0],
    lon: line[line.length - 1][1],
  }).at;
  return towns
    .map(t => ({ ...t, ...alongRoute(line, t) }))
    .filter(t => t.off <= withinKm && t.at > 3 && t.at < total - 3)
    .sort((a, b) => a.at - b.at)
    .map(({ name, lat, lon, at }) => ({ name, lat, lon, at }));
}

// ---- Offline map ------------------------------------------------------------------------

/** The slippy-map tile a point falls in. */
export function tileOf(p: LatLon, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((p.lon + 180) / 360) * n);
  const r = (p.lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  );
  return {
    x: Math.min(n - 1, Math.max(0, x)),
    y: Math.min(n - 1, Math.max(0, y)),
  };
}

/**
 * Map tiles covering a strip along the route: wide and coarse for the overview, narrow and
 * detailed close up. About 300–500 tiles for a 450 km trip.
 */
export function corridorTiles(line: [number, number][], minZ = 5, maxZ = 12) {
  const out = new Set<string>();
  for (let z = minZ; z <= maxZ; z++) {
    const pad = z <= 9 ? 1 : 0;
    // Sample the line densely enough not to skip a tile at this zoom.
    const step = Math.max(0.5, 40075 / 2 ** z / 3);
    let carry = Infinity;
    for (let i = 0; i < line.length; i++) {
      const p = { lat: line[i][0], lon: line[i][1] };
      if (i > 0)
        carry += distanceKm({ lat: line[i - 1][0], lon: line[i - 1][1] }, p);
      if (carry < step && i !== line.length - 1) continue;
      carry = 0;
      const { x, y } = tileOf(p, z);
      for (let dx = -pad; dx <= pad; dx++)
        for (let dy = -pad; dy <= pad; dy++)
          out.add(`${z}/${x + dx}/${y + dy}`);
    }
  }
  return Array.from(out);
}

/** Cache key for a map tile, the same whichever map version the tile came from (sw.js). */
export const tileKey = (zxy: string) =>
  `https://tiles.openfreemap.org/__offline/${zxy}.pbf`;

const FONTS = ["Noto Sans Regular", "Noto Sans Bold", "Noto Sans Italic"];
// Latin, Latin-1, combining accents and Vietnamese/Yoruba-style accented letters.
const RANGES = ["0-255", "256-511", "768-1023", "7680-7935"];

/**
 * Save a trip for offline use: road route, towns along it, and the map around it.
 * `onProgress` gets 0–1. Needs a network connection.
 */
export async function saveTrip(
  b: PendingBooking,
  onProgress: (f: number) => void = () => {}
): Promise<SavedTrip> {
  const route = await fetchRoute(b.from, b.to);
  const line = route.line;
  const towns = townsAlong(
    line,
    allCentres().filter(c => c.name !== b.from.name && c.name !== b.to.name)
  );
  const zxy = corridorTiles(line);
  const tiles: string[] = [];
  if ("caches" in window) {
    const cache = await caches.open(MAP_CACHE);
    // The map's index points at the current tile version; keep a copy for offline starts.
    const index = await fetch("https://tiles.openfreemap.org/planet");
    const json = await index.clone().json();
    await cache.put("https://tiles.openfreemap.org/planet", index);
    const template: string = json.tiles[0];
    for (const f of FONTS)
      for (const r of RANGES) {
        const url = `https://tiles.openfreemap.org/fonts/${encodeURIComponent(f)}/${r}.pbf`;
        if (!(await cache.match(url))) await cache.add(url).catch(() => {});
      }
    let done = 0;
    const queue = zxy.slice();
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const key = tileKey(item);
        tiles.push(key);
        if (!(await cache.match(key))) {
          const [z, x, y] = item.split("/");
          const res = await fetch(
            template.replace("{z}", z).replace("{x}", x).replace("{y}", y)
          ).catch(() => null);
          if (res?.ok) await cache.put(key, res);
        }
        onProgress(++done / zxy.length);
      }
    };
    // A few at a time: quick on a phone, gentle on the free map service.
    await Promise.all([worker(), worker(), worker(), worker()]);
  }
  const trip: SavedTrip = {
    ...b,
    id: `${b.operator}-${b.departure.replace(/\D/g, "")}-${Date.now().toString(36)}`,
    line,
    km: route.km,
    towns,
    tiles,
    savedAt: Date.now(),
  };
  write(TRIPS_KEY, [...read<SavedTrip[]>(TRIPS_KEY, []), trip]);
  return trip;
}

/** Delete a trip and the map pieces no other saved trip needs. */
export async function deleteTrip(id: string) {
  const all = read<SavedTrip[]>(TRIPS_KEY, []);
  const gone = all.find(t => t.id === id);
  const rest = all.filter(t => t.id !== id);
  write(TRIPS_KEY, rest);
  if (!gone || !("caches" in window)) return;
  const keep = new Set(rest.flatMap(t => t.tiles));
  const cache = await caches.open(MAP_CACHE);
  await Promise.all(
    gone.tiles.filter(k => !keep.has(k)).map(k => cache.delete(k))
  );
}
