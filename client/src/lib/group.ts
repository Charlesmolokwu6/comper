import type { ComparedTrip, Coverage } from "./api";

export interface OperatorGroup {
  operator: string;
  operatorName: string;
  website: string;
  /** All departures, earliest first; sold-out ones last. */
  trips: ComparedTrip[];
  /**
   * The trip behind the headline "from" price: cheapest bookable trip on the same
   * post-discount `fare` basis as everywhere else, preferring exact city matches.
   * null when every trip is sold out.
   */
  best: ComparedTrip | null;
  /** The headline price is only reachable via an approximate city match. */
  bestIsApproximate: boolean;
  bookable: number;
  boardingPoints: string[];
  firstDeparture: string;
  lastDeparture: string;
  /** Notes every departure shares (shown once on the card instead of on each row). */
  sharedNotes: string[];
}

const byFare = (a: ComparedTrip, b: ComparedTrip) =>
  a.fare - b.fare || a.departure.localeCompare(b.departure);

export function groupByOperator(trips: ComparedTrip[]): OperatorGroup[] {
  const map = new Map<string, ComparedTrip[]>();
  for (const t of trips)
    map.set(t.operator, [...(map.get(t.operator) ?? []), t]);

  const groups = Array.from(map.values(), list => {
    const open = list.filter(t => !t.soldOut);
    const exact = open.filter(t => !t.approximate).sort(byFare);
    const best = exact[0] ?? open.slice().sort(byFare)[0] ?? null;
    const sorted = list
      .slice()
      .sort(
        (a, b) =>
          Number(a.soldOut) - Number(b.soldOut) ||
          a.departure.localeCompare(b.departure)
      );
    const times = list.map(t => t.departure).sort();
    const shared = list[0].notes.filter(n =>
      list.every(t => t.notes.includes(n))
    );
    return {
      operator: list[0].operator,
      operatorName: list[0].operatorName,
      website: list[0].website,
      trips: sorted,
      best,
      bestIsApproximate: !!best && !exact.length,
      bookable: open.length,
      boardingPoints: Array.from(new Set(list.map(t => t.from.name))),
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
export function quietStatuses(coverage: Coverage[], timedOut: boolean) {
  const names = (pred: (c: Coverage) => boolean) =>
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
