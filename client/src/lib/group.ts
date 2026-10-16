import type { ComparedTrip, Coverage } from "./api";
import { prettyStop } from "./format";
import { distanceKm, type LatLon } from "./geo";

/** One place an operator boards at (Chisco's "Jibowu (am)" and "Jibowu (pm)" are one). */
export interface BoardingPoint {
  name: string;
  /** Straight-line km from the traveller's chosen location; null if either is unknown. */
  distanceKm: number | null;
  /** Departures from here, earliest first; sold-out ones last. */
  trips: ComparedTrip[];
  /** Cheapest bookable trip from here, null when all are sold out. */
  best: ComparedTrip | null;
}

export interface OperatorGroup {
  operator: string;
  operatorName: string;
  website: string;
  /** All departures, earliest first; sold-out ones last. */
  trips: ComparedTrip[];
  /** Boarding points, nearest first when a location is set (unknown distances last). */
  points: BoardingPoint[];
  /**
   * The closest boarding point that still has bookable seats, when the traveller has
   * set a location and we know where at least one of this operator's terminals is.
   */
  nearest: BoardingPoint | null;
  /**
   * The trip behind the headline "from" price: cheapest bookable trip on the same
   * post-discount `fare` basis as everywhere else, preferring exact city matches —
   * taken from the nearest boarding point when there is one.
   * null when every trip is sold out.
   */
  best: ComparedTrip | null;
  /** The headline price is only reachable via an approximate city match. */
  bestIsApproximate: boolean;
  bookable: number;
  firstDeparture: string;
  lastDeparture: string;
  /** Notes every departure shares (shown once on the card instead of on each row). */
  sharedNotes: string[];
}

const byFare = (a: ComparedTrip, b: ComparedTrip) =>
  a.fare - b.fare || a.departure.localeCompare(b.departure);

const byDeparture = (a: ComparedTrip, b: ComparedTrip) =>
  Number(a.soldOut) - Number(b.soldOut) ||
  a.departure.localeCompare(b.departure);

/** Cheapest bookable trip, preferring exact city matches. */
function cheapest(list: ComparedTrip[]) {
  const open = list.filter(t => !t.soldOut);
  const exact = open.filter(t => !t.approximate).sort(byFare);
  const best = exact[0] ?? open.sort(byFare)[0] ?? null;
  return { best, exact: exact.length > 0 };
}

function boardingPoints(
  list: ComparedTrip[],
  near: LatLon | null
): BoardingPoint[] {
  const map = new Map<string, ComparedTrip[]>();
  for (const t of list) {
    const name = prettyStop(t.from.name);
    map.set(name, [...(map.get(name) ?? []), t]);
  }
  const points = Array.from(map, ([name, trips]) => {
    const at = trips.find(t => t.from.lat != null && t.from.lon != null)?.from;
    return {
      name,
      distanceKm:
        near && at ? distanceKm(near, { lat: at.lat!, lon: at.lon! }) : null,
      trips: trips.sort(byDeparture),
      best: cheapest(trips).best,
    };
  });
  return points.sort(
    (a, b) =>
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
      (a.best?.fare ?? Infinity) - (b.best?.fare ?? Infinity)
  );
}

/**
 * One group per operator. With `near` set, each operator's headline price is the
 * cheapest bookable fare at its boarding point closest to the traveller, so cards
 * compare what the traveller would actually pay from their area.
 */
export function groupByOperator(
  trips: ComparedTrip[],
  near: LatLon | null = null
): OperatorGroup[] {
  const map = new Map<string, ComparedTrip[]>();
  for (const t of trips)
    map.set(t.operator, [...(map.get(t.operator) ?? []), t]);

  const groups = Array.from(map.values(), list => {
    const open = list.filter(t => !t.soldOut);
    const points = boardingPoints(list, near);
    const nearest = points.find(p => p.distanceKm != null && p.best) ?? null;
    const { best, exact } = cheapest(nearest ? nearest.trips : list);
    const sorted = list.slice().sort(byDeparture);
    const times = list.map(t => t.departure).sort();
    const shared = list[0].notes.filter(n =>
      list.every(t => t.notes.includes(n))
    );
    return {
      operator: list[0].operator,
      operatorName: list[0].operatorName,
      website: list[0].website,
      trips: sorted,
      points,
      nearest,
      best,
      bestIsApproximate: !!best && !exact,
      bookable: open.length,
      firstDeparture: times[0],
      lastDeparture: times[times.length - 1],
      sharedNotes: shared,
    };
  });

  // Cheapest operator first; approximate-only after exact; fully sold out last.
  return groups.sort(
    (a, b) =>
      Number(!a.best) - Number(!b.best) ||
      Number(a.bestIsApproximate) - Number(b.bestIsApproximate) ||
      (a.best?.fare ?? 0) - (b.best?.fare ?? 0)
  );
}

/** Operators that returned no fares, grouped into sentences for one quiet summary line. */
export interface CoverageLike {
  operatorName: string;
  status: string;
  message?: string;
}

export function quietStatuses<C extends CoverageLike>(
  coverage: C[],
  timedOut: boolean
) {
  const names = (pred: (c: C) => boolean) =>
    coverage.filter(pred).map(c => c.operatorName);
  return {
    noTrips: names(c => c.status === "no_trips"),
    noRoute: names(c => c.status === "no_route"),
    notOnSale: coverage.filter(c => c.status === "not_on_sale"),
    errors: coverage.filter(
      c => c.status === "error" || (timedOut && c.status === "pending")
    ),
    pending: timedOut ? [] : coverage.filter(c => c.status === "pending"),
  };
}
