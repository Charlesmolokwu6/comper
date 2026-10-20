import type { Cabin, ComparedFlight, FlightFare } from "./api";

export const CABINS: { id: Cabin; label: string; note: string }[] = [
  {
    id: "economy",
    label: "Economy",
    note: "Every economy fare the airline sells, from its cheapest to its most flexible.",
  },
  {
    id: "premium",
    label: "Premium & Business",
    note: "Fares the airline itself calls Premium, Business or First.",
  },
];

export interface FlightRow {
  flight: ComparedFlight;
  /** This flight's fares in the chosen cabin, cheapest first. */
  fares: FlightFare[];
}

export interface AirlineGroup {
  airline: string;
  airlineName: string;
  website: string;
  /** Flights with a fare in this cabin, earliest first; sold-out flights last (economy only). */
  rows: FlightRow[];
  /** Cheapest fare in this cabin across the airline's flights, null if all sold out. */
  best: { price: number; row: FlightRow } | null;
  bookable: number;
}

const faresIn = (f: ComparedFlight, cabin: Cabin) =>
  f.fares.filter(x => x.cabin === cabin).sort((a, b) => a.price - b.price);

/** Cheapest bookable fare in a cabin across all flights (for the tab header). */
export function cheapestInCabin(flights: ComparedFlight[], cabin: Cabin) {
  let min: number | null = null;
  for (const f of flights)
    for (const x of faresIn(f, cabin))
      if (min == null || x.price < min) min = x.price;
  return min;
}

/**
 * One group per airline for a cabin, cheapest airline first. Sold-out flights only appear
 * under Economy (they had no fares in any cabin), so a sold-out airline isn't silently dropped.
 */
export function groupFlights(
  flights: ComparedFlight[],
  cabin: Cabin
): AirlineGroup[] {
  const map = new Map<string, ComparedFlight[]>();
  for (const f of flights)
    map.set(f.airline, [...(map.get(f.airline) ?? []), f]);

  const groups: AirlineGroup[] = [];
  for (const list of Array.from(map.values())) {
    const rows: FlightRow[] = list
      .map(flight => ({ flight, fares: faresIn(flight, cabin) }))
      .filter(r => r.fares.length || (cabin === "economy" && r.flight.soldOut))
      .sort(
        (a, b) =>
          Number(!a.fares.length) - Number(!b.fares.length) ||
          a.flight.departure.localeCompare(b.flight.departure)
      );
    if (!rows.length) continue;
    let best: AirlineGroup["best"] = null;
    for (const r of rows)
      if (r.fares.length && (!best || r.fares[0].price < best.price))
        best = { price: r.fares[0].price, row: r };
    groups.push({
      airline: list[0].airline,
      airlineName: list[0].airlineName,
      website: list[0].website,
      rows,
      best,
      bookable: rows.filter(r => r.fares.length).length,
    });
  }
  return groups.sort(
    (a, b) =>
      Number(!a.best) - Number(!b.best) ||
      (a.best?.price ?? 0) - (b.best?.price ?? 0) ||
      a.airlineName.localeCompare(b.airlineName)
  );
}
