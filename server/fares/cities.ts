/**
 * Maps operators' stop labels to canonical cities so "Lagos → Abuja" finds matching
 * routes across operators, e.g. "Lagos (Jibowu--am)", "LAGOS - JIBOWU", "Jibowu" and
 * "Lagos - Jibowu Terminal" are all Lagos.
 *
 * Every match says how it was made:
 *   exact       the label names the city
 *   area        the label names a known district/terminal area of the city (Jibowu → Lagos)
 *   approximate the label is ambiguous or the place is outside the city proper; `note` says why
 *   unlisted    not in our table; matched to other operators only by identical name
 */

export type MatchKind = "exact" | "area" | "approximate" | "unlisted";

export interface CityMatch {
  city: string; // canonical key, e.g. "port-harcourt"
  cityName: string;
  match: MatchKind;
  note?: string;
  /** Lower is a more central/canonical stop for the city (used to pick which stops to search). */
  rank: number;
}

interface CityDef {
  name: string;
  state: string;
  areas?: string[];
  /** Areas sold under this city that are really outside it. */
  approxAreas?: Record<string, string>;
  aliases?: string[];
}

const CITIES: Record<string, CityDef> = {
  lagos: {
    name: "Lagos",
    state: "Lagos",
    areas: [
      "jibowu",
      "ajah",
      "alaba",
      "ojo",
      "ojo alaba",
      "ojo barracks",
      "coker",
      "ejigbo",
      "iba",
      "iyana iba",
      "iyana school",
      "ikorodu",
      "ikotun",
      "iyana ipaja",
      "maza maza",
      "mazamaza",
      "first gate",
      "okota",
      "cele",
      "otto",
      "agege",
      "ikosi",
      "ketu",
      "ojota",
      "oshodi",
      "bolade",
      "amuwo",
      "empire",
      "alafia",
      "ogba",
      "anthony",
      "apapa",
      "berger",
      "iddo",
      "mile2",
      "mile 2",
      "volks",
      "igando",
      "egbeda",
      "chisco hq",
    ],
    approxAreas: {
      epe: "Epe is in Lagos State but about 70 km from central Lagos",
    },
  },
  abuja: {
    name: "Abuja",
    state: "FCT",
    aliases: ["fct"],
    areas: [
      "utako",
      "jabi",
      "zuba",
      "kubwa",
      "nyanya",
      "gwagwalada",
      "gwarimpa",
      "lugbe",
      "deidei",
      "area 3",
      "airport road",
      "berger fct",
    ],
    approxAreas: {
      mararaba: "Mararaba is in Nasarawa State, just outside the FCT",
      maraba: "Maraba (Mararaba) is in Nasarawa State, just outside the FCT",
    },
  },
  "port-harcourt": {
    name: "Port Harcourt",
    state: "Rivers",
    aliases: ["port harcourt", "portharcourt", "ph", "phc"],
    areas: ["mile 1", "waterline", "rumuodumaya", "choba", "uniport"],
  },
  owerri: { name: "Owerri", state: "Imo", areas: ["egbu road"] },
  enugu: { name: "Enugu", state: "Enugu", areas: ["holyghost"] },
  onitsha: { name: "Onitsha", state: "Anambra", areas: ["upper iweka"] },
  asaba: { name: "Asaba", state: "Delta" },
  awka: { name: "Awka", state: "Anambra", areas: ["ifite awka", "ifite"] },
  "awka-etiti": {
    name: "Awka-Etiti",
    state: "Anambra",
    aliases: ["awka etiti"],
  },
  benin: {
    name: "Benin City",
    state: "Edo",
    areas: ["ugbowo", "benin bypass"],
  },
  calabar: { name: "Calabar", state: "Cross River", areas: ["ettagbor"] },
  aba: {
    name: "Aba",
    state: "Abia",
    areas: ["milverton", "factory road", "aba ngwa"],
  },
  uyo: { name: "Uyo", state: "Akwa Ibom" },
  umuahia: { name: "Umuahia", state: "Abia" },
  nnewi: { name: "Nnewi", state: "Anambra" },
  ekwulobia: { name: "Ekwulobia", state: "Anambra" },
  ihiala: { name: "Ihiala", state: "Anambra" },
  umunze: { name: "Umunze", state: "Anambra" },
  amichi: { name: "Amichi", state: "Anambra" },
  abakaliki: { name: "Abakaliki", state: "Ebonyi" },
  afikpo: { name: "Afikpo", state: "Ebonyi" },
  ogoja: { name: "Ogoja", state: "Cross River" },
  ikom: { name: "Ikom", state: "Cross River" },
  warri: { name: "Warri", state: "Delta" },
  sapele: { name: "Sapele", state: "Delta" },
  ughelli: { name: "Ughelli", state: "Delta", aliases: ["ugheli"] },
  agbor: { name: "Agbor", state: "Delta" },
  ibadan: { name: "Ibadan", state: "Oyo" },
  "ijebu-ode": {
    name: "Ijebu Ode",
    state: "Ogun",
    aliases: ["ijebu ode", "ijebuode"],
  },
  sagamu: { name: "Sagamu", state: "Ogun", aliases: ["shagamu"] },
  ore: { name: "Ore", state: "Ondo" },
  okene: { name: "Okene", state: "Kogi" },
  lokoja: { name: "Lokoja", state: "Kogi" },
  auchi: { name: "Auchi", state: "Edo" },
  ekpoma: { name: "Ekpoma", state: "Edo" },
  kaduna: { name: "Kaduna", state: "Kaduna" },
  jos: { name: "Jos", state: "Plateau" },
  gombe: { name: "Gombe", state: "Gombe" },
  jalingo: { name: "Jalingo", state: "Taraba" },
  makurdi: { name: "Makurdi", state: "Benue", aliases: ["markurdi"] },
  nsukka: { name: "Nsukka", state: "Enugu" },
  "obollo-afor": {
    name: "Obollo-Afor",
    state: "Enugu",
    aliases: ["obollo afor"],
  },
  yenagoa: {
    name: "Yenagoa",
    state: "Bayelsa",
    approxAreas: {
      bayelsa: "label names Bayelsa State, not a town; assumed Yenagoa",
    },
  },
  mbaise: { name: "Mbaise", state: "Imo" },
  orlu: { name: "Orlu", state: "Imo" },
  okigwe: { name: "Okigwe", state: "Imo" },
  "ikot-ekpene": {
    name: "Ikot Ekpene",
    state: "Akwa Ibom",
    aliases: ["ikot ekpene"],
  },
  cotonou: {
    name: "Cotonou",
    state: "Benin Republic",
    aliases: ["benin republic"],
  },
  accra: { name: "Accra", state: "Ghana" },
  lome: { name: "Lomé", state: "Togo", aliases: ["lome"] },
};

