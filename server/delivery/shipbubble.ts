/**
 * More couriers via Shipbubble's public rates calculator (shipbubble.com/rates-calculator):
 *
 *   POST api.shipbubble.com/v1/rates/live/local  → Dellyman, Fez, Routelift, Kwikpik, …
 *
 * It's the call that page makes, with no login. It wants each address as a Google place id
 * plus Google's formatted address, so it only runs once GOOGLE_MAPS_API_KEY is set (our own
 * key, Geocoding API). Prices are what Shipbubble charges to book that courier.
 */
const UA =
  "Mozilla/5.0 (compatible; CompareNG/1.0; +https://compare-6ze8.onrender.com)";
const RATES_URL = "https://api.shipbubble.com/v1/rates/live/local";
/** Shipbubble's "Light weight items" category. */
const CATEGORY_ID = 20754594;
const RATE_TTL = 6 * 3600_000;
const PLACE_TTL = 30 * 86400_000;
const GAP_MS = 2_000;

export const shipbubbleEnabled = () => !!process.env.GOOGLE_MAPS_API_KEY;

export interface Point {
  lat: number;
  lon: number;
}

export interface ShipbubbleRate {
  id: string;
  name: string;
  price: number;
  /** "Within 2 - 3 working days" */
  deliveryEta: string | null;
  /** Courier collects from the sender, or the sender drops it off. */
  pickup: boolean;
}

/** Couriers from a rates response, cheapest first; ones without a price are left out. */
export function parseRates(json: any): ShipbubbleRate[] {
  const list: any[] = json?.data?.all_couriers ?? [];
  return list
    .map(c => ({
      id: String(c.service_code ?? c.courier_id ?? c.courier_name),
      name: String(c.courier_name ?? "").trim(),
      price: Number(c.rate_card_amount),
      deliveryEta: c.delivery_eta ? String(c.delivery_eta) : null,
      pickup: c.service_type !== "dropoff",
    }))
    .filter(c => c.name && Number.isFinite(c.price) && c.price > 0)
    .sort((a, b) => a.price - b.price);
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

const places = new Map<string, { at: number; id: string; address: string }>();

/** Google's place id and address for a point (Geocoding API, reverse). */
async function googlePlace(p: Point) {
  const key = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
  const hit = places.get(key);
  if (hit && Date.now() - hit.at < PLACE_TTL) return hit;
  const url =
    "https://maps.googleapis.com/maps/api/geocode/json?" +
    new URLSearchParams({
      latlng: `${p.lat},${p.lon}`,
      key: process.env.GOOGLE_MAPS_API_KEY ?? "",
      language: "en",
    });
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const json: any = await res.json().catch(() => null);
  const first = json?.results?.[0];
  if (!res.ok || json?.status !== "OK" || !first?.place_id)
    throw new Error(
      `Google couldn't place this address (${json?.status ?? `HTTP ${res.status}`})`
    );
  const place = {
    at: Date.now(),
    id: String(first.place_id),
    address: String(first.formatted_address),
  };
  places.set(key, place);
  return place;
}

const rates = new Map<string, { at: number; list: ShipbubbleRate[] }>();

export async function getShipbubbleRates(
  from: Point,
  to: Point,
  weightKg: number
): Promise<{ list: ShipbubbleRate[]; fetchedAt: string }> {
  const [a, b] = [await googlePlace(from), await googlePlace(to)];
  const key = `${a.id}|${b.id}|${weightKg}`;
  const hit = rates.get(key);
  if (hit && Date.now() - hit.at < RATE_TTL)
    return { list: hit.list, fetchedAt: new Date(hit.at).toISOString() };
  const json = await throttled(async () => {
    const res = await fetch(RATES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": UA,
      },
      body: JSON.stringify({
        sender_place_id: a.id,
        sender_formatted_address: a.address,
        // Their field name, spelled as they spell it.
        reciever_place_id: b.id,
        reciever_formatted_address: b.address,
        express: "no",
        weight: String(weightKg),
        category_id: CATEGORY_ID,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const body: any = await res.json().catch(() => null);
    if (!res.ok || body?.status !== "success")
      throw new Error(
        body?.message ?? `Shipbubble returned HTTP ${res.status}`
      );
    return body;
  });
  const list = parseRates(json);
  const at = Date.now();
  rates.set(key, { at, list });
  return { list, fetchedAt: new Date(at).toISOString() };
}
