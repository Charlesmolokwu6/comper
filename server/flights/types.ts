/** One shape for every airline adapter. Prices are naira for one adult, as the airline shows them. */

/** "economy" or the dearer cabins (premium economy, business), which get their own tab. */
export type Cabin = "economy" | "premium";

export interface FlightFare {
  /** The airline's own fare name, e.g. "Economy Saver", "ValueLite", "FLEX ECONOMY". */
  name: string;
  cabin: Cabin;
  /** Total for one adult including taxes and fees, as the airline's results page shows it. */
  price: number;
}

export interface Flight {
  /** Flight number(s) as the airline prints them, e.g. "UN0504" or "VK206". */
  flightNumber: string;
  /** IATA codes. */
  from: string;
  to: string;
  /** Airport/terminal name as the airline labels it, e.g. "LAGOS (MMA2)". */
  fromName: string;
  toName: string;
  /** "YYYY-MM-DD HH:mm", local (Lagos) time. */
  departure: string;
  arrival: string;
  /** e.g. "1h 15m". */
  duration: string | null;
  stops: number;
  /** Bookable fares only, cheapest first. Empty = sold out. */
  fares: FlightFare[];
}

export interface Airline {
  id: string;
  name: string;
  website: string;
  /** Domestic airports (IATA) the airline lists in its own search form. */
  airports: string[];
  /** Exact routes when the airline publishes them; otherwise any pair of `airports` is tried. */
  routes?(): Promise<Set<string>>;
  search(from: string, to: string, date: string): Promise<Flight[]>;
  /** A link that opens this search on the airline's site, when the URL is known to work. */
  bookingUrl?(from: string, to: string, date: string): string;
}

export const routeKey = (from: string, to: string) => `${from}-${to}`;

const PREMIUM = /premium|business|first|\bvip\b/i;
export const cabinOf = (fareName: string): Cabin =>
  PREMIUM.test(fareName) ? "premium" : "economy";
