/**
 * Ride-hailing hand-off. None of the ride apps publish live prices outside their apps, so the
 * cab tab never shows a price: it opens each app with as much of the trip filled in as that
 * app's public links allow.
 */
export interface CabPoint {
  name: string;
  address?: string;
  lat: number;
  lon: number;
  /** The device's own location: Uber can use its own GPS fix instead. */
  gps?: boolean;
}

const uberLocation = (p: CabPoint) =>
  JSON.stringify({
    latitude: p.lat,
    longitude: p.lon,
    addressLine1: p.name,
    addressLine2: p.address ?? "",
  });

/**
 * Uber's documented universal link (developer.uber.com/docs/deep-linking): opens the Uber app
 * (or m.uber.com) with pickup and drop-off set. Without a pickup Uber uses the rider's location.
 */
export function uberLink(pickup: CabPoint | null, dropoff: CabPoint) {
  const qs = new URLSearchParams();
  if (pickup && !pickup.gps) qs.set("pickup", uberLocation(pickup));
  qs.set("drop[0]", uberLocation(dropoff));
  return `https://m.uber.com/looking?${qs}`;
}

export interface CabProvider {
  id: string;
  name: string;
  /** Opens the app with the trip filled in, or just the app. */
  link: (pickup: CabPoint | null, dropoff: CabPoint) => string;
  prefills: boolean;
  note: string;
}

export const CAB_PROVIDERS: CabProvider[] = [
  {
    id: "uber",
    name: "Uber",
    link: uberLink,
    prefills: true,
    note: "Opens Uber with your pickup and drop-off filled in.",
  },
  {
    id: "bolt",
    name: "Bolt",
    link: () => "https://bolt.eu/en-ng/",
    prefills: false,
    note: "Bolt has no public trip link: paste your drop-off when Bolt opens.",
  },
  {
    id: "indrive",
    name: "inDrive",
    link: () => "https://indrive.com/en-ng/",
    prefills: false,
    note: "inDrive has no public trip link: paste your drop-off and offer your fare.",
  },
];
