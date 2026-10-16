/**
 * ValueJet. Its website (a Next.js app) reads two public JSON endpoints on
 * api.flyvaluejet.com, no login or token:
 *   GET /ibe/flight/routes                          every route with its sale dates
 *   GET /ibe/flight/search?from=&to=&on=&adult=…    journeys with fare class, seats and totals
 * Each journey is one flight (or connection) in one fare class; `amount.total` is the price
 * for one adult including taxes and surcharges. A class with `count: 0` has no seats.
 */
import { HttpError, request, requestJson } from "../operators/http";
import { cabinOf, routeKey, type Airline, type Flight } from "./types";
import { airport } from "./airports";

const API = "https://api.flyvaluejet.com";
const HEADERS = {
  Origin: "https://www.flyvaluejet.com",
  Accept: "application/json",
};

const hhmm = (t: string) => t.slice(0, 5);

function duration(d: string | undefined) {
  const m = d?.match(/^(\d+):(\d+)/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h ? `${h}h${min ? ` ${min}m` : ""}` : `${min}m`;
}

export function parseValueJetSearch(json: any, date: string): Flight[] {
  const journeys = json?.data?._;
  if (!Array.isArray(journeys))
    throw new Error("ValueJet search has no journeys (API changed?)");
  const bounds = json.data.bounds ?? {};
  const byFlight = new Map<string, Flight>();

  for (const j of journeys) {
    const legs: any[] = j.combinations ?? [];
    if (!legs.length) continue;
    const first = legs[0];
    const last = legs[legs.length - 1];
    if (first.departure?.date !== date) continue;
    const key = legs.map(l => l.number).join("+");
    const cls =
      bounds[first.bound_key]?.flights?.[first.number]?.classes?.[first.code];
    const seats = Math.min(...legs.map(l => Number(l.count ?? 0)));
    const total = Number(j.amount?.total);

    let f = byFlight.get(key);
    if (!f) {
      f = {
        flightNumber: legs.map(l => l.number).join(" + "),
        from: first.from,
        to: last.to,
        fromName: airport(first.from)?.cityName ?? first.from,
        toName: airport(last.to)?.cityName ?? last.to,
        departure: `${first.departure.date} ${hhmm(first.departure.time)}`,
        arrival: `${last.arrival.date} ${hhmm(last.arrival.time)}`,
        duration: legs.length === 1 ? duration(first.duration) : null,
        stops: legs.length - 1,
        fares: [],
      };
      byFlight.set(key, f);
    }
    if (seats <= 0 || !Number.isFinite(total) || total <= 0) continue;
    const name = String(cls?.label ?? cls?.name ?? first.code);
    const existing = f.fares.find(x => x.name === name);
    if (existing) existing.price = Math.min(existing.price, total);
    else f.fares.push({ name, cabin: cabinOf(name), price: total });
  }
  const flights = Array.from(byFlight.values());
  for (const f of flights) f.fares.sort((a, b) => a.price - b.price);
  return flights.sort((a, b) => a.departure.localeCompare(b.departure));
}

let routesCache: { at: number; dates: Map<string, Set<string>> } | null = null;

/** Route → the dates ValueJet sells on it (from its own route list). */
async function routeDates() {
  if (routesCache && Date.now() - routesCache.at < 6 * 3600_000)
    return routesCache.dates;
  const json = await requestJson(`${API}/ibe/flight/routes`, {
    headers: HEADERS,
  });
  const dates = new Map<string, Set<string>>();
  for (const r of json?.data ?? [])
    if (r.from && r.to)
      dates.set(routeKey(r.from, r.to), new Set(r.dates ?? []));
  routesCache = { at: Date.now(), dates };
  return dates;
}

export const valuejet: Airline = {
  id: "valuejet",
  name: "ValueJet",
  website: "https://www.flyvaluejet.com",
  airports: [
    "LOS",
    "ABV",
    "PHC",
    "KAN",
    "QOW",
    "ABB",
    "BNI",
    "CBQ",
    "JOS",
    "MIU",
    "YOL",
  ],
  async routes() {
    return new Set((await routeDates()).keys());
  },
  async search(from, to, date) {
    // ValueJet answers 400 "Can not create an itinerary" for a date it doesn't fly, so check its
    // own list of operating dates first.
    const dates = (await routeDates()).get(routeKey(from, to));
    if (dates && dates.size && !dates.has(date)) return [];
    const qs = new URLSearchParams({
      from,
      to,
      on: date,
      adult: "1",
      child: "0",
      infant: "0",
    });
    const res = await request(`${API}/ibe/flight/search?${qs}`, {
      headers: HEADERS,
    });
    if (res.status === 400) {
      const body = await res.json().catch(() => null);
      if (/CreatedItinerary/i.test(JSON.stringify(body ?? ""))) return [];
    }
    if (!res.ok)
      throw new HttpError(
        res.status,
        `ValueJet search returned HTTP ${res.status}`
      );
    return parseValueJetSearch(await res.json(), date).filter(
      f => f.from === from && f.to === to
    );
  },
};
