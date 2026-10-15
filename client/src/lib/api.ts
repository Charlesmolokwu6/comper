/** Types and fetchers for the fare API (server/fares/router.ts). */

export type MatchKind = "exact" | "area" | "approximate" | "unlisted";

export interface StopRef {
  id: string;
  name: string;
  city: string;
  match: MatchKind;
  note?: string;
  /** Approximate terminal location; null when we don't know where it is. */
  lat: number | null;
  lon: number | null;
}

export interface ComparedTrip {
  id: string;
  operator: string;
  operatorName: string;
  website: string;
  bookingUrl: string;
  deepLink: boolean;
  from: StopRef;
  to: StopRef;
  /** "YYYY-MM-DD HH:mm", Lagos time. */
  departure: string;
  vehicle: string;
  /** Online price for one adult, after the operator's standard online discount. */
  fare: number;
  listFare: number | null;
  listFareLabel: string | null;
  fareNote: string | null;
  seatsAvailable: number | null;
  seatsTotal: number | null;
  soldOut: boolean;
  via: string[];
  passesThrough: boolean;
  busFinalDestination: string | null;
  notes: string[];
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
  routesFound: number;
  routesSearched: number;
  routesChecked: number;
  message?: string;
}

export interface UnavailableOperator {
  id: string;
  name: string;
  website: string;
  reason: string;
}

export interface CompareResponse {
  from: { city: string; name: string };
  to: { city: string; name: string };
  date: string;
  currency: "NGN";
  trips: ComparedTrip[];
  cheapest: ComparedTrip | null;
  coverage: Coverage[];
  unavailableOperators: UnavailableOperator[];
}

export interface NetworkDestination {
  city: string;
  name: string;
  operators: string[];
  approximate: boolean;
}

export interface NetworkCity {
  city: string;
  name: string;
  listed: boolean;
  operators: string[];
  destinations: NetworkDestination[];
  /** Areas a traveller can pick as "near", with approximate locations. */
  places: Place[];
}

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export interface NetworkResponse {
  complete: boolean;
  cities: NetworkCity[];
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(body?.error ?? `Request failed (HTTP ${res.status})`);
  return body as T;
}

export const fetchNetwork = (signal?: AbortSignal) =>
  getJson<NetworkResponse>("/api/network", signal);

export const fetchCompare = (
  from: string,
  to: string,
  date: string,
  signal?: AbortSignal
) =>
  getJson<CompareResponse>(
    `/api/compare?${new URLSearchParams({ from, to, date })}`,
    signal
  );

export const tripKey = (t: ComparedTrip) =>
  `${t.operator}:${t.from.id}:${t.id}`;
