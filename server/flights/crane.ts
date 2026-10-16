/**
 * Hitit Crane IBE airlines. Only Umza is included: Air Peace, Ibom Air and Arik run the same
 * system but put searches behind a Cloudflare captcha, which we don't get around.
 *
 * GET /ibe/availability?tripType=ONE_WAY&depPort=&arrPort=&departureDate=DD.MM.YYYY&adult=1…
 * returns a server-rendered results page: one `desktop-route-block` per flight, and per flight
 * a `branded-fare-modal-<journey>-<item>-<cabin>` listing each fare family with its price
 * ("All taxes included").
 */
import { decodeHtmlEntities, request, to24h } from "../operators/http";
import { cabinOf, type Airline, type Flight, type FlightFare } from "./types";

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/** "24 Oct 2026" → "2026-10-24". */
function iso(d: string) {
  const [day, mon, y] = d.trim().split(/\s+/);
  const m = MONTHS.indexOf(mon.toLowerCase().slice(0, 3)) + 1;
  if (!m || !y) throw new Error(`Unrecognised date "${d}"`);
  return `${y}-${String(m).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const text = (s: string) =>
  decodeHtmlEntities(s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const naira = (s: string) => Math.round(Number(s.replace(/[^\d.]/g, "")));

export function parseCraneResults(
  html: string,
  from: string,
  to: string,
  date: string
): Flight[] {
  if (!/class="[^"]*flight-date\b/.test(html) && !/availability/i.test(html))
    throw new Error("Crane results page not recognised (layout changed?)");
  const blocks = html.split(/<div class="desktop-route-block\b/).slice(1);
  const flights: Flight[] = [];
  for (const b of blocks) {
    const times = Array.from(b.matchAll(/class="time">([^<]+)</g)).map(m =>
      m[1].trim()
    );
    const ports = Array.from(b.matchAll(/class="port">([^<]+)</g)).map(m =>
      text(m[1])
    );
    const dates = Array.from(b.matchAll(/class="date">([^<]+)</g)).map(m =>
      m[1].trim()
    );
    if (times.length < 2 || dates.length < 2) continue;
    const depDate = iso(dates[0]);
    if (depDate !== date) continue;
    const item = b.match(/data-item-index="(\d+)"/)?.[1] ?? "0";
    const journey = b.match(/data-journey-index="(\d+)"/)?.[1] ?? "0";
    const stopsText = text(b.match(/class="total-stop">([^<]+)</)?.[1] ?? "");

    // The fare families sit in modals after the block, one per cabin.
    const fares: FlightFare[] = [];
    for (const m of Array.from(
      html.matchAll(
        new RegExp(`id="branded-fare-modal-${journey}-${item}-(\\d+)"`, "g")
      )
    )) {
      const next = html.indexOf('id="branded-fare-modal-', m.index! + 10);
      const modal = html.slice(m.index!, next > 0 ? next : m.index! + 40_000);
      for (const f of Array.from(
        modal.matchAll(
          /list-item-title">([^<]+)<[\s\S]*?class="bundle-budget">([^<]+)</g
        )
      )) {
        const name = text(f[1]);
        const price = naira(f[2]);
        if (!price || fares.some(x => x.name === name)) continue;
        fares.push({ name, cabin: cabinOf(name), price });
      }
    }
    fares.sort((a, b) => a.price - b.price);

    flights.push({
      flightNumber: text(
        b.match(/class="flight-no">\s*(?:<span>)?([^<]+)</)?.[1] ?? ""
      ),
      from,
      to,
      fromName: ports[0]?.replace(/\s*\([A-Z]{3}\)$/, "") ?? from,
      toName: ports[ports.length - 1]?.replace(/\s*\([A-Z]{3}\)$/, "") ?? to,
      departure: `${depDate} ${to24h(times[0])}`,
      arrival: `${iso(dates[dates.length - 1])} ${to24h(times[times.length - 1])}`,
      duration:
        text(b.match(/class="flight-duration">([^<]+)</)?.[1] ?? "") || null,
      stops: /non-?stop/i.test(stopsText)
        ? 0
        : Number(stopsText.match(/\d+/)?.[0] ?? 0),
      fares,
    });
  }
  return flights;
}

export function craneAirline(cfg: {
  id: string;
  name: string;
  website: string;
  /** e.g. "https://book-umz.crane.aero". */
  base: string;
  airports: string[];
}): Airline {
  const link = (from: string, to: string, date: string) => {
    const [y, m, d] = date.split("-");
    return (
      `${cfg.base}/ibe/availability?` +
      new URLSearchParams({
        tripType: "ONE_WAY",
        depPort: from,
        arrPort: to,
        departureDate: `${d}.${m}.${y}`,
        adult: "1",
        child: "0",
        infant: "0",
        lang: "en",
      })
    );
  };
  return {
    id: cfg.id,
    name: cfg.name,
    website: cfg.website,
    airports: cfg.airports,
    bookingUrl: link,
    async search(from, to, date) {
      const res = await request(link(from, to, date));
      const html = await res.text();
      if (res.status === 403 || /cf-chl|captcha/i.test(html.slice(0, 5000)))
        throw new Error(`${cfg.name} now asks for a captcha; not searching`);
      if (!res.ok) throw new Error(`${cfg.name} returned HTTP ${res.status}`);
      return parseCraneResults(html, from, to, date);
    },
  };
}
