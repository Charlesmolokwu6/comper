/**
 * A search place: a city, optionally narrowed to one of its terminals. Written "lagos~ajah"
 * in links and API calls, so a search for a specific terminal can be shared.
 */
export interface PlaceValue {
  city: string;
  terminal: string | null;
}

export function parsePlace(value: string | null | undefined): PlaceValue | null {
  if (!value) return null;
  const [city, terminal] = value.split("~");
  return city ? { city, terminal: terminal || null } : null;
}

export const placeString = (city: string, terminal?: string | null) =>
  terminal ? `${city}~${terminal}` : city;

export const cityOf = (value: string | null | undefined) =>
  parsePlace(value)?.city ?? null;
