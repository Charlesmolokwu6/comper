/**
 * GIG Logistics (GIGL) parcel prices, from the public calculator on giglogistics.com
 * (shipping-price-calculator). Both calls are the ones that page makes, with no login:
 *
 *   GET  agility.giglogistics.com/api/portal/getStations     → states (station ids)
 *   POST agility.giglogistics.com/api/portal/getpricequote   → DeliveryPrice for a parcel
 *
 * Prices are per state pair ("LAGOS" → "FEDERAL CAPITAL TERRITORY"), by weight and declared
 * value. Requests are spaced out and cached, like the bus operators.
 */
const BASE = "https://agility.giglogistics.com/api/portal";
const UA =
  "Mozilla/5.0 (compatible; CompareNG/1.0; +https://compare-6ze8.onrender.com)";
const STATIONS_TTL = 24 * 3600_000;
const QUOTE_TTL = 6 * 3600_000;
const GAP_MS = 2_000;

/** Nigeria's 36 states and the FCT, as GIGL names them; it also lists Ghana stations. */
const NIGERIA = new Set([
  "ABIA",
  "ADAMAWA",
  "AKWA IBOM",
  "ANAMBRA",
  "BAUCHI",
  "BAYELSA",
  "BENUE",
  "BORNO",
  "CROSS RIVER",
  "DELTA",
  "EBONYI",
  "EDO",
  "EKITI",
  "ENUGU",
  "FEDERAL CAPITAL TERRITORY",
  "GOMBE",
  "IMO",
  "JIGAWA",
  "KADUNA",
  "KANO",
  "KATSINA",
  "KEBBI",
  "KOGI",
  "KWARA",
  "LAGOS",
  "NASARAWA",
  "NIGER",
  "OGUN",
  "ONDO",
  "OSUN",
  "OYO",
  "PLATEAU",
  "RIVERS",
  "SOKOTO",
  "TARABA",
  "YOBE",
  "ZAMFARA",
]);

export interface Station {
  id: number;
  /** Display name: "Lagos", "Abuja (FCT)". */
  name: string;
}

export interface GiglQuote {
  price: number;
  fetchedAt: string;
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|\s)([a-z])/g, (_, a, b) => a + b.toUpperCase());

export function parseStations(json: any): Station[] {
  const seen = new Set<string>();
  return (json?.Object ?? [])
    .filter((s: any) => NIGERIA.has(String(s.StationName).trim().toUpperCase()))
    .filter((s: any) => {
      const n = String(s.StationName).trim().toUpperCase();
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    })
    .map((s: any) => {
      const n = String(s.StationName).trim().toUpperCase();
      return {
        id: Number(s.StationId),
        name: n === "FEDERAL CAPITAL TERRITORY" ? "Abuja (FCT)" : titleCase(n),
      };
    })
    .sort((a: Station, b: Station) => a.name.localeCompare(b.name));
}

/** The price GIGL's calculator shows, or null when it gives none. */
export function parseQuote(json: any): number | null {
  if (json?.Code !== "200") return null;
  const price = Number(json?.Object?.DeliveryPrice);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : null;
}

let last = 0;
let queue: Promise<unknown> = Promise.resolve();
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    last = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

async function request(url: string, init: RequestInit = {}) {
  const res = await throttled(() =>
    fetch(url, {
      ...init,
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Origin: "https://giglogistics.com",
        Referer: "https://giglogistics.com/shipping-price-calculator/",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    })
  );
  if (!res.ok) throw new Error(`GIGL returned HTTP ${res.status}`);
  return res.json();
}

let stations: { at: number; list: Station[] } | null = null;
export async function getStations(): Promise<Station[]> {
  if (stations && Date.now() - stations.at < STATIONS_TTL) return stations.list;
  const list = parseStations(await request(`${BASE}/getStations`));
  if (!list.length) throw new Error("GIGL returned no stations");
  stations = { at: Date.now(), list };
  return list;
}

const quotes = new Map<string, GiglQuote>();
const inflight = new Map<string, Promise<GiglQuote>>();

export function getQuote(
  from: number,
  to: number,
  weightKg: number,
  value: number
): Promise<GiglQuote> {
  const key = `${from}:${to}:${weightKg}:${value}`;
  const hit = quotes.get(key);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < QUOTE_TTL)
    return Promise.resolve(hit);
  let p = inflight.get(key);
  if (!p) {
    p = request(`${BASE}/getpricequote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SenderStationId: from,
        ReceiverStationId: to,
        PreShipmentItems: [
          {
            ShipmentType: "Regular",
            SpecialPackageId: 0,
            Value: value,
            Quantity: 1,
            Weight: weightKg,
          },
        ],
      }),
    })
      .then(json => {
        const price = parseQuote(json);
        if (price == null)
          throw new Error(json?.ShortDescription || "GIGL gave no price");
        const q = { price, fetchedAt: new Date().toISOString() };
        quotes.set(key, q);
        return q;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}
