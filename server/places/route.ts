/**
 * Road route between two points for the cab tab's map: GET /api/places/route?from=lat,lon&to=lat,lon
 *
 * Proxies the public OSRM demo server (router.project-osrm.org), Nigeria only, one request a
 * second and a day-long cache, so the browser never calls it directly. Returns the road
 * distance and the line to draw; no times or prices.
 */
import { Router } from "express";

export const routeRouter = Router();

const UA =
  "CompareNG/1.0 (transport price comparison; charlesmolokwu6@gmail.com)";
const TTL_MS = 24 * 3600_000;
const MAX_POINTS = 400;
const cache = new Map<string, { at: number; body: RouteBody }>();
let last = 0;
let queue: Promise<unknown> = Promise.resolve();

export interface RouteBody {
  km: number;
  /** [lat, lon] pairs along the road. */
  line: [number, number][];
}

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

/** "6.5095,3.3792" → [6.5095, 3.3792] when it lies in (roughly) Nigeria, else null. */
export function parsePoint(v: unknown): [number, number] | null {
  const [lat, lon] = String(v ?? "")
    .split(",")
    .map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 4 || lat > 14 || lon < 2.5 || lon > 15) return null;
  return [Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4];
}

/** Keeps every nth point (and the last) so long routes stay light to send and draw. */
export function thin<T>(points: T[], max = MAX_POINTS): T[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out = points.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== points[points.length - 1])
    out.push(points[points.length - 1]);
  return out;
}

routeRouter.get("/", async (req, res) => {
  const from = parsePoint(req.query.from);
  const to = parsePoint(req.query.to);
  if (!from || !to)
    return res
      .status(400)
      .json({ error: "from and to must be lat,lon points in Nigeria" });
  const key = `${from}|${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return res.json(hit.body);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const json: any = await throttled(async () => {
      const r = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) throw new Error(`route service returned HTTP ${r.status}`);
      return r.json();
    });
    const route = json?.routes?.[0];
    if (json?.code !== "Ok" || !route)
      return res.status(404).json({ error: "No road route found" });
    const body: RouteBody = {
      km: Math.round(route.distance / 100) / 10,
      line: thin(
        (route.geometry.coordinates as [number, number][]).map(
          ([lon, lat]) => [lat, lon] as [number, number]
        )
      ),
    };
    cache.set(key, { at: Date.now(), body });
    res.json(body);
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Route lookup failed" });
  }
});
