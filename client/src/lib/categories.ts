import type { ComparedTrip } from "./api";
import { vehicleKind } from "./vehicles";

/** The three ways the results page splits fares, in tab order. */
export type Category = "luxury" | "sienna" | "regular";

export const CATEGORIES: { id: Category; label: string; note: string }[] = [
  {
    id: "luxury",
    label: "Luxury bus",
    note: "Full-size coaches, including classes the operator calls Luxury, Executive or VIP.",
  },
  {
    id: "sienna",
    label: "Sienna",
    note: "Toyota Sienna minivans (GUO sells these as their own class).",
  },
  {
    id: "regular",
    label: "Regular bus",
    note: "Minibuses: Hiace, Sprinter and other buses of up to 18 seats.",
  },
];

/**
 * Decided from the vehicle the operator names, never guessed from the price: a full-size
 * coach is a luxury bus (as travellers call it) whatever the class name, a minibus is
 * regular even when the class says "Executive".
 */
export function categoryOf(vehicle: string): Category {
  const v = vehicle.toLowerCase();
  if (/\bsienna\b/.test(v)) return "sienna";
  const kind = vehicleKind(vehicle);
  if (kind === "minibus") return "regular";
  if (kind === "coach" || /luxur|executive|\bvip\b|premium/.test(v))
    return "luxury";
  return "regular";
}

export function splitByCategory(trips: ComparedTrip[]) {
  const out: Record<Category, ComparedTrip[]> = {
    luxury: [],
    sienna: [],
    regular: [],
  };
  for (const t of trips) out[categoryOf(t.vehicle)].push(t);
  return out;
}

/** Cheapest bookable fare among these trips, null when none are bookable. */
export function cheapestFare(trips: ComparedTrip[]): number | null {
  let min: number | null = null;
  for (const t of trips)
    if (!t.soldOut && !t.approximate && (min == null || t.fare < min))
      min = t.fare;
  if (min != null) return min;
  for (const t of trips)
    if (!t.soldOut && (min == null || t.fare < min)) min = t.fare;
  return min;
}
