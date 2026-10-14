/**
 * Cached fares and route lists for every operator. User requests are served from
 * here; operators are only contacted by the scheduled scrape, the first request for
 * an uncached route/date, or a background refresh of a stale entry. Requests to each
 * operator are spaced out at the HTTP layer (FARE_REQUEST_GAP_MS, see operators/http.ts).
 *
 * Env:
 *   FARE_TTL_HOURS        after this an entry is refreshed in the background (default 6)
 *   FARE_MAX_AGE_HOURS    after this a stale entry is no longer served (default 48)
 *   ROUTES_TTL_HOURS      how long terminal/destination lists are reused (default 24)
 *   FARE_CACHE_FILE       JSON file the cache persists to (default .cache/fares.json)
 */
import fs from "node:fs";
import path from "node:path";
import { getOperator, type Operator, type Stop, type Trip } from "../operators";

const HOUR = 3_600_000;
const num = (v: string | undefined, d: number) =>
  v === undefined || v === "" ? d : Number(v);
const TTL_MS = num(process.env.FARE_TTL_HOURS, 6) * HOUR;
const MAX_AGE_MS = num(process.env.FARE_MAX_AGE_HOURS, 48) * HOUR;
const ROUTES_TTL_MS = num(process.env.ROUTES_TTL_HOURS, 24) * HOUR;
const CACHE_FILE = path.resolve(
  process.env.FARE_CACHE_FILE || ".cache/fares.json"
);

export interface FareEntry {
  operator: string;
  originId: string;
  destinationId: string;
  date: string;
  trips: Trip[];
  fetchedAt: string;
}

export interface CachedFares extends FareEntry {
  stale: boolean;
}

interface Timed<T> {
  at: number;
  value: T;
}

const fares = new Map<string, FareEntry>();
const stops = new Map<string, Timed<Stop[]>>(); // "op:origins" | "op:dest:<originId>"
const inflight = new Map<string, Promise<unknown>>();

const fareKey = (op: string, o: string, d: string, date: string) =>
  `${op}:${o}:${d}:${date}`;

/** Lagos-local (UTC+1) calendar date, offset by `days`. */
export function lagosDate(days = 0) {
  return new Date(Date.now() + HOUR + days * 24 * HOUR)
    .toISOString()
    .slice(0, 10);
}

/** Whole days from today (Lagos) to `date`. */
export function daysFromToday(date: string) {
  return Math.round((Date.parse(date) - Date.parse(lagosDate())) / (24 * HOUR));
}

function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fn().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

function op(id: string): Operator {
  const o = getOperator(id);
  if (!o) throw new Error(`Unknown operator ${id}`);
  return o;
}

async function cachedStops(key: string, load: () => Promise<Stop[]>) {
  const hit = stops.get(key);
  if (hit && Date.now() - hit.at < ROUTES_TTL_MS) return hit.value;
  try {
    const value = await singleFlight(`stops:${key}`, load);
    stops.set(key, { at: Date.now(), value });
    scheduleSave();
    return value;
  } catch (err) {
    if (hit) return hit.value; // operator down: keep using yesterday's route list
    throw err;
  }
}

export const getOrigins = (operator: string) =>
  cachedStops(`${operator}:origins`, () => op(operator).origins());

export const getDestinations = (operator: string, originId: string) =>
  cachedStops(`${operator}:dest:${originId}`, () =>
    op(operator).destinations(originId)
  );

/** Never pass on a trip without a real positive fare. */
const validTrips = (trips: Trip[]) =>
  trips.filter(t => Number.isFinite(t.fare) && t.fare > 0);

function refresh(
  operator: string,
  o: string,
  d: string,
  date: string
): Promise<FareEntry> {
  const k = fareKey(operator, o, d, date);
  return singleFlight(k, async () => {
    const entry: FareEntry = {
      operator,
      originId: o,
      destinationId: d,
      date,
      trips: validTrips(await op(operator).search(o, d, date)),
      fetchedAt: new Date().toISOString(),
    };
    fares.set(k, entry);
    scheduleSave();
    return entry;
  });
}

const age = (e: FareEntry) => Date.now() - Date.parse(e.fetchedAt);

/** Cached entry only (no network), or undefined. */
export function peekFares(
  operator: string,
  o: string,
  d: string,
  date: string
) {
  return fares.get(fareKey(operator, o, d, date));
}

/**
 * Fresh → served as-is. Stale → served with `stale: true` while a background refresh
 * runs. Missing/too old → fetched once from the operator.
 */
export async function getFares(
  operator: string,
  o: string,
  d: string,
  date: string
): Promise<CachedFares> {
  const hit = fares.get(fareKey(operator, o, d, date));
  if (hit && age(hit) < TTL_MS) return { ...hit, stale: false };
  if (hit && age(hit) < MAX_AGE_MS) {
    refresh(operator, o, d, date).catch(err =>
      console.error(
        `[fares] background refresh ${operator} failed:`,
        err.message
      )
    );
    return { ...hit, stale: true };
  }
  return { ...(await refresh(operator, o, d, date)), stale: false };
}

/** True when an entry was fetched within half the TTL (the scraper can skip it). */
export function isRecent(operator: string, o: string, d: string, date: string) {
  const hit = fares.get(fareKey(operator, o, d, date));
  return !!hit && age(hit) < TTL_MS / 2;
}

export function load() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    for (const e of data.fares ?? [])
      fares.set(fareKey(e.operator, e.originId, e.destinationId, e.date), e);
    for (const [k, v] of Object.entries<Timed<Stop[]>>(data.stops ?? {}))
      stops.set(k, v);
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
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify({
          fares: Array.from(fares.values()).filter(e => e.date >= today),
          stops: Object.fromEntries(stops),
        })
      );
    } catch (err) {
      console.error("[fares] could not persist cache:", err);
    }
  }, 2000);
  saveTimer.unref();
}

export function cacheStats() {
  const byOperator: Record<string, number> = {};
  fares.forEach(e => {
    byOperator[e.operator] = (byOperator[e.operator] ?? 0) + 1;
  });
  return {
    fareEntries: fares.size,
    byOperator,
    routeLists: stops.size,
    config: {
      ttlHours: TTL_MS / HOUR,
      maxAgeHours: MAX_AGE_MS / HOUR,
      routesTtlHours: ROUTES_TTL_MS / HOUR,
    },
  };
}