/** Labels that are both a state and a city: "Enugu (Awka)" names the state, not Enugu city. */
const STATE_NAMES = new Set([
  "lagos",
  "enugu",
  "gombe",
  "kaduna",
  "ebonyi",
  "bayelsa",
]);

interface Alias {
  text: string;
  city: string;
  kind: "exact" | "area" | "approximate";
  note?: string;
  rank: number;
}

// Areas are listed most-central first; rank orders them after the city name itself.
const ALIASES: Alias[] = Object.entries(CITIES).flatMap(([key, c]) => [
  {
    text: c.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim(),
    city: key,
    kind: "exact" as const,
    rank: 0,
  },
  ...(c.aliases ?? []).map(text => ({
    text,
    city: key,
    kind: "exact" as const,
    rank: 0,
  })),
  ...(c.areas ?? []).map((text, i) => ({
    text,
    city: key,
    kind: "area" as const,
    rank: 10 + i,
  })),
  ...Object.entries(c.approxAreas ?? {}).map(([text, note]) => ({
    text,
    city: key,
    kind: "approximate" as const,
    note,
    rank: 1000,
  })),
]);
// "Benin City" is listed as "benin" by every operator.
ALIASES.push({ text: "benin", city: "benin", kind: "exact", rank: 0 });

/** Lower-case, drop am/pm session markers and "terminal", turn punctuation into spaces. */
export function cleanLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/-{2,}\s*(am|pm)\b/g, " ")
    .replace(/\b(terminal|town|int'?l|local|new)\b/g, " ")
    .replace(/[^a-z0-9()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const slug = (s: string) => s.replace(/[()]/g, "").trim().replace(/\s+/g, "-");
const titleCase = (s: string) => s.replace(/\b[a-z]/g, c => c.toUpperCase());

/** Returns null for labels that are not places (e.g. GUO's "RESCHEDULE MY TRIP"). */
export function resolveCity(label: string, state?: string): CityMatch | null {
  const text = cleanLabel(label);
  if (!text || /\breschedule\b/.test(text)) return null;
  const flat = ` ${text.replace(/[()]/g, " ").replace(/\s+/g, " ")} `;
  const inner = text.match(/\(([^)]*)\)/)?.[1]?.trim();

  // Every alias occurrence; drop ones contained in a longer hit ("benin" in "benin republic").
  let hits = ALIASES.flatMap(a => {
    const out: { a: Alias; start: number; end: number }[] = [];
    let i = flat.indexOf(` ${a.text} `);
    while (i >= 0) {
      out.push({ a, start: i + 1, end: i + 1 + a.text.length });
      i = flat.indexOf(` ${a.text} `, i + 1);
    }
    return out;
  });
  hits = hits.filter(
    h =>
      !hits.some(
        o =>
          o !== h &&
          o.start <= h.start &&
          o.end >= h.end &&
          o.end - o.start > h.end - h.start
      )
  );

  if (hits.length) {
    let cities = new Set(hits.map(h => h.a.city));
    // "Enugu (Awka)": the state-name part only says which state the place is in.
    if (cities.size > 1) {
      const specific = hits.filter(
        h => !(STATE_NAMES.has(h.a.text) && h.a.kind === "exact")
      );
      if (specific.length) {
        hits = specific;
        cities = new Set(hits.map(h => h.a.city));
      }
    }
    let chosen = hits.sort((x, y) => x.start - y.start)[0];
    // "ABUJA - MARARABA": the city name doesn't make an outlying area exact.
    const approx = hits.find(
      h => h.a.city === chosen.a.city && h.a.kind === "approximate"
    );
    let note = approx?.a.note ?? chosen.a.note;
    let kind: MatchKind = approx ? "approximate" : chosen.a.kind;
    if (cities.size > 1) {
      // Prefer the part in parentheses ("Abuja (Lokoja)" is Lokoja), else the first place named.
      const inParens =
        inner && hits.find(h => ` ${inner} `.includes(` ${h.a.text} `));
      if (inParens) chosen = inParens;
      kind = "approximate";
      const names = Array.from(cities, c => CITIES[c].name).join(" and ");
      note = `label "${label.trim()}" names ${names}; treated as ${CITIES[chosen.a.city].name}`;
    }
    // A bare city name ("ABUJA") ranks above "ABUJA - KUBWA"; otherwise the most specific area decides.
    const sameCity = hits.filter(h => h.a.city === chosen.a.city);
    const bare = text.replace(/[()]/g, " ").trim() === chosen.a.text;
    const rank =
      kind === "approximate"
        ? 1000
        : bare
          ? 0
          : Math.max(1, ...sameCity.map(h => h.a.rank));
    return {
      city: chosen.a.city,
      cityName: CITIES[chosen.a.city].name,
      match: kind,
      rank,
      ...(note && { note }),
    };
  }

  // Unknown place in Lagos or the FCT: almost always a district, so match by state (flagged).
  // Elsewhere an unknown name is usually its own town (Awgu is not Enugu city), so leave it.
  const viaState = state ? resolveCity(state) : null;
  if (viaState && (viaState.city === "lagos" || viaState.city === "abuja")) {
    return {
      city: viaState.city,
      cityName: viaState.cityName,
      match: "approximate",
      rank: 1000,
      note: `"${label.trim()}" is not a known ${viaState.cityName} area; matched by its state (${state})`,
    };
  }
  const name = text.replace(/[()]/g, "").trim();
  return {
    city: slug(name),
    cityName: titleCase(name),
    match: "unlisted",
    rank: 0,
  };
}

/** Canonical cities, for the search UI. */
export const knownCities = Object.entries(CITIES).map(([key, c]) => ({
  key,
  name: c.name,
  state: c.state,
}));
