/**
 * Videcom VARS airlines (United Nigeria, Max Air, Rano Air).
 *
 * The airlines' own websites send searches to `shallowlink.aspx?orig=&dest=&departs=24oct2026…`,
 * which redirects to a server-rendered results page (FlightCal.aspx). No login or token is
 * involved; the page lists each flight with every fare class and its price for one adult,
 * taxes included, in `data-original-amount`. Its "security check" applies to continuing a
 * booking, not to viewing the results.
 */
import { decodeHtmlEntities, request } from "../operators/http";
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

/** "2026-10-24" → "24oct2026" (Videcom's URL date format). */
export function videcomDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d}${MONTHS[m - 1]}${y}`;
}

/** "24 Oct" seen on a page for a search on `date` → "2026-10-24" (handles Dec → Jan). */
function isoFromDayMonth(dayMonth: string, date: string) {
  const [d, mon] = dayMonth.trim().split(/\s+/);
  const m = MONTHS.indexOf(mon.toLowerCase().slice(0, 3)) + 1;
  if (!m) throw new Error(`Unrecognised date "${dayMonth}"`);
  let y = Number(date.slice(0, 4));
  const searchMonth = Number(date.slice(5, 7));
  if (m < searchMonth - 6) y += 1;
  return `${y}-${String(m).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
}

const text = (s: string) =>
  decodeHtmlEntities(s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " "))
    .replace(/\s+/g, " ")
    .trim();

/** Parses a FlightCal.aspx results page for one outbound date. */
export function parseVidecomResults(
  html: string,
  from: string,
  to: string,
  date: string
): Flight[] {
  const active = html.match(
    /tab-active[^>]*>\s*<a[^>]*data-newday="([^"]+)"/
  )?.[1];
  if (!active)
    throw new Error("Videcom results page not recognised (layout changed?)");
  const [ad, am, ay] = active.split(" ");
  if (isoFromDayMonth(`${ad} ${am}`, `${ay}-01-01`).slice(5) !== date.slice(5))
    throw new Error(`Videcom showed ${active} instead of ${date}`);

  const flights: Flight[] = [];
  for (const chunk of html.split(/<div class="\s*flt-panel\b/).slice(1)) {
    const ends = Array.from(
      chunk.matchAll(
        /class="time">([^<]+)<\/div><div class="flightDate">([^<]+)<\/div><div class="city">([^<]*)</g
      )
    );
    if (ends.length < 2) continue;
    const [dep, arr] = [ends[0], ends[ends.length - 1]];
    const depDate = isoFromDayMonth(dep[2], date);
    if (depDate !== date) continue;
    const stopsText = chunk.match(/(Non-stop|\d+\s*stops?)/i)?.[1] ?? "";

    const fares: FlightFare[] = [];
    for (const m of Array.from(
      chunk.matchAll(
        /data-classband="([^"]+)"[\s\S]*?FareClass-price([^>]*)>([^<]*)</g
      )
    )) {
      const amount = m[2].match(/data-original-amount='([\d.]+)'/)?.[1];
      const currency = m[2].match(/data-original-currency='(\w+)'/)?.[1];
      if (!amount || (currency && currency.toLowerCase() !== "ngn")) continue;
      const name = decodeHtmlEntities(m[1]).trim();
      if (fares.some(f => f.name === name)) continue;
      fares.push({
        name,
        cabin: cabinOf(name),
        price: Math.round(Number(amount)),
      });
    }
    fares.sort((a, b) => a.price - b.price);

    flights.push({
      flightNumber: text(
        chunk.match(/class="flightnumber">([^<]+)</)?.[1] ?? ""
      ),
      from,
      to,
      fromName: text(dep[3]),
      toName: text(arr[3]),
      departure: `${depDate} ${dep[1].trim()}`,
      arrival: `${isoFromDayMonth(arr[2], date)} ${arr[1].trim()}`,
      duration:
        text(chunk.match(/flightDuration">([^<]+)</)?.[1] ?? "") || null,
      stops: /non-stop/i.test(stopsText)
        ? 0
        : Number(stopsText.match(/\d+/)?.[0] ?? 0),
      fares,
    });
  }
  return flights;
}

export function videcomAirline(cfg: {
  id: string;
  name: string;
  website: string;
  /** e.g. "https://booking.flyunitednigeria.com" or "https://customer2.videcom.com/MaxAir". */
  base: string;
  airports: string[];
}): Airline {
  const link = (from: string, to: string, date: string) =>
    `${cfg.base}/VARS/Public/shallowlink.aspx?` +
    new URLSearchParams({
      ad: "1",
      ch: "0",
      in: "0",
      departs: videcomDate(date),
      Currency: "NGN",
      orig: from,
      dest: to,
    });
  return {
    id: cfg.id,
    name: cfg.name,
    website: cfg.website,
    airports: cfg.airports,
    bookingUrl: link,
    async search(from, to, date) {
      const res = await request(link(from, to, date));
      if (!res.ok) throw new Error(`${cfg.name} returned HTTP ${res.status}`);
      return parseVidecomResults(await res.text(), from, to, date);
    },
  };
}
