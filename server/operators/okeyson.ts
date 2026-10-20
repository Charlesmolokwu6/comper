/**
 * Okeyson Transports (okeysontransports.com) — Next.js App Router + Apollo GraphQL.
 *
 * The browser never talks to the GraphQL backend directly: the search form calls
 * Next.js Server Actions (`findTerminalQuery`, `getAvailabilityQuery`), which are
 * plain POSTs to the page URL with a `Next-Action: <id>` header and a JSON array of
 * arguments, answered in React's text/x-component format. They need the anonymous
 * `app_session_token` cookie that any page visit sets ("Forbidden resource" without it).
 *
 * Action IDs change whenever Okeyson redeploys, so they are discovered at runtime by
 * scanning the page's JS chunks for createServerReference("<id>", …, "<name>").
 */
import { CookieJar, HttpError, request } from "./http";
import type { Operator, Stop } from "./types";

const BASE = "https://www.okeysontransports.com";
const PAGE = `${BASE}/en/availability`;
const SESSION_MAX_AGE_MS = 30 * 60_000;
const ACTIONS = ["findTerminalQuery", "getAvailabilityQuery"] as const;
type ActionName = (typeof ACTIONS)[number];

interface Session {
  jar: CookieJar;
  terminals: Stop[];
  at: number;
}
let session: Session | null = null;
let actionIds: Partial<Record<ActionName, string>> | null = null;

/** Concatenated React Server Components payload from self.__next_f.push([1,"…"]) calls. */
export function rscPayload(html: string) {
  return Array.from(
    html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)
  )
    .map(m => JSON.parse(`"${m[1]}"`))
    .join("");
}

export function parseTerminals(html: string): Stop[] {
  const txt = rscPayload(html);
  const at = txt.indexOf('"getTerminals":[');
  if (at < 0)
    throw new Error("Okeyson page has no getTerminals data (layout changed?)");
  const open = txt.indexOf("[", at);
  let depth = 0;
  for (let i = open; i < txt.length; i++) {
    if (txt[i] === "[") depth++;
    else if (txt[i] === "]" && --depth === 0)
      return JSON.parse(txt.slice(open, i + 1)).map((t: any) => ({
        id: t.id,
        name: String(t.name).trim(),
        state: t.address?.state ?? undefined,
      }));
  }
  throw new Error("Unterminated getTerminals array");
}

export function findActionIds(js: string): Partial<Record<ActionName, string>> {
  const out: Partial<Record<ActionName, string>> = {};
  for (const m of Array.from(
    js.matchAll(/createServerReference\)\("([0-9a-f]{40,})",[^)]*?"(\w+)"\)/g)
  ))
    if ((ACTIONS as readonly string[]).includes(m[2]))
      out[m[2] as ActionName] = m[1];
  return out;
}

async function getSession(force = false): Promise<Session> {
  if (!force && session && Date.now() - session.at < SESSION_MAX_AGE_MS)
    return session;
  const jar = new CookieJar();
  const res = await request(`${BASE}/en/home`, {
    jar,
    headers: { Accept: "text/html" },
  });
  if (!res.ok)
    throw new HttpError(res.status, `Okeyson home returned HTTP ${res.status}`);
  session = {
    jar,
    terminals: parseTerminals(await res.text()),
    at: Date.now(),
  };
  return session;
}

