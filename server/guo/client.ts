/**
 * GUO Transport (guotransport.com) client — plain HTTP, no browser.
 *
 * How GUO's booking search works (verified 2026-10 by driving the real UI
 * with Playwright and capturing its network traffic):
 *   1. GET /  → sets the Laravel cookies `XSRF-TOKEN` + `guo_transport_session`,
 *      and embeds every terminal + its destinations in the Inertia `data-page`
 *      attribute (props.allRoutes).
 *   2. The search button POSTs JSON to /itinerary (NOT /api/alloptions) with
 *      the X-XSRF-TOKEN header. The response contains schedule.BusList[] with
 *      FareAmount, seats, vehicle type and departure time.
 */

import { request } from "../operators/http";

const BASE_URL = "https://guotransport.com";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const TIMEOUT_MS = 30_000;
// Laravel sessions outlive this comfortably; refresh well before expiry.
const SESSION_MAX_AGE_MS = 20 * 60_000;

export interface GuoDestination {
  id: string;
  name: string;
  stateId: string;
  /** Loading-office ID of GUO's main terminal in that city ("0" if none). */
  mainTerminalId: string;
}

export interface GuoRoute {
  terminalId: string;
  terminalName: string;
  stateName: string;
  destinations: GuoDestination[];
}

export interface GuoTrip {
  tripId: string;
  departure: string; // "YYYY-MM-DD HH:mm" (Lagos local time)
  period: string; // Morning / Evening …
  vehicle: string; // HIACE ULTRA, SIENNA, LUXURY …
  /** Base fare per adult in Naira, exactly as GUO returns it. */
  fare: number;
  /** Adult fare after GUO's default online coupon (what their site shows as "Adult"). */
  onlineFare: number;
  seatsAvailable: number;
  seatsTotal: number;
  fromTerminal: string;
  /** Where this bus ends its trip; may differ from the searched destination (bus passes through it). */
  busFinalDestination: string;
  passesThrough: boolean;
}

export interface GuoCoupon {
  name: string;
  /** Percent off, when the coupon is a percentage. */
  percent: number | null;
  /** Naira off, when the coupon is a fixed amount. */
  amount: number | null;
}

export interface GuoFareResult {
  /** GUO's default online coupon that `onlineFare` includes, if any. */
  coupon: GuoCoupon | null;
  terminalId: string;
  destinationId: string;
  date: string;
  trips: GuoTrip[];
  fetchedAt: string;
}

interface Session {
  cookies: Map<string, string>;
  createdAt: number;
  homeHtml: string;
}

let session: Session | null = null;

function storeCookies(jar: Map<string, string>, res: Response) {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>) {
  return Array.from(jar, ([k, v]) => `${k}=${v}`).join("; ");
}

