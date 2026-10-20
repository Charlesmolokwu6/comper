/**
 * ABC Transport (abctransport.com) — runs on Bitla's TicketSimply platform.
 *
 * Every booking action is POST /api/cms_booking_engine.json, selected by a `query`
 * code. Search is query "q2". No login, cookie or CSRF token is needed. The site's
 * ModSecurity rejects the bare domain and headless-browser user agents, so we use
 * www. and a normal browser user agent.
 */
import { FOREIGN, requestJson, to24h } from "./http";
import type { Operator, Stop } from "./types";

const BASE = "https://www.abctransport.com";

interface Pair {
  origin: { id: number; name: string };
  destination: { id: number; name: string };
}

let pairs: { at: number; data: Pair[] } | null = null;
async function getPairs() {
  if (!pairs || Date.now() - pairs.at > 3_600_000)
    pairs = {
      at: Date.now(),
      data: await requestJson(`${BASE}/cms_js_content.json`),
    };
  return pairs.data;
}

const stop = (c: { id: number; name: string }): Stop => ({
  id: String(c.id),
  name: c.name,
});

export const abc: Operator = {
  id: "abc",
  name: "ABC Transport",
  website: "https://www.abctransport.com",
  // Trips run to 29 days ahead; day 30 onwards comes back empty (checked Oct 2026).
  maxDaysAhead: 29,

  async origins() {
    const seen = new Map<string, Stop>();
    for (const p of await getPairs())
      if (!FOREIGN.test(p.origin.name))
        seen.set(String(p.origin.id), stop(p.origin));
    return Array.from(seen.values());
  },

  async destinations(originId) {
    return (await getPairs())
      .filter(p => String(p.origin.id) === originId)
      .map(p => stop(p.destination));
  },

  async search(originId, destinationId, date) {
    const json = await requestJson(`${BASE}/api/cms_booking_engine.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        Referer: `${BASE}/search-results`,
      },
      body: JSON.stringify({
        from: originId,
        to: destinationId,
        depart: date,
        triptype: "oneway",
        query: "q2",
      }),
    });
    if (!Array.isArray(json?.reservations))
      throw new Error(
        "ABC q2 response has no reservations array (API changed?)"
      );
    return json.reservations.map((r: any) => {
      const fare = Number(r.fare_amt);
      const strike = Number(
        Object.values<any>(r.fare_content ?? {})[0]?.adult_fares?.strike_fare
      );
      const via = (r.via_route ?? [])
        .map((v: string) => v.trim())
        .filter(Boolean);
      return {
        id: String(r.res_id),
        departure: `${date} ${to24h(r.dept_date_num)}`,
        vehicle: r.coach_title || r.coach_name,
        // ABC attaches a photo of the coach type to each trip on its own results page.
        vehicleImage:
          r.is_coach_image_enable && /^https:\/\//.test(r.coach_image ?? "")
            ? String(r.coach_image)
            : null,
        fare,
        listFare: strike > fare ? strike : null,
        listFareLabel: strike > fare ? "Before discount" : null,
        fareNote: strike > fare ? "ABC's discounted online fare" : null,
        seatsAvailable: Number(r.available_seats),
        seatsTotal: null,
        soldOut: Number(r.available_seats) === 0,
        via,
        busFinalDestination: null,
        notes: r.route_number
          ? [`Service: ${String(r.route_number).trim()}`]
          : [],
      };
    });
  },
};
