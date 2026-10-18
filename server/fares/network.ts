/**
 * City-level route network for the search UI: which cities each live operator departs
 * from, and which cities are reachable from each — built from operators' own route
 * lists via the city mapping, so pickers show "Lagos", not terminal IDs.
 */
import type { Stop } from "../operators";
import { resolveCity, type MatchKind } from "./cities";
import { placesNear } from "./geo";
import { terminalOf, type Terminal } from "./terminals";

export interface NetworkDestination {
  city: string;
  name: string;
  operators: string[];
  /** Every stop for this city was matched approximately (e.g. only Mararaba for Abuja). */
  approximate: boolean;
  /** Drop-off terminals in this city reachable from the origin city. */
  terminals: NetworkTerminal[];
}

export interface NetworkTerminal extends Terminal {
  operators: string[];
}

export interface NetworkCity {
  city: string;
  name: string;
  /** "unlisted" = a town outside our city table, matched across operators by name only. */
  listed: boolean;
  operators: string[];
  destinations: NetworkDestination[];
  /** Neighbourhoods/districts a traveller can pick as "near", with approximate locations. */
  places: { name: string; lat: number; lon: number }[];
  /** Boarding terminals in this city that have routes. */
  terminals: NetworkTerminal[];
}

type TerminalMap = Map<string, { name: string; ops: Set<string> }>;

const addTerminal = (map: TerminalMap, t: Terminal, operator: string) => {
  let e = map.get(t.key);
  if (!e) map.set(t.key, (e = { name: t.name, ops: new Set() }));
  e.ops.add(operator);
};

const terminalList = (map: TerminalMap): NetworkTerminal[] =>
  Array.from(map, ([key, e]) => ({
    key,
    name: e.name,
    operators: Array.from(e.ops).sort(),
  })).sort((a, b) => a.name.localeCompare(b.name));

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
      terms: TerminalMap;
      to: Map<
        string,
        { name: string; ops: Set<string>; exact: boolean; terms: TerminalMap }
      >;
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
            terms: new Map(),
            to: new Map(),
          })
        );
      for (const d of destinations[o.id] ?? []) {
        const dm = resolveCity(d.name, d.state);
        if (!dm || dm.city === om.city) continue;
        f.ops.add(operator);
        addTerminal(f.terms, terminalOf(o, om), operator);
        let t = f.to.get(dm.city);
        if (!t)
          f.to.set(
            dm.city,
            (t = {
              name: dm.cityName,
              ops: new Set(),
              exact: false,
              terms: new Map(),
            })
          );
        t.ops.add(operator);
        addTerminal(t.terms, terminalOf(d, dm), operator);
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
      terminals: terminalList(t.terms),
    })).sort(byName),
    places: placesNear(city),
    terminals: terminalList(f.terms),
  }))
    .filter(c => c.destinations.length)
    .sort(byName);
}
