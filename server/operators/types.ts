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
  /**
   * Naira, one adult: the price the operator's website charges when booking online,
   * i.e. after any discount the operator applies to every online booking (GUO's default
   * coupon, Chisco's online discount). Same basis for every operator; sorting and
   * "cheapest" use only this field.
   */
  fare: number;
  /** Price before that standard online discount, when the operator shows one. Display only. */
  listFare: number | null;
  /** What `listFare` is, e.g. "Bus fare". */
  listFareLabel: string | null;
  /** Why `fare` differs from `listFare`, e.g. "with GUO's online coupon GUOGoesOnline (2% off)". */
  fareNote: string | null;
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
  /**
   * The operator's own current booking window (YYYY-MM-DD, inclusive), when it publishes
   * one. Dates outside it are reported as not on sale instead of searched.
   */
  salesWindow?(): Promise<{ first: string; last: string } | null>;
  /** Departure terminals in Nigeria. */
  origins(): Promise<Stop[]>;
  /** Places reachable from one origin. */
  destinations(originId: string): Promise<Stop[]>;
  /**
   * A link that opens this exact search on the operator's site, only where the URL
   * format is known to work. Omitted → link to `website`.
   */
  bookingUrl?(originId: string, destinationId: string, date: string): string;
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
