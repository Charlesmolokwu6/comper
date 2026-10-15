import type { ComparedTrip } from "./api";

/** The three ways the results page splits fares, in tab order. */
export type Category = "luxury" | "sienna" | "regular";

export const CATEGORIES: { id: Category; label: string; note: string }[] = [
  {
    id: "luxury",
    label: "Luxury bus",
    note: "Classes the operator itself calls Luxury, Luxurious, Executive, VIP or Premium.",
  },
  {
    id: "sienna",
    label: "Sienna",
    note: "Toyota Sienna minivans (GUO sells these as their own class).",
  },
  {
    id: "regular",
    label: "Regular bus",
    note: "Everything else: Hiace, Sprinter, standard coaches and seat-count classes.",
  },
];

/** Decided from the operator's own class name only, never guessed from the price. */
export function categoryOf(vehicle: string): Category {
  const v = vehicle.toLowerCase();
  if (/\bsienna\b/.test(v)) return "sienna";
  if (/luxur|executive|\bvip\b|premium/.test(v)) return "luxury";
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
