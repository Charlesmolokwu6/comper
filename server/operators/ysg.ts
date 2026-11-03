/**
 * Young Shall Grow (YSG), through TripEase (tripease.ng), the booking site that sells YSG
 * tickets online. YSG's own site is down. The calls are the ones tripease.ng makes, with no
 * login, cookie or key:
 *
 *   GET  api.tripease.ng/api/routes                 → parks, with street addresses
 *   POST api.tripease.ng/api/trips/search-ysg-city  → YSG trips between two cities
 *
 * Search is by city, so a stop id is "<city slug>|<park id>" and results are filtered to
 * the park. YSG's numbers are a fare list: every date shows the same fares and every bus
 * shows as empty, so seat counts aren't passed on and prices are labelled as listed fares.
 */
import { requestJson, to24h } from "./http";
import type { Operator, Stop, Trip } from "./types";

const API = "https://api.tripease.ng/api";
const SITE = "https://www.tripease.ng";

interface Park {
  id: string;
  city_slug: string;
  location: string;
  terminal: string | null;
  state: string;
  city: string;
}

/** TripEase's park labels → names our city matcher knows ("Aba 1" → "Aba"). */
const PARK_NAMES: Record<string, string> = {
  "aba 1": "Aba",
  "new site terminal": "Maza Maza (New Site)",
  igoli: "Igoli",
};

const CITY_NAMES: Record<string, string> = {
  portharcourt: "Port Harcourt",
  "ideator-north": "Akokwa",
  anaocha: "Neni",
  ogoja: "Ogoja",
};

const clean = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();

/** "Lagos - Alaba", "Aba", "Onitsha - Upper Iweka". */
export function parkName(p: Pick<Park, "location" | "city" | "city_slug">) {
  const loc = PARK_NAMES[clean(p.location).toLowerCase()] ?? clean(p.location);
  const city = CITY_NAMES[p.city_slug] ?? clean(p.city);
  if (p.city_slug === "onitsha") return "Onitsha - Upper Iweka";
  return loc.toLowerCase() === city.toLowerCase() ? city : `${city} - ${loc}`;
}

const toStop = (p: Park): Stop => ({
  id: `${p.city_slug}|${p.id}`,
  name: parkName(p),
  state: p.state,
});
const split = (id: string) => {
  const [city, park] = id.split("|");
  return { city, park };
};

let parks: { at: number; list: Park[] } | null = null;
async function getParks(): Promise<Park[]> {
  if (parks && Date.now() - parks.at < 6 * 3600_000) return parks.list;
  const json = await requestJson(`${API}/routes`);
  const list = (json?.data ?? []).filter(
    (r: any) => r.provider === "ysg" && r.status === "ACTIVE"
  );
  parks = { at: Date.now(), list };
  return list;
}

/** One city search serves every park pair in it; keep it briefly. */
const searches = new Map<string, { at: number; trips: Promise<any[]> }>();
function citySearch(from: string, to: string, date: string) {
  const key = `${from}>${to}@${date}`;
  const hit = searches.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.trips;
  const trips = requestJson(`${API}/trips/search-ysg-city`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      departure_city: from,
      destination_city: to,
      date,
      passengers: 1,
    }),
  })
    .then(j => (Array.isArray(j?.data) ? j.data : []))
    // "No YSG destination routes found" (HTTP 400) = YSG doesn't run this pair.
    .catch((err: any) => {
      if (err?.status === 400) return [];
      throw err;
    });
  searches.set(key, { at: Date.now(), trips });
  trips.catch(() => searches.delete(key));
  return trips;
}

const soon = () => {
  const d = new Date(Date.now() + 3 * 86400_000);
  return d.toISOString().slice(0, 10);
};

export function toTrip(t: any, date: string): Trip {
  const fare = Number(t.price);
  const address = clean(t.departure_route?.terminal);
  return {
    id: `${t.fare_id}`,
    departure: `${date} ${to24h(String(t.departure_time))}`,
    vehicle: clean(t.bus_type) || "Bus",
    fare,
    listFare: null,
    listFareLabel: null,
    fareNote: "YSG's listed fare, through TripEase",
    // TripEase shows every YSG bus as empty on every date: not real availability.
    seatsAvailable: null,
    seatsTotal: Number(t.seats_total) || null,
    soldOut: false,
    via: [],
    busFinalDestination: null,
    notes: address ? [`Park: ${address}`] : [],
  };
}

export const ysg: Operator = {
  id: "ysg",
  name: "Young Shall Grow",
  website: SITE,
  maxDaysAhead: 30,

  async origins() {
    return (await getParks()).map(toStop);
  },

  /** Parks YSG runs to from this one, found by searching each other city once. */
  async destinations(originId) {
    const from = split(originId);
    const all = await getParks();
    const cities = Array.from(
      new Set(all.map(p => p.city_slug).filter(c => c !== from.city))
    );
    const reach = new Set<string>();
    for (const city of cities) {
      const trips = await citySearch(from.city, city, soon()).catch(() => []);
      for (const t of trips)
        if (t.departure_route?.id === from.park)
          reach.add(String(t.destination_route?.id));
    }
    return all.filter(p => reach.has(p.id)).map(toStop);
  },

  bookingUrl(originId, destinationId, date) {
    const q = new URLSearchParams({
      departure_city: split(originId).city,
      destination_city: split(destinationId).city,
      date,
      passengers: "1",
    });
    return `${SITE}/search?${q}`;
  },

  async search(originId, destinationId, date) {
    const from = split(originId);
    const to = split(destinationId);
    const trips = await citySearch(from.city, to.city, date);
    return trips
      .filter(
        (t: any) =>
          t.departure_route?.id === from.park &&
          t.destination_route?.id === to.park &&
          Number(t.price) > 0
      )
      .map((t: any) => toTrip(t, date));
  },
};
