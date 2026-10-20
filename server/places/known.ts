/** Places matched locally before asking OpenStreetMap: major airports and the areas we know. */
import areas from "../fares/data/areas.json";

export interface Place {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

/** Well-known places matched locally first: airports and the areas we already know. */
const AIRPORTS: Place[] = [
  {
    name: "Murtala Muhammed International Airport (LOS)",
    address: "Ikeja, Lagos",
    lat: 6.5774,
    lon: 3.3212,
  },
  {
    name: "Murtala Muhammed Domestic Terminal (MMA1)",
    address: "Ikeja, Lagos",
    lat: 6.5838,
    lon: 3.3297,
  },
  {
    name: "MMA2 Domestic Terminal",
    address: "Ikeja, Lagos",
    lat: 6.5786,
    lon: 3.3315,
  },
  {
    name: "Nnamdi Azikiwe International Airport (ABV)",
    address: "Abuja, FCT",
    lat: 9.0068,
    lon: 7.2632,
  },
  {
    name: "Port Harcourt International Airport (PHC)",
    address: "Omagwa, Rivers",
    lat: 5.0155,
    lon: 6.9496,
  },
  {
    name: "Mallam Aminu Kano International Airport (KAN)",
    address: "Kano",
    lat: 12.0476,
    lon: 8.5246,
  },
  {
    name: "Akanu Ibiam International Airport (ENU)",
    address: "Enugu",
    lat: 6.4743,
    lon: 7.562,
  },
  {
    name: "Sam Mbakwe Airport (QOW)",
    address: "Owerri, Imo",
    lat: 5.4271,
    lon: 7.206,
  },
];
const CITY_NAMES: Record<string, string> = {
  lagos: "Lagos",
  abuja: "Abuja, FCT",
  "port-harcourt": "Port Harcourt, Rivers",
};
const KNOWN: Place[] = [
  ...AIRPORTS,
  ...Object.entries(
    (
      areas as {
        neighbourhoods: Record<
          string,
          { name: string; lat: number; lon: number }[]
        >;
      }
    ).neighbourhoods
  ).flatMap(([city, list]) =>
    list.map(n => ({
      name: n.name,
      address: CITY_NAMES[city] ?? city,
      lat: n.lat,
      lon: n.lon,
    }))
  ),
];

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 1);

/** Known places whose name contains every word typed (in any order). */
export function knownMatches(q: string, limit = 3): Place[] {
  const ws = words(q).filter(
    w => !["international", "airport", "the"].includes(w)
  );
  if (!ws.length)
    return q.toLowerCase().includes("airport") ? AIRPORTS.slice(0, limit) : [];
  return KNOWN.filter(p => {
    const hay = `${p.name} ${p.address}`.toLowerCase();
    return ws.every(w => hay.includes(w));
  }).slice(0, limit);
}
