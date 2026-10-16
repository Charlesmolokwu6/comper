/** In-memory flight cache: one entry per airline + route + date, shared by all searches. */
import type { Airline, Flight } from "./types";

const HOUR = 3600_000;
/** Flight prices move faster than bus fares; keep them shorter. */
const TTL_MS = Number(process.env.FLIGHT_TTL_HOURS ?? 2) * HOUR;
const ERROR_TTL_MS = Number(process.env.FLIGHT_ERROR_TTL_MS || 5 * 60_000);

export interface FlightEntry {
  flights: Flight[];
  fetchedAt: string;
}

const cache = new Map<string, FlightEntry>();
const failures = new Map<string, { at: number; message: string }>();
const inflight = new Map<string, Promise<FlightEntry>>();

const key = (a: string, from: string, to: string, date: string) =>
  `${a}:${from}:${to}:${date}`;

export type Lookup =
  | { state: "ready"; entry: FlightEntry }
  | { state: "error"; message: string }
  | { state: "pending"; promise: Promise<FlightEntry> };

/** Cached result, a recent failure, or a fetch in progress (started if needed). */
export function lookup(
  airline: Airline,
  from: string,
  to: string,
  date: string
): Lookup {
  const k = key(airline.id, from, to, date);
  const hit = cache.get(k);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < TTL_MS)
    return { state: "ready", entry: hit };
  const failed = failures.get(k);
  if (failed && Date.now() - failed.at < ERROR_TTL_MS)
    return { state: "error", message: failed.message };
  let p = inflight.get(k);
  if (!p) {
    p = airline
      .search(from, to, date)
      .then(flights => {
        const entry = { flights, fetchedAt: new Date().toISOString() };
        cache.set(k, entry);
        failures.delete(k);
        return entry;
      })
      .catch(err => {
        failures.set(k, {
          at: Date.now(),
          message: String(err?.message ?? err),
        });
        throw err;
      })
      .finally(() => inflight.delete(k));
    p.catch(() => {});
    inflight.set(k, p);
  }
  return { state: "pending", promise: p };
}

export const flightCacheSize = () => cache.size;
