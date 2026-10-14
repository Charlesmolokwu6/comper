/**
 * Cached GUO fares. User requests are served from this store; GUO is only contacted by
 *   - the scheduled scrape of popular routes (every GUO_SCRAPE_INTERVAL_HOURS), and
 *   - a one-off fetch the first time an uncached route/date is asked for, or a
 *     background refresh when a cached entry has gone stale.
 * All GUO calls go through one queue with a minimum gap between requests.
 *
 * Env:
 *   GUO_SCRAPE_ROUTES          "terminalId:destinationId,…" (default: Lagos → Abuja/Enugu/Onitsha/Owerri/Aba)
 *   GUO_SCRAPE_DAYS_AHEAD      days to scrape starting tomorrow (default 7)
 *   GUO_SCRAPE_INTERVAL_HOURS  (default 6; 0 disables the schedule)
 *   GUO_FARE_TTL_HOURS         after this an entry is refreshed in the background (default 6)
 *   GUO_FARE_MAX_AGE_HOURS     after this a stale entry is no longer served (default 48)
 *   GUO_REQUEST_GAP_MS         minimum gap between requests to GUO (default 3000)
 *   GUO_FARE_CACHE_FILE        JSON file the cache persists to (default .cache/guo-fares.json)
 */
import fs from "node:fs";
import path from "node:path";
import {
  fetchFares,
  fetchRoutes,
  type GuoFareResult,
  type GuoRoute,
} from "./client";

const HOUR = 3_600_000;
const num = (v: string | undefined, d: number) =>
  v === undefined || v === "" ? d : Number(v);

const TTL_MS = num(process.env.GUO_FARE_TTL_HOURS, 6) * HOUR;
const MAX_AGE_MS = num(process.env.GUO_FARE_MAX_AGE_HOURS, 48) * HOUR;
const GAP_MS = num(process.env.GUO_REQUEST_GAP_MS, 3000);
const DAYS_AHEAD = num(process.env.GUO_SCRAPE_DAYS_AHEAD, 7);
const INTERVAL_MS = num(process.env.GUO_SCRAPE_INTERVAL_HOURS, 6) * HOUR;
const CACHE_FILE = path.resolve(
  process.env.GUO_FARE_CACHE_FILE || ".cache/guo-fares.json"
);

// Terminals: Jibowu 84, Maza Maza 23, Okota (Cele) 40, Port Harcourt 29.
// Destinations: Abuja 3, Enugu 9, Onitsha 16, Owerri 18, Aba 1.
// Pairs a terminal doesn't serve are skipped at scrape time.
const DEFAULT_ROUTES = ["84", "23", "40", "29"].flatMap(t =>
  ["3", "9", "16", "18", "1"].map(d => `${t}:${d}`)
);

export interface CachedFares extends GuoFareResult {
  stale: boolean;
}

const cache = new Map<string, GuoFareResult>();
const inflight = new Map<string, Promise<GuoFareResult>>();
let routesCache: { routes: GuoRoute[]; at: number } | null = null;
interface ScrapeRun {
  startedAt: string;
  finishedAt?: string;
  ok: number;
  failed: number;
  errors: string[];
}
let lastScrape: ScrapeRun | null = null;

const key = (t: string, d: string, date: string) => `${t}:${d}:${date}`;

/** Lagos-local (UTC+1) calendar date, offset by `days`. */
export function lagosDate(days = 0) {
  return new Date(Date.now() + HOUR + days * 24 * HOUR)
    .toISOString()
    .slice(0, 10);
}

function load() {
  try {
    const entries: GuoFareResult[] = JSON.parse(
      fs.readFileSync(CACHE_FILE, "utf8")
    );
    for (const e of entries)
      cache.set(key(e.terminalId, e.destinationId, e.date), e);
  } catch {
    // No cache yet (or unreadable) — start empty.
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const today = lagosDate();
      const live = Array.from(cache.values()).filter(e => e.date >= today);
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(live));
    } catch (err) {
      console.error("[guo] could not persist fare cache:", err);
    }
  }, 2000);
}

