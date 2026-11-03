/**
 * Shared locations ("pins"). Everything is in the link itself: /pin?ll=6.4475,3.4728&n=…
 * Nothing is stored on our server, so the link works for as long as Compare does; `e` is a
 * soft expiry the page respects, not a security measure.
 */
export interface Pin {
  lat: number;
  lon: number;
  name: string;
  /** Street or area, as found when the pin was made. */
  address?: string;
  /** "Blue gate, opposite the church". */
  note?: string;
  /** ms since epoch; after this the page says the pin has expired. */
  expires?: number;
}

const clip = (s: string, n: number) => s.trim().slice(0, n);

export function pinPath(p: Pin) {
  const q = new URLSearchParams({
    ll: `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`,
    n: clip(p.name, 60) || "Shared location",
  });
  if (p.address) q.set("a", clip(p.address, 120));
  if (p.note) q.set("t", clip(p.note, 200));
  if (p.expires) q.set("e", String(Math.round(p.expires / 60_000)));
  return `/pin?${q}`;
}

export function readPin(search: string): Pin | null {
  const q = new URLSearchParams(search);
  const [lat, lon] = (q.get("ll") ?? "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const e = Number(q.get("e"));
  return {
    lat,
    lon,
    name: clip(q.get("n") ?? "", 60) || "Shared location",
    address: q.get("a") ? clip(q.get("a")!, 120) : undefined,
    note: q.get("t") ? clip(q.get("t")!, 200) : undefined,
    expires: e > 0 ? e * 60_000 : undefined,
  };
}
