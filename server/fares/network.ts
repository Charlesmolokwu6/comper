/**
 * City-level route network for the search UI: which cities each live operator departs
 * from, and which cities are reachable from each — built from operators' own route
 * lists via the city mapping, so pickers show "Lagos", not terminal IDs.
 */
import type { Stop } from "../operators";
import { resolveCity, type MatchKind } from "./cities";

export interface NetworkDestination {
  city: string;
  name: string;
  operators: string[];
  /** Every stop for this city was matched approximately (e.g. only Mararaba for Abuja). */
  approximate: boolean;
}

export interface NetworkCity {
  city: string;
  name: string;
  /** "unlisted" = a town outside our city table, matched across operators by name only. */
  listed: boolean;
  operators: string[];
  destinations: NetworkDestination[];
}

export function buildNetwork(
  byOperator: {
    operator: string;
    origins: Stop[];
    destinations: Record<string, Stop[]>;
  }[]
): NetworkCity[] {
  const from = new Map<
    string,
    {
      name: string;
      listed: boolean;
      ops: Set<string>;
      to: Map<string, { name: string; ops: Set<string>; exact: boolean }>;
    }
  >();
  for (const { operator, origins, destinations } of byOperator) {
    for (const o of origins) {
      const om = resolveCity(o.name, o.state);
      if (!om) continue;
      let f = from.get(om.city);
      if (!f)
        from.set(
          om.city,
          (f = {
            name: om.cityName,
            listed: om.match !== "unlisted",
            ops: new Set(),
            to: new Map(),
          })
        );
      for (const d of destinations[o.id] ?? []) {
        const dm = resolveCity(d.name, d.state);
        if (!dm || dm.city === om.city) continue;
        f.ops.add(operator);
        let t = f.to.get(dm.city);
        if (!t)
          f.to.set(
            dm.city,
            (t = { name: dm.cityName, ops: new Set(), exact: false })
          );
        t.ops.add(operator);
        if (
          (dm.match as MatchKind) !== "approximate" &&
          om.match !== "approximate"
        )
          t.exact = true;
      }
    }
  }
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);
  return Array.from(from, ([city, f]) => ({
    city,
    name: f.name,
    listed: f.listed,
    operators: Array.from(f.ops).sort(),
    destinations: Array.from(f.to, ([c, t]) => ({
      city: c,
      name: t.name,
      operators: Array.from(t.ops).sort(),
      approximate: !t.exact,
    })).sort(byName),
  }))
    .filter(c => c.destinations.length)
    .sort(byName);
}
