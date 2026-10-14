/**
 * Side-by-side fares for a city pair across all live operators.
 *
 * For each operator: find its origins in the "from" city and their destinations in
 * the "to" city (via cities.ts), then look up fares for every such pair from the store.
 * Operators run in parallel (each is rate-limited separately). If some are still
 * fetching after `waitMs`, the response includes what is ready and lists the rest as
 * `pending`; their fares land in the cache for the next request.
 */
import {
  operators,
  unavailableOperators,
  type Stop,
  type Trip,
} from "../operators";
import { resolveCity, type CityMatch } from "./cities";
import {
  daysFromToday,
  getDestinations,
  getFares,
  getOrigins,
  isRecent,
  lagosDate,
} from "./store";

export interface StopRef extends Stop {
  city: string;
  match: CityMatch["match"];
  note?: string;
}

export interface ComparedTrip extends Trip {
  operator: string;
  operatorName: string;
  website: string;
  from: StopRef;
  to: StopRef;
  /** The bus continues beyond the searched city; `fare` is to the searched city. */
  passesThrough: boolean;
  /** Where to book: the exact search when `deepLink`, else the operator's homepage. */
  bookingUrl: string;
  deepLink: boolean;
  /** True when either end was matched approximately; see `matchNotes`. */
  approximate: boolean;
  matchNotes: string[];
  fetchedAt: string;
  stale: boolean;
}

export type CoverageStatus =
  | "fares"
  | "no_trips"
  | "no_route"
  | "not_on_sale"
  | "pending"
  | "error";

export interface Coverage {
  operator: string;
  operatorName: string;
  status: CoverageStatus;
  /** Origin/destination pairs the operator lists between the two cities. */
  routesFound: number;
  /** Pairs selected for searching (most central drop-off per origin). */
  routesSearched: number;
  routesChecked: number;
  message?: string;
}

/**
 * Destinations searched per origin. Operators often list many drop-off points in one
 * city (GUO: ABUJA, ABUJA - KUBWA, ABUJA - UTAKO, …) served by the same buses, so by
 * default only the most central one is searched. All are available per operator via
 * /api/operators/:op/fares.
 */
const DESTS_PER_ORIGIN = Number(process.env.COMPARE_DESTS_PER_ORIGIN || 1);

const ref = (s: Stop, m: CityMatch): StopRef => ({
  ...s,
  city: m.city,
  match: m.match,
  ...(m.note && { note: m.note }),
});

