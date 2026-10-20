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
  /** The terminal as travellers know it, e.g. "ajah" / "Ajah". */
  terminal: string;
  terminalName: string;
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
  /** Photo of the vehicle class, only when the operator's own response supplies one. */
  vehicleImage?: string | null;
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
  /** For not_on_sale: the last date the operator currently sells online. */
  onSaleUntil?: string;
  /** Departures the operator listed for the date without a fare, so none are shown. */
  unpriced?: number;
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
  /** Drop-off terminals in this city reachable from the origin city. */
  terminals: NetworkTerminal[];
}

/** A terminal as travellers know it ("Ajah", "Upper Iweka"), across operators. */
export interface NetworkTerminal {
  key: string;
  name: string;
  operators: string[];
}

export interface NetworkCity {
  city: string;
  name: string;
  listed: boolean;
  operators: string[];
  destinations: NetworkDestination[];
  /** Areas a traveller can pick as "near", with approximate locations. */
  places: Place[];
  /** Boarding terminals in this city that have routes. */
  terminals: NetworkTerminal[];
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

/**
 * Where the API lives. Empty means this site's own server; set VITE_API_BASE at build time
 * (e.g. https://api.example.com) to point the site at an API on another host or domain.
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(API_BASE + url, {
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

// ---- Flights (server/flights/router.ts) ----

export type Cabin = "economy" | "premium";

export interface FlightFare {
  /** The airline's own fare name, e.g. "Economy Saver", "ValueLite". */
  name: string;
  cabin: Cabin;
  /** One adult, taxes included, as the airline shows it. */
  price: number;
}

export interface ComparedFlight {
  flightNumber: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  /** "YYYY-MM-DD HH:mm", Lagos time. */
  departure: string;
  arrival: string;
  duration: string | null;
  stops: number;
  /** Bookable fares, cheapest first. */
  fares: FlightFare[];
  airline: string;
  airlineName: string;
  website: string;
  bookingUrl: string;
  deepLink: boolean;
  soldOut: boolean;
  fetchedAt: string;
}

export interface FlightCoverage {
  operator: string;
  operatorName: string;
  status: "fares" | "no_trips" | "no_route" | "pending" | "error";
  message?: string;
}

export interface FlightsResponse {
  from: { city: string; name: string };
  to: { city: string; name: string };
  date: string;
  flights: ComparedFlight[];
  coverage: FlightCoverage[];
  unavailableOperators: UnavailableOperator[];
}

export interface FlightNetworkCity {
  city: string;
  name: string;
  destinations: { city: string; name: string; operators: string[] }[];
}

export const fetchFlights = (
  from: string,
  to: string,
  date: string,
  signal?: AbortSignal
) =>
  getJson<FlightsResponse>(
    `/api/flights/compare?${new URLSearchParams({ from, to, date })}`,
    signal
  );

export const fetchFlightNetwork = (signal?: AbortSignal) =>
  getJson<{ complete: boolean; cities: FlightNetworkCity[] }>(
    "/api/flights/network",
    signal
  );

// ---- Places (server/places/router.ts) ----

export interface Place {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

export const fetchPlaces = (q: string, signal?: AbortSignal) =>
  getJson<{ places: Place[] }>(
    `/api/places?${new URLSearchParams({ q })}`,
    signal
  );

/** The street and area at a GPS point. */
export interface ReversePlace {
  name: string;
  /** Neighbourhood, e.g. "Lekki Phase I". */
  area: string | null;
  address: string;
  lat: number;
  lon: number;
}

export const fetchReverse = (lat: number, lon: number, signal?: AbortSignal) =>
  getJson<ReversePlace>(
    `/api/places/reverse?${new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
    })}`,
    signal
  );

// ---- Road route for the cab map (server/places/route.ts) ----

export interface RoadRoute {
  km: number;
  /** Driving time with empty roads; real trips in traffic take longer. */
  minutes: number;
  /** [lat, lon] pairs along the road. */
  line: [number, number][];
}

export const fetchRoute = (
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  signal?: AbortSignal
) =>
  getJson<RoadRoute>(
    `/api/places/route?${new URLSearchParams({
      from: `${from.lat},${from.lon}`,
      to: `${to.lat},${to.lon}`,
    })}`,
    signal
  );

// ---- Delivery (server/delivery/) ----

export interface DeliveryStation {
  id: number;
  name: string;
}

export type CourierQuote =
  | {
      id: string;
      name: string;
      status: "price";
      price: number;
      fetchedAt: string;
      bookingUrl: string;
      note: string;
    }
  | {
      id: string;
      name: string;
      status: "error";
      message: string;
      bookingUrl: string;
    };

export interface DeliveryQuoteResponse {
  couriers: CourierQuote[];
  unavailable: { name: string; reason: string }[];
}

export const fetchDeliveryStations = (signal?: AbortSignal) =>
  getJson<{ stations: DeliveryStation[] }>("/api/delivery/stations", signal);

export const fetchDeliveryQuote = (
  q: {
    from: number;
    to: number;
    weight: number;
    value: number;
    pickup?: { lat: number; lon: number } | null;
    dropoff?: { lat: number; lon: number } | null;
  },
  signal?: AbortSignal
) =>
  getJson<DeliveryQuoteResponse>(
    `/api/delivery/quote?${new URLSearchParams({
      from: String(q.from),
      to: String(q.to),
      weight: String(q.weight),
      value: String(q.value),
      ...(q.pickup && q.dropoff
        ? {
            fromLat: String(q.pickup.lat),
            fromLon: String(q.pickup.lon),
            toLat: String(q.dropoff.lat),
            toLon: String(q.dropoff.lon),
          }
        : {}),
    })}`,
    signal
  );
