/**
 * Ride-hailing hand-off. None of the ride apps publish live prices outside their apps, so the
 * cab tab never shows a price: it opens each app with as much of the trip filled in as that
 * app's public links allow. Uber left Nigeria
 * on 2 September 2026.
 */
export interface CabPoint {
  name: string;
  address?: string;
  lat: number;
  lon: number;
  /** The device's own location. */
  gps?: boolean;
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
    id: "bolt",
    name: "Bolt",
    link: () => "https://bolt.eu/en-ng/",
    prefills: false,
    note: "Bolt has no public trip link: paste your drop-off when Bolt opens.",
  },
  {
    id: "lagride",
    name: "LagRide",
    link: () => "https://lagride.ng/",
    prefills: false,
    note: "Lagos State's cab service, Lagos only, fixed fares by distance: paste your drop-off in the LagRide app.",
  },
  {
    id: "indrive",
    name: "inDrive",
    link: () => "https://indrive.com/en-ng/",
    prefills: false,
    note: "inDrive has no public trip link: paste your drop-off and offer your fare.",
  },
];
