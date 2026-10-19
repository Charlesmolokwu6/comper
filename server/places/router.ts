/**
 * Address search for the cab tab: GET /api/places?q=lekki phase 1
 *
 * Proxies OpenStreetMap Nominatim, limited to Nigeria, with an identifying User-Agent, at most
 * one request a second (their usage policy) and a day-long cache, so the browser never calls
 * Nominatim directly.
 */
import { Router } from "express";
import { knownMatches, type Place } from "./known";

export { knownMatches, type Place };

export const placesRouter = Router();

const UA =
  "CompareNG/1.0 (transport price comparison; charlesmolokwu6@gmail.com)";
const TTL_MS = 24 * 3600_000;
const cache = new Map<string, { at: number; places: Place[] }>();
let last = 0;
let queue: Promise<unknown> = Promise.resolve();

/** One request at a time, at least 1.1 s apart. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    last = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

export function toPlaces(json: any[]): Place[] {
  return (json ?? [])
    .map(r => {
      const parts = String(r.display_name ?? "").split(", ");
      return {
        name: String(r.name || parts[0] || "").trim(),
        address: parts.slice(1, 4).join(", "),
        lat: Number(r.lat),
        lon: Number(r.lon),
      };
    })
    .filter(p => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

placesRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "")
    .trim()
    .slice(0, 100);
  if (q.length < 3) return res.json({ places: [] });
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS)
    return res.json({ places: hit.places });
  try {
    const url = (query: string) =>
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: query,
        countrycodes: "ng",
        format: "jsonv2",
        limit: "6",
        "accept-language": "en",
      });
    const search = (query: string) =>
      throttled(async () => {
        const r = await fetch(url(query), {
          headers: { "User-Agent": UA, Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!r.ok) throw new Error(`address search returned HTTP ${r.status}`);
        return toPlaces(await r.json());
      });
    let found = await search(q);
    // OpenStreetMap is literal: "Murtala Muhammed International Airport" finds nothing where
    // "Murtala Muhammed Airport" does. Retry once without the filler words.
    const shorter = q
      .replace(/\b(international|the|of|and)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!found.length && shorter !== q) found = await search(shorter);
    const local = knownMatches(q);
    const places = [
      ...local,
      ...found.filter(
        f =>
          !local.some(
            l => Math.abs(l.lat - f.lat) + Math.abs(l.lon - f.lon) < 0.002
          )
      ),
    ].slice(0, 6);
    cache.set(key, { at: Date.now(), places });
    res.json({ places });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

/** A phone's GPS point as people say it: street first, then area, town and state. */
export function toReverse(json: any, lat: number, lon: number) {
  const a = json?.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const name =
    street || json?.name || a.neighbourhood || a.suburb || a.quarter || "";
  const town = a.city || a.town || a.village || a.county || "";
  const area = a.suburb || a.neighbourhood || a.quarter || town || null;
  const address = [
    a.suburb !== name ? a.suburb : null,
    town !== name ? town : null,
    String(a.state ?? "").replace(/ State$/, "") || null,
  ]
    .filter(Boolean)
    .join(", ");
  if (!name) return null;
  return { name, area, address, lat, lon };
}

const reverseCache = new Map<
  string,
  { at: number; body: NonNullable<ReturnType<typeof toReverse>> }
>();

const inNigeria = (lat: number, lon: number) =>
  lat > 4 && lat < 14 && lon > 2.6 && lon < 14.7;

/** GET /api/places/reverse?lat=6.45&lon=3.47: the address at a point (Nominatim reverse). */
placesRouter.get("/reverse", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inNigeria(lat, lon))
    return res
      .status(400)
      .json({ error: "lat and lon must be a point in Nigeria" });
  // ~11 m: close enough to name the street, and repeat lookups hit the cache.
  const key = `rev:${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = reverseCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return res.json(hit.body);
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse?" +
      new URLSearchParams({
        lat: lat.toFixed(5),
        lon: lon.toFixed(5),
        format: "jsonv2",
        zoom: "18",
        "accept-language": "en",
      });
    const json = await throttled(async () => {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error(`address lookup returned HTTP ${r.status}`);
      return r.json();
    });
    const place = toReverse(json, lat, lon);
    if (!place) return res.status(404).json({ error: "No address found here" });
    reverseCache.set(key, { at: Date.now(), body: place });
    res.json(place);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});