/** The (origin, destination) pairs to search between two cities, plus how many exist in total. */
export async function findRoutes(
  operatorId: string,
  fromCity: string,
  toCity: string
) {
  const pairs: { from: StopRef; to: StopRef }[] = [];
  let total = 0;
  for (const o of await getOrigins(operatorId)) {
    const om = resolveCity(o.name, o.state);
    if (om?.city !== fromCity) continue;
    const dests = (await getDestinations(operatorId, o.id))
      .map(d => ({ d, m: resolveCity(d.name, d.state) }))
      .filter((x): x is { d: Stop; m: CityMatch } => x.m?.city === toCity)
      .sort((a, b) => a.m.rank - b.m.rank);
    total += dests.length;
    for (const { d, m } of dests.slice(0, DESTS_PER_ORIGIN))
      pairs.push({ from: ref(o, om), to: ref(d, m) });
  }
  return { pairs, total };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Bookable trips first, then by `fare` — the post-standard-online-discount price, the
 * same basis for every operator. `listFare` never affects ranking. `cheapest` excludes
 * sold-out trips and approximate city matches.
 */
export function rankTrips<
  T extends Pick<Trip, "fare" | "soldOut" | "departure"> & {
    approximate: boolean;
  },
>(trips: T[]) {
  const sorted = trips
    .slice()
    .sort(
      (a, b) =>
        Number(a.soldOut) - Number(b.soldOut) ||
        a.fare - b.fare ||
        a.departure.localeCompare(b.departure)
    );
  return {
    trips: sorted,
    cheapest: sorted.find(t => !t.soldOut && !t.approximate) ?? null,
  };
}

export async function compare(
  fromCity: string,
  toCity: string,
  date: string,
  waitMs: number
) {
  const trips: ComparedTrip[] = [];
  const coverage = new Map<string, Coverage>();

  const runs = operators.map(async op => {
    const cov: Coverage = {
      operator: op.id,
      operatorName: op.name,
      status: "pending",
      routesFound: 0,
      routesSearched: 0,
      routesChecked: 0,
    };
    coverage.set(op.id, cov);
    if (daysFromToday(date) > op.maxDaysAhead) {
      cov.status = "not_on_sale";
      cov.message = `${op.name} sells tickets up to ${op.maxDaysAhead} days ahead`;
      return;
    }
    try {
      const { pairs, total } = await findRoutes(op.id, fromCity, toCity);
      cov.routesFound = total;
      cov.routesSearched = pairs.length;
      if (!pairs.length) {
        cov.status = "no_route";
        return;
      }
      const errors: string[] = [];
      for (const p of pairs) {
        try {
          const res = await getFares(op.id, p.from.id, p.to.id, date);
          const notes = [p.from.note, p.to.note].filter(
            (n): n is string => !!n
          );
          for (const t of res.trips) {
            // Same bus reached via another drop-off point of the same city.
            if (
              trips.some(
                x =>
                  x.operator === op.id &&
                  x.from.id === p.from.id &&
                  x.id === t.id
              )
            )
              continue;
            const deep = op.bookingUrl?.(p.from.id, p.to.id, date);
            trips.push({
              ...t,
              operator: op.id,
              operatorName: op.name,
              website: op.website,
              // Only when the bus ends in a different city: GUO's "ABUJA" vs a search to
              // "ABUJA - UTAKO" is the same city, not a pass-through.
              passesThrough:
                t.busFinalDestination != null &&
                resolveCity(t.busFinalDestination)?.city !== toCity,
              bookingUrl: deep ?? op.website,
              deepLink: !!deep,
              from: p.from,
              to: p.to,
              approximate:
                p.from.match === "approximate" || p.to.match === "approximate",
              matchNotes: notes,
              fetchedAt: res.fetchedAt,
              stale: res.stale,
            });
          }
        } catch (err: any) {
          errors.push(`${p.from.name} → ${p.to.name}: ${err.message}`);
        }
        cov.routesChecked++;
      }
      const found = trips.some(t => t.operator === op.id);
      cov.status = found
        ? "fares"
        : errors.length === pairs.length
          ? "error"
          : "no_trips";
      if (errors.length) cov.message = errors.slice(0, 3).join("; ");
    } catch (err: any) {
      cov.status = "error";
      cov.message = err.message;
    }
  });

  await Promise.race([Promise.allSettled(runs), sleep(waitMs)]);

  // Snapshot now; pending operators keep filling the cache in the background.
  const { trips: out, cheapest } = rankTrips(trips);
  return {
    date,
    currency: "NGN",
    trips: out,
    cheapest,
    coverage: Array.from(coverage.values(), c => ({ ...c })),
    unavailableOperators,
  };
}

/** Warm the cache for the routes people search most. */
export async function scrapePopular(
  cityPairs: [string, string][],
  daysAhead: number
) {
  let ok = 0;
  for (let i = 1; i <= daysAhead; i++) {
    const date = lagosDate(i);
    for (const [from, to] of cityPairs) {
      await Promise.allSettled(
        operators.map(async op => {
          if (i > op.maxDaysAhead) return;
          for (const p of (await findRoutes(op.id, from, to)).pairs) {
            if (isRecent(op.id, p.from.id, p.to.id, date)) continue;
            await getFares(op.id, p.from.id, p.to.id, date).then(
              () => ok++,
              () => {}
            );
          }
        })
      );
    }
  }
  return ok;
}
