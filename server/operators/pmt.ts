/**
 * Peace Mass Transit (pmt.ng) — Laravel site.
 *
 *   GET / → session cookies, a `csrf-token` meta tag, the departure <select>, and
 *           `destinationsByOrigin = {...}` (the full route map) inline.
 *   GET /booking/workspace/search?trip_type=one_way&from=&to=&date=&passengers=1
 *       with X-CSRF-TOKEN + X-Requested-With → JSON trips with fares.
 * PMT only sells a few days ahead (`max_booking_days`, currently 4); later dates get HTTP 422.
 */
import {
  CookieJar,
  HttpError,
  decodeHtmlEntities,
  request,
  to24h,
} from "./http";
import type { Operator, Stop } from "./types";

const BASE = "https://pmt.ng";
const SESSION_MAX_AGE_MS = 20 * 60_000;

interface Session {
  jar: CookieJar;
  csrf: string;
  origins: Stop[];
  routes: Record<string, { id: number | string; name: string }[]>;
  at: number;
}
let session: Session | null = null;

/** Pulls the JSON object assigned to `name = {...}` out of inline script. */
export function extractObjectLiteral(html: string, name: string): any {
  const start = html.indexOf(`${name} = {`);
  if (start < 0) throw new Error(`PMT page has no ${name} (layout changed?)`);
  const open = html.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}" && --depth === 0)
      return JSON.parse(html.slice(open, i + 1));
  }
  throw new Error(`Unterminated ${name} object`);
}

export function parsePmtHome(html: string) {
  const csrf = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];
  if (!csrf) throw new Error("PMT page has no csrf-token");
  const select = html.match(/<select name="from"[\s\S]*?<\/select>/)?.[0] ?? "";
  const origins = Array.from(
    select.matchAll(/<option value="(\d+)"[^>]*>([^<]+)<\/option>/g)
  ).map(m => ({ id: m[1], name: decodeHtmlEntities(m[2]).trim() }));
  return {
    csrf,
    origins,
    routes: extractObjectLiteral(html, "destinationsByOrigin"),
  };
}

async function getSession(force = false): Promise<Session> {
  if (!force && session && Date.now() - session.at < SESSION_MAX_AGE_MS)
    return session;
  const jar = new CookieJar();
  const res = await request(`${BASE}/`, {
    jar,
    headers: { Accept: "text/html" },
  });
  if (!res.ok)
    throw new HttpError(res.status, `PMT home returned HTTP ${res.status}`);
  session = { jar, ...parsePmtHome(await res.text()), at: Date.now() };
  return session;
}

export const pmt: Operator = {
  id: "pmt",
  name: "Peace Mass Transit",
  website: "https://pmt.ng",
  // PMT's own home-page search form submits GET /guest/trips/search with these fields, so the
  // same link opens the results for this exact trip (only within PMT's short sales window,
  // which is the only time we show PMT fares anyway).
  bookingUrl(originId, destinationId, date) {
    return `${BASE}/guest/trips/search?${new URLSearchParams({
      trip_type: "one_way",
      from: originId,
      to: destinationId,
      date,
      passengers: "1",
    })}`;
  },
  maxDaysAhead: 4,

  async origins() {
    return (await getSession()).origins;
  },

  async destinations(originId) {
    return ((await getSession()).routes[originId] ?? []).map(d => ({
      id: String(d.id),
      name: String(d.name).trim(),
    }));
  },

  async search(originId, destinationId, date) {
    const qs = new URLSearchParams({
      trip_type: "one_way",
      from: originId,
      to: destinationId,
      date,
      passengers: "1",
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      const s = await getSession(attempt > 0);
      const res = await request(`${BASE}/booking/workspace/search?${qs}`, {
        jar: s.jar,
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN": s.csrf,
          Referer: `${BASE}/`,
        },
      });
      if (res.status === 419 && attempt === 0) continue; // session expired
      const json = await res.json().catch(() => null);
      if (res.status === 422)
        throw new HttpError(422, `PMT: ${json?.message ?? "date not on sale"}`);
      if (!res.ok || !json?.ok)
        throw new HttpError(
          res.status,
          `PMT search failed: HTTP ${res.status}`
        );
      return (json.outbound ?? []).map((t: any) => ({
        id: String(t.id),
        // departure_at carries a +00:00 offset but is local time; the label is what the site shows.
        departure: `${t.date} ${to24h(t.departure_label)}`,
        vehicle: [
          String(t.bus ?? "")
            .replace(/'+$/, "")
            .trim(),
          t.class,
        ]
          .filter(Boolean)
          .join(" · "),
        fare: Number(t.fare),
        listFare: null,
        listFareLabel: null,
        fareNote: null,
        seatsAvailable: Number(t.seats_available),
        seatsTotal: Number(t.seats_total) || null,
        soldOut: !t.can_book || Number(t.seats_available) === 0,
        via: [],
        busFinalDestination: null,
        notes: [],
      }));
    }
    throw new Error("PMT session could not be established");
  },
};
