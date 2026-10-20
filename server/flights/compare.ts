/** All airlines for one city pair and date, side by side, waiting a short budget for slow ones. */
import { airlines } from "./airlines";
import { airport, cityAirports, cityName } from "./airports";
import { lookup, type FlightEntry } from "./store";
import { routeKey, type Airline, type Flight } from "./types";

export type FlightStatus =
  | "fares"
  | "no_trips"
  | "no_route"
  | "pending"
  | "error";

export interface FlightCoverage {
  operator: string;
  operatorName: string;
  status: FlightStatus;
  message?: string;
}

export interface ComparedFlight extends Flight {
  airline: string;
  airlineName: string;
  website: string;
  bookingUrl: string;
  deepLink: boolean;
  soldOut: boolean;
  fetchedAt: string;
}

/** Airport pairs this airline might fly between the two cities. */
async function pairsFor(a: Airline, fromCity: string, toCity: string) {
  const froms = cityAirports(fromCity, a.airports);
  const tos = cityAirports(toCity, a.airports);
  let pairs = froms.flatMap(f => tos.map(t => [f, t] as const));
  if (pairs.length && a.routes) {
    try {
      const routes = await a.routes();
      pairs = pairs.filter(([f, t]) => routes.has(routeKey(f, t)));
    } catch {
      // Route list unavailable: try the search itself.
    }
  }
  return pairs;
}

/** Departures already gone today are dropped; the airline may still list them. */
function upcoming(f: Flight) {
  const now = new Date(Date.now() + 3600_000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
  return f.departure > now;
}

export async function compareFlights(
  fromCity: string,
  toCity: string,
  date: string,
  waitMs: number
) {
  const deadline = new Promise<"timeout">(r =>
    setTimeout(() => r("timeout"), waitMs)
  );
  const results = await Promise.all(
    airlines.map(async a => {
      const base = { operator: a.id, operatorName: a.name };
      const pairs = await pairsFor(a, fromCity, toCity);
      if (!pairs.length)
        return {
          coverage: { ...base, status: "no_route" as const },
          flights: [],
        };

      const entries: (FlightEntry & { from: string; to: string })[] = [];
      let pending = false;
      let error: string | null = null;
      for (const [from, to] of pairs) {
        const l = lookup(a, from, to, date);
        if (l.state === "ready") entries.push({ ...l.entry, from, to });
        else if (l.state === "error") error = l.message;
        else {
          const r = await Promise.race([
            l.promise.catch((e: Error) => e),
            deadline,
          ]);
          if (r === "timeout") pending = true;
          else if (r instanceof Error) error = r.message;
          else entries.push({ ...r, from, to });
        }
      }

      const flights: ComparedFlight[] = entries.flatMap(e =>
        e.flights.filter(upcoming).map(f => {
          const deep = a.bookingUrl?.(e.from, e.to, date);
          return {
            ...f,
            airline: a.id,
            airlineName: a.name,
            website: a.website,
            bookingUrl: deep ?? a.website,
            deepLink: !!deep,
            soldOut: f.fares.length === 0,
            fetchedAt: e.fetchedAt,
          };
        })
      );
      const status: FlightStatus = flights.length
        ? "fares"
        : pending
          ? "pending"
          : error
            ? "error"
            : "no_trips";
      return {
        coverage: {
          ...base,
          status,
          ...(status === "error" && error ? { message: error } : {}),
        },
        flights,
      };
    })
  );

  const flights = results
    .flatMap(r => r.flights)
    .sort((a, b) => a.departure.localeCompare(b.departure));
  return {
    from: { city: fromCity, name: cityName(fromCity) ?? fromCity },
    to: { city: toCity, name: cityName(toCity) ?? toCity },
    date,
    flights,
    coverage: results.map(r => r.coverage) as FlightCoverage[],
  };
}

/** Cities with at least one airline route, and where each can go, for the pickers. */
export async function flightNetwork() {
  const from = new Map<string, Map<string, Set<string>>>();
  for (const a of airlines) {
    let routes: Set<string> | null = null;
    if (a.routes) routes = await a.routes().catch(() => null);
    for (const f of a.airports)
      for (const t of a.airports) {
        if (f === t || (routes && !routes.has(routeKey(f, t)))) continue;
        const fc = cityAirports2(f);
        const tc = cityAirports2(t);
        if (!fc || !tc || fc === tc) continue;
        if (!from.has(fc)) from.set(fc, new Map());
        const to = from.get(fc)!;
        if (!to.has(tc)) to.set(tc, new Set());
        to.get(tc)!.add(a.id);
      }
  }
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);
  return Array.from(from, ([city, to]) => ({
    city,
    name: cityName(city) ?? city,
    destinations: Array.from(to, ([c, ops]) => ({
      city: c,
      name: cityName(c) ?? c,
      operators: Array.from(ops).sort(),
    })).sort(byName),
  })).sort(byName);
}

const cityAirports2 = (code: string) => airport(code)?.city ?? null;