async function getSession(force = false): Promise<Session> {
  if (!force && session && Date.now() - session.createdAt < SESSION_MAX_AGE_MS)
    return session;
  const res = await request(`${BASE_URL}/`, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GUO home page returned HTTP ${res.status}`);
  const cookies = new Map<string, string>();
  storeCookies(cookies, res);
  if (!cookies.has("XSRF-TOKEN"))
    throw new Error("GUO did not set an XSRF-TOKEN cookie");
  session = { cookies, createdAt: Date.now(), homeHtml: await res.text() };
  return session;
}

function decodeHtmlEntities(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Extracts the Inertia page object embedded in a GUO HTML page. */
export function parseInertiaPage(html: string): {
  component: string;
  props: Record<string, any>;
} {
  const m = html.match(/data-page="([^"]*)"/);
  if (!m)
    throw new Error(
      "GUO page has no Inertia data-page attribute (site layout changed?)"
    );
  return JSON.parse(decodeHtmlEntities(m[1]));
}

export function parseRoutes(allRoutes: any[]): GuoRoute[] {
  return allRoutes
    .filter(r => r.LoadinID)
    .map(r => ({
      terminalId: String(r.LoadinID),
      terminalName: r.Loading_Office,
      stateName: r.state_name,
      destinations: (r.destinations ?? [])
        .filter((d: any) => d.DestinationID)
        .map((d: any) => ({
          id: String(d.DestinationID),
          name: d.Destination,
          stateId: String(d.StateID),
          mainTerminalId: String(d.MainTerminalID ?? "0"),
        })),
    }));
}

/** All bookable (domestic, non-"WC") departure terminals and the destinations each serves. */
export async function fetchRoutes(): Promise<GuoRoute[]> {
  const s = await getSession();
  return parseRoutes(parseInertiaPage(s.homeHtml).props.allRoutes ?? []);
}

function onlineFare(fare: number, coupon: any): number {
  if (!coupon) return fare;
  if (String(coupon.usePercent) === "1") {
    return Math.round(fare * (1 - Number(coupon.couponpercent) / 100));
  }
  return Math.max(0, fare - Number(coupon.couponvalue || 0));
}

export function parseCoupon(json: any): GuoCoupon | null {
  const c = json?.bookingSettings?.couponDiscount;
  if (!c) return null;
  const pct = String(c.usePercent) === "1";
  return {
    name: String(c.couponname ?? ""),
    percent: pct ? Number(c.couponpercent) : null,
    amount: pct ? null : Number(c.couponvalue || 0),
  };
}

export function parseItinerary(json: any, destinationId: string): GuoTrip[] {
  const busList: any[] = json?.schedule?.BusList ?? [];
  const coupon = json?.bookingSettings?.couponDiscount;
  return busList.map(b => {
    const fare = Number(b.FareAmount);
    const blocked = new Set<number>((b.BlockedSeat ?? []).map(Number));
    const seats: number[] = (b.AvailableSeat ?? []).map(Number);
    // Trip_Date is the travel day; Departure_Time's date part is sometimes stale on GUO's side.
    const day = String(b.Trip_Date).slice(0, 10);
    const time = String(b.Departure_Time).slice(11, 16);
    return {
      tripId: String(b.TripID),
      departure: `${day} ${time}`,
      period: b.BookingPeriod,
      vehicle: b.VehicleGroupTag_Name,
      fare,
      onlineFare: onlineFare(fare, coupon),
      seatsAvailable: seats.filter(n => !blocked.has(n)).length,
      seatsTotal: Number(b.NOfPassengers) || seats.length,
      fromTerminal: b.Loading_Office,
      busFinalDestination: b.Destination,
      passesThrough: String(b.DestinationID) !== String(destinationId),
    };
  });
}

/**
 * Live fares for one terminal → destination on one date (YYYY-MM-DD).
 * One HTTP request (plus a session GET at most every 20 minutes).
 */
export async function fetchFares(
  terminalId: string,
  destinationId: string,
  date: string
): Promise<GuoFareResult> {
  if (!/^\d+$/.test(terminalId) || !/^\d+$/.test(destinationId))
    throw new Error("IDs must be numeric");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("date must be YYYY-MM-DD");

  const body = JSON.stringify({
    one_way: true,
    selectedTerminal: terminalId,
    selectedDestination: destinationId,
    selectedTripDate: date,
    selectedReturnTerminal: "",
    selectedReturnDestination: "",
    selectedReturnTripDate: "",
    isInterRoute: false,
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await getSession(attempt > 0);
    const res = await request(`${BASE_URL}/itinerary`, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-XSRF-TOKEN": decodeURIComponent(s.cookies.get("XSRF-TOKEN") ?? ""),
        Referer: `${BASE_URL}/`,
        Cookie: cookieHeader(s.cookies),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    storeCookies(s.cookies, res);
    // 419 = Laravel CSRF/session expired → retry once with a fresh session.
    if (res.status === 419 && attempt === 0) continue;
    if (!res.ok) throw new Error(`GUO /itinerary returned HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.schedule)
      throw new Error("GUO /itinerary response has no schedule (API changed?)");
    return {
      terminalId,
      destinationId,
      date,
      coupon: parseCoupon(json),
      trips: parseItinerary(json, destinationId),
      fetchedAt: new Date().toISOString(),
    };
  }
  throw new Error("GUO session could not be established");
}

/** Raw /terminals page props (addresses, lat/long, phones) — see terminals.ts. */
export async function fetchTerminalsPage(): Promise<any[]> {
  const res = await request(`${BASE_URL}/terminals`, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GUO /terminals returned HTTP ${res.status}`);
  return parseInertiaPage(await res.text()).props.terminals ?? [];
}
