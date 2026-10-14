import { fetchFares, fetchRoutes, type GuoRoute } from "../guo/client";
import type { Operator } from "./types";

let routes: { at: number; data: GuoRoute[] } | null = null;
async function getRoutes() {
  if (!routes || Date.now() - routes.at > 3_600_000)
    routes = { at: Date.now(), data: await fetchRoutes() };
  return routes.data;
}

/** GUO Transport — POST /itinerary, Laravel session + X-XSRF-TOKEN. See docs/guo-live-prices.md. */
export const guo: Operator = {
  id: "guo",
  name: "GUO Transport",
  website: "https://guotransport.com",
  maxDaysAhead: 30,

  async origins() {
    return (await getRoutes()).map(r => ({
      id: r.terminalId,
      name: r.terminalName,
      state: r.stateName,
    }));
  },

  async destinations(originId) {
    const r = (await getRoutes()).find(x => x.terminalId === originId);
    return (r?.destinations ?? []).map(d => ({ id: d.id, name: d.name }));
  },

  async search(originId, destinationId, date) {
    const res = await fetchFares(originId, destinationId, date);
    return res.trips.map(t => ({
      id: t.tripId,
      departure: t.departure,
      vehicle: t.vehicle,
      // GUO's site shows the fare after its default online coupon as the adult price.
      fare: t.onlineFare,
      listFare: t.fare > t.onlineFare ? t.fare : null,
      seatsAvailable: t.seatsAvailable,
      seatsTotal: t.seatsTotal,
      soldOut: t.seatsAvailable === 0,
      via: [],
      busFinalDestination: t.passesThrough ? t.busFinalDestination : null,
      notes: [],
    }));
  },
};
