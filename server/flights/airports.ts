/**
 * Nigerian airports served by the airlines we read, keyed by IATA code, grouped into the
 * cities travellers search for. Codes come from the airlines' own search forms.
 */
export interface Airport {
  code: string;
  city: string;
  cityName: string;
}

const A = (code: string, city: string, cityName: string): Airport => ({
  code,
  city,
  cityName,
});

export const AIRPORTS: Airport[] = [
  A("LOS", "lagos", "Lagos"),
  A("ABV", "abuja", "Abuja"),
  A("PHC", "port-harcourt", "Port Harcourt"),
  A("KAN", "kano", "Kano"),
  A("ENU", "enugu", "Enugu"),
  A("QOW", "owerri", "Owerri"),
  A("ABB", "asaba", "Asaba"),
  A("BNI", "benin", "Benin City"),
  A("ANA", "anambra", "Anambra (Umueri)"),
  A("EKK", "ekiti", "Ekiti"),
  A("ILR", "ilorin", "Ilorin"),
  A("QRW", "warri", "Warri"),
  A("BIA", "yenagoa", "Yenagoa"),
  A("SKO", "sokoto", "Sokoto"),
  A("BCU", "bauchi", "Bauchi"),
  A("DKA", "katsina", "Katsina"),
  // Max Air lists Birnin Kebbi as KEB, Umza as NBK: same airport.
  A("KEB", "birnin-kebbi", "Birnin Kebbi"),
  A("NBK", "birnin-kebbi", "Birnin Kebbi"),
  A("MIU", "maiduguri", "Maiduguri"),
  A("YOL", "yola", "Yola"),
  A("GMO", "gombe", "Gombe"),
  A("KAD", "kaduna", "Kaduna"),
  A("CBQ", "calabar", "Calabar"),
  A("JOS", "jos", "Jos"),
];

const byCode = new Map(AIRPORTS.map(a => [a.code, a]));
export const airport = (code: string) => byCode.get(code);

/** The airports in a city among the ones an airline serves (Birnin Kebbi has two codes). */
export const cityAirports = (city: string, served: string[]) =>
  served.filter(c => byCode.get(c)?.city === city);

export function cityName(city: string) {
  return AIRPORTS.find(a => a.city === city)?.cityName ?? null;
}

/** "lagos" / "Lagos" / "LOS" → "lagos". */
export function resolveFlightCity(raw: string): string | null {
  const s = raw.trim();
  const byIata = byCode.get(s.toUpperCase());
  if (byIata) return byIata.city;
  const slug = s
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");
  return AIRPORTS.some(a => a.city === slug) ? slug : null;
}
