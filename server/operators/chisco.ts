/**
 * Chisco Transport (chiscotransport.com.ng) — Next.js site with its own /api proxy.
 *
 *   GET  /api/terminals                → departure terminals (split into "am"/"pm" entries)
 *   GET  /api/terminals/{id}           → destinations from one terminal
 *   POST /api/bookings/search-buses    → trips with fares
 * No login, cookie or token. The results page shows `adultFare` as the price and
 * `farePrice` crossed out (online discount).
 */
import { FOREIGN, requestJson, to24h } from "./http";
import { NotOnSaleError, type Operator, type Stop } from "./types";

const BASE = "https://chiscotransport.com.ng";

const toStop = (t: any): Stop => ({
  id: String(t.id),
  name: String(t.name).trim(),
  state: t.stateName || undefined,
});

export const chisco: Operator = {
  id: "chisco",
  name: "Chisco Transport",
  website: "https://chiscotransport.com.ng",
  // "You can not book beyond 14 days in advance" (checked Oct 2026, every route).
  maxDaysAhead: 14,

  async origins() {
    const json = await requestJson(`${BASE}/api/terminals`);
    return (json?.data ?? [])
      .filter((t: any) => !FOREIGN.test(t.name))
      .map(toStop);
  },

  async destinations(originId) {
    const json = await requestJson(
      `${BASE}/api/terminals/${encodeURIComponent(originId)}`
    );
    return (json?.data ?? []).map(toStop);
  },

  async search(originId, destinationId, date) {
    const json = await requestJson(`${BASE}/api/bookings/search-buses`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        tripType: 0,
        departureDate: date,
        departureTerminalId: Number(originId),
        destinationTerminalId: Number(destinationId),
        numberOfAdults: 1,
        numberOfChildren: 0,
        client: "web",
      }),
    });
    const data = json?.data;
    // "202 No available trip for the selected route currently" = no trips that day.
    if (data?.code === "202") return [];
    const beyond = /beyond (\d+) days/i.exec(
      `${data?.code} ${data?.shortDescription}`
    );
    if (beyond) throw new NotOnSaleError(Number(beyond[1]));
    if (data?.code !== "200")
      throw new Error(
        `Chisco search returned code ${data?.code}: ${data?.shortDescription}`
      );
    return (data.object?.departures ?? []).map((t: any) => {
      const fare = Number(t.adultFare);
      const list = Number(t.farePrice);
      return {
        id: String(t.tripId),
        departure: `${String(t.departureDate).slice(0, 10)} ${to24h(t.departureTime)}`,
        // Chisco's vehicleName holds a luggage note, not a bus type; report the seat count.
        vehicle: `${t.totalNumberOfSeats}-seat bus`,
        fare,
        listFare: list > fare ? list : null,
        listFareLabel: list > fare ? "Before online discount" : null,
        fareNote: list > fare ? "with Chisco's online booking discount" : null,
        seatsAvailable: Number(t.availableNumberOfSeats),
        seatsTotal: Number(t.totalNumberOfSeats) || null,
        soldOut: Number(t.availableNumberOfSeats) === 0,
        via: [],
        busFinalDestination: null,
        notes: t.vehicleName ? [String(t.vehicleName).trim()] : [],
      };
    });
  },
};