// One request to GUO at a time, at least GAP_MS apart.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn);
  queue = run
    .catch(() => {})
    .then(() => new Promise(r => setTimeout(r, GAP_MS)));
  return run;
}

function refresh(t: string, d: string, date: string): Promise<GuoFareResult> {
  const k = key(t, d, date);
  let p = inflight.get(k);
  if (!p) {
    p = enqueue(() => fetchFares(t, d, date))
      .then(res => {
        cache.set(k, res);
        scheduleSave();
        return res;
      })
      .finally(() => inflight.delete(k));
    inflight.set(k, p);
  }
  return p;
}

const age = (e: GuoFareResult) => Date.now() - Date.parse(e.fetchedAt);

/**
 * Fares for a route/date from the store. Fresh → served as-is. Stale → served with
 * `stale: true` while a background refresh runs. Missing/too old → fetched once from GUO.
 */
export async function getFares(
  terminalId: string,
  destinationId: string,
  date: string
): Promise<CachedFares> {
  const hit = cache.get(key(terminalId, destinationId, date));
  if (hit && age(hit) < TTL_MS) return { ...hit, stale: false };
  if (hit && age(hit) < MAX_AGE_MS) {
    refresh(terminalId, destinationId, date).catch(err =>
      console.error("[guo] background refresh failed:", err.message)
    );
    return { ...hit, stale: true };
  }
  return { ...(await refresh(terminalId, destinationId, date)), stale: false };
}

export async function getRoutes(): Promise<GuoRoute[]> {
  if (routesCache && Date.now() - routesCache.at < 24 * HOUR)
    return routesCache.routes;
  const routes = await enqueue(fetchRoutes);
  routesCache = { routes, at: Date.now() };
  return routes;
}

export async function scrapeAll() {
  const run: ScrapeRun = {
    startedAt: new Date().toISOString(),
    ok: 0,
    failed: 0,
    errors: [],
  };
  lastScrape = run;
  let routes: GuoRoute[];
  try {
    routes = await getRoutes();
  } catch (err: any) {
    run.errors.push(`routes: ${err.message}`);
    run.failed++;
    run.finishedAt = new Date().toISOString();
    return run;
  }
  const wanted = (process.env.GUO_SCRAPE_ROUTES || DEFAULT_ROUTES.join(","))
    .split(",")
    .map(s => s.trim().split(":"));
  const pairs = wanted.filter(([t, d]) =>
    routes.some(r => r.terminalId === t && r.destinations.some(x => x.id === d))
  );

  for (const [t, d] of pairs) {
    for (let i = 1; i <= DAYS_AHEAD; i++) {
      const date = lagosDate(i);
      const hit = cache.get(key(t, d, date));
      if (hit && age(hit) < TTL_MS / 2) continue; // fetched recently (e.g. by a user request)
      try {
        await refresh(t, d, date);
        run.ok++;
      } catch (err: any) {
        run.failed++;
        if (run.errors.length < 20)
          run.errors.push(`${t}:${d}:${date} ${err.message}`);
      }
    }
  }
  run.finishedAt = new Date().toISOString();
  console.log(
    `[guo] scrape done: ${run.ok} ok, ${run.failed} failed (${pairs.length} routes × ${DAYS_AHEAD} days)`
  );
  return run;
}

export function status() {
  return {
    cachedEntries: cache.size,
    lastScrape,
    config: {
      ttlHours: TTL_MS / HOUR,
      maxAgeHours: MAX_AGE_MS / HOUR,
      daysAhead: DAYS_AHEAD,
      intervalHours: INTERVAL_MS / HOUR,
    },
  };
}

let started = false;
export function startScheduler() {
  if (started) return;
  started = true;
  load();
  if (INTERVAL_MS <= 0) return;
  const tick = () =>
    scrapeAll().catch(err => console.error("[guo] scrape crashed:", err));
  setTimeout(tick, 10_000); // let the server finish booting first
  setInterval(tick, INTERVAL_MS).unref();
}