async function discoverActionIds() {
  const html = await (
    await request(PAGE, { headers: { Accept: "text/html" } })
  ).text();
  const chunks = Array.from(
    new Set(html.match(/\/_next\/static\/[^"\\]+\.js/g) ?? [])
  );
  const found: Partial<Record<ActionName, string>> = {};
  for (const c of chunks) {
    Object.assign(
      found,
      findActionIds(
        await (await request(`${BASE}${c}`, { throttle: false })).text()
      )
    );
    if (ACTIONS.every(a => found[a])) return (actionIds = found);
  }
  throw new Error(
    `Okeyson server actions not found (have: ${Object.keys(found).join(",") || "none"})`
  );
}

/**
 * The Server Action result row is the one carrying `data`/`error`. React's wire format
 * de-duplicates repeated objects: the second identical `vehicleClass` arrives as the
 * string "$1:data:getAvailableSchedule:…:vehicleClass", a path into row 1. Those
 * references are resolved here ("$$…" is an escaped literal "$").
 */
export function parseActionResponse(text: string): { data: any; error: any } {
  const rows = new Map<string, any>();
  for (const line of text.split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    try {
      rows.set(line.slice(0, colon), JSON.parse(line.slice(colon + 1)));
    } catch {
      // not a JSON row
    }
  }
  const resolve = (v: any, depth = 0): any => {
    if (depth > 50) return v;
    if (typeof v === "string") {
      if (v.startsWith("$$")) return v.slice(1);
      if (v === "$undefined") return undefined;
      const m = v.match(/^\$([0-9a-f]+):(.+)$/);
      if (m && rows.has(m[1])) {
        let target = rows.get(m[1]);
        for (const key of m[2].split(":")) target = target?.[key];
        return resolve(target, depth + 1);
      }
      return v;
    }
    if (Array.isArray(v)) return v.map(x => resolve(x, depth + 1));
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, resolve(x, depth + 1)])
      );
    return v;
  };
  for (const v of Array.from(rows.values()))
    if (v && typeof v === "object" && ("data" in v || "error" in v))
      return resolve(v);
  throw new Error("Okeyson server action returned no result row");
}

async function callAction(name: ActionName, ...args: unknown[]) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!actionIds?.[name]) await discoverActionIds();
    const s = await getSession(attempt === 2);
    const res = await request(PAGE, {
      method: "POST",
      jar: s.jar,
      headers: {
        "Next-Action": actionIds![name]!,
        Accept: "text/x-component",
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify(args),
    });
    const text = await res.text();
    if (res.status === 404 || /Server action not found/i.test(text)) {
      actionIds = null; // Okeyson redeployed; IDs changed
      continue;
    }
    if (!res.ok)
      throw new HttpError(
        res.status,
        `Okeyson ${name} returned HTTP ${res.status}`
      );
    const out = parseActionResponse(text);
    if (out.error === "Forbidden resource" && attempt < 2) {
      session = null; // session token expired
      continue;
    }
    return out;
  }
  throw new Error(`Okeyson ${name} failed after retries`);
}

export const okeyson: Operator = {
  id: "okeyson",
  name: "Okeyson Transports",
  website: "https://www.okeysontransports.com",
  // Trips run to 9 days ahead; day 10 onwards comes back empty (checked Oct 2026).
  maxDaysAhead: 9,

  // The results page Okeyson's own search form redirects to; verified to render this search.
  bookingUrl(originId, destinationId, date) {
    const qs = new URLSearchParams({
      from: originId,
      to: destinationId,
      adult: "1",
      date,
      child: "0",
      infant: "0",
    });
    return `${PAGE}?${qs}`;
  },

  async origins() {
    return (await getSession()).terminals;
  },

  async destinations(originId) {
    const { data, error } = await callAction("findTerminalQuery", originId);
    if (error) throw new Error(`Okeyson findTerminal: ${error}`);
    return (data?.findTerminal?.routes ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.destination?.name ?? "").trim(),
      state: r.destination?.state ?? undefined,
    }));
  },

  async search(originId, destinationId, date) {
    const { data, error } = await callAction("getAvailabilityQuery", {
      segments: [
        {
          adult: "1",
          child: "0",
          infant: "0",
          terminalId: originId,
          routeId: destinationId,
          date,
        },
      ],
    });
    if (error) throw new Error(`Okeyson availability: ${error}`);
    const schedules = data?.getAvailableSchedule?.segments?.[0]?.schedules;
    if (!Array.isArray(schedules))
      throw new Error("Okeyson availability has no schedules (API changed?)");
    return schedules.map((s: any) => ({
      id: String(s.id),
      departure: `${s.trip.date} ${String(s.trip.time).slice(0, 5)}`,
      vehicle: s.trip.vehicleClass?.name ?? "Bus",
      // totalFare for one adult is the price Okeyson's results page shows.
      fare: Number(s.totalFare),
      listFare: null,
      listFareLabel: null,
      fareNote: null,
      seatsAvailable: Number(s.trip.seatsAvailable),
      seatsTotal: null,
      soldOut: Number(s.trip.seatsAvailable) === 0,
      via: [],
      busFinalDestination: null,
      notes: [],
    }));
  },
};
