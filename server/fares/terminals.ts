/**
 * Terminals within a city, as travellers know them ("Jibowu", "Ajah", "Upper Iweka"), so a
 * search can name the exact boarding or drop-off point. Grouped across operators by the
 * district we recognise (cities.ts), else by the operator's own cleaned-up stop name.
 */
import { prettyStop } from "../../shared/stops";
import type { Stop } from "../operators";
import type { CityMatch } from "./cities";

export interface Terminal {
  /** URL-safe key, e.g. "upperiweka". */
  key: string;
  name: string;
}

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/** Same place, spelled differently by different operators. */
const DISPLAY: Record<string, string> = {
  mazamaza: "Maza Maza",
  mile2: "Mile 2",
  chiscohq: "Chisco HQ",
};

/** Letters and digits only, so "Maza Maza" and "Mazamaza" are one terminal. */
export const terminalKey = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function terminalOf(stop: Stop, m: Pick<CityMatch, "area">): Terminal {
  const raw = m.area ? titleCase(m.area) : prettyStop(stop.name);
  const key = terminalKey(raw);
  return { key, name: DISPLAY[key] ?? raw };
}

/** "lagos~ajah" → { city: "lagos", terminal: "ajah" }. */
export function splitPlace(value: string) {
  const [city, terminal] = value.split("~");
  return {
    city: city ?? "",
    terminal: terminal && /^[a-z0-9]{1,60}$/.test(terminal) ? terminal : null,
  };
}
