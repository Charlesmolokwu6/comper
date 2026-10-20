import type { ComparedTrip } from "./api";

export type VehicleKind = "car" | "minibus" | "coach";

/** "HIACE ULTRA" → "Hiace Ultra"; "KINGLONG  BUS · Standard" → "Kinglong Bus · Standard". */
export function prettyVehicle(name: string): string {
  const s = name.replace(/\s+/g, " ").trim();
  return s.replace(/\b[A-Z][A-Z]+\b/g, w =>
    w.length <= 3 && w !== "BUS" ? w : w[0] + w.slice(1).toLowerCase()
  );
}

/**
 * What sort of vehicle a class name describes, only when the name says so plainly.
 * Names that don't (Okeyson's "Super Executive") get null and a neutral icon.
 */
export function vehicleKind(name: string): VehicleKind | null {
  const n = name.toLowerCase();
  if (/\bsienna\b|\bcar\b|saloon|\bsuv\b/.test(n)) return "car";
  if (/hiace|sprinter|mini ?bus|\bbusa\b/.test(n)) return "minibus";
  if (/luxur|coach|king ?long|marcopolo|yutong/.test(n)) return "coach";
  const seats = Number(n.match(/(\d+)-seat/)?.[1]);
  if (seats) return seats <= 18 ? "minibus" : "coach";
  return null;
}

export const KIND_LABEL: Record<VehicleKind, string> = {
  car: "Minivan",
  minibus: "Minibus",
  coach: "Full-size bus",
};

export interface VehicleOption {
  name: string;
  kind: VehicleKind | null;
  /** Operator-supplied photo, if any trip of this class carries one. */
  image: string | null;
  /** Cheapest bookable trip of this class, null when all are sold out. */
  best: ComparedTrip | null;
  trips: number;
}

/** The vehicle classes among these trips, cheapest first, sold-out classes last. */
export function vehicleOptions(trips: ComparedTrip[]): VehicleOption[] {
  const map = new Map<string, ComparedTrip[]>();
  for (const t of trips) {
    const name = prettyVehicle(t.vehicle);
    map.set(name, [...(map.get(name) ?? []), t]);
  }
  return Array.from(map, ([name, list]) => {
    const open = list.filter(t => !t.soldOut).sort((a, b) => a.fare - b.fare);
    return {
      name,
      kind: vehicleKind(name),
      image: list.find(t => t.vehicleImage)?.vehicleImage ?? null,
      best: open[0] ?? null,
      trips: list.length,
    };
  }).sort(
    (a, b) =>
      (a.best?.fare ?? Infinity) - (b.best?.fare ?? Infinity) ||
      a.name.localeCompare(b.name)
  );
}
