/**
 * Common shape every operator adapter returns, so the API and the frontend can
 * treat operators uniformly. All prices are real values returned by the
 * operator's own booking backend — adapters never estimate or fill in fares.
 */

export interface Stop {
  /** Operator's own ID for this terminal/destination (opaque string). */
  id: string;
  /** Name exactly as the operator labels it. */
  name: string;
  /** State, when the operator provides one (used as a hint for city matching). */
  state?: string;
}

export interface Trip {
  id: string;
  /** "YYYY-MM-DD HH:mm", Lagos local time. */
  departure: string;
  vehicle: string;
  /** Naira, one adult, the price the operator's website charges when booking online. */
  fare: number;
  /** Undiscounted price, when the operator's site shows one crossed out. */
  listFare: number | null;
  seatsAvailable: number | null;
  seatsTotal: number | null;
  soldOut: boolean;
  /** Intermediate stops, when the operator lists them. */
  via: string[];
  /** Set when the bus ends somewhere other than the searched destination. */
  busFinalDestination: string | null;
  notes: string[];
}

export interface Operator {
  id: string;
  name: string;
  website: string;
  /** Furthest date (days from today) the operator sells; searches beyond it are skipped. */
  maxDaysAhead: number;
  /** Departure terminals in Nigeria. */
  origins(): Promise<Stop[]>;
  /** Places reachable from one origin. */
  destinations(originId: string): Promise<Stop[]>;
  /** Live trips for one origin → destination on `date` (YYYY-MM-DD). */
  search(
    originId: string,
    destinationId: string,
    date: string
  ): Promise<Trip[]>;
}

/** Operators we investigated but cannot include, and why. */
export interface UnavailableOperator {
  id: string;
  name: string;
  website: string;
  reason: string;
}
