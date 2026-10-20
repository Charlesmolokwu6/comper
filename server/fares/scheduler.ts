/**
 * Scheduled scrape of popular city pairs, so most user searches hit a warm cache.
 *
 * Env:
 *   SCRAPE_CITY_PAIRS       "from:to,…" canonical city keys
 *                           (default lagos:abuja,abuja:lagos,lagos:enugu,lagos:port-harcourt,lagos:owerri,lagos:onitsha)
 *   SCRAPE_DAYS_AHEAD       days to scrape starting tomorrow (default 3)
 *   SCRAPE_INTERVAL_HOURS   (default 6; 0 disables the schedule)
 */
import { scrapePopular } from "./compare";
import { load, refreshNetwork } from "./store";

const PAIRS = (
  process.env.SCRAPE_CITY_PAIRS ||
  "lagos:abuja,abuja:lagos,lagos:enugu,lagos:port-harcourt,lagos:owerri,lagos:onitsha"
)
  .split(",")
  .map(p => p.trim().split(":") as [string, string])
  .filter(p => p.length === 2);
const DAYS_AHEAD = Number(process.env.SCRAPE_DAYS_AHEAD || 3);
const INTERVAL_MS = Number(process.env.SCRAPE_INTERVAL_HOURS ?? 6) * 3_600_000;

interface ScrapeRun {
  startedAt: string;
  finishedAt?: string;
  faresFetched: number;
  error?: string;
}
let last: ScrapeRun | null = null;
export const lastScrape = () => last;

export async function runScrape() {
  const run: ScrapeRun = {
    startedAt: new Date().toISOString(),
    faresFetched: 0,
  };
  last = run;
  try {
    // Route lists older than ROUTES_TTL (incl. the committed snapshot) are refreshed first.
    const routeErrors = await refreshNetwork();
    if (routeErrors.length)
      console.warn("[fares] route list errors:", routeErrors.slice(0, 5));
    run.faresFetched = await scrapePopular(PAIRS, DAYS_AHEAD);
  } catch (err: any) {
    run.error = err.message;
  }
  run.finishedAt = new Date().toISOString();
  console.log(`[fares] scrape done: ${run.faresFetched} fares fetched`);
  return run;
}

let started = false;
export function startScheduler() {
  if (started) return;
  started = true;
  load();
  if (!(INTERVAL_MS > 0)) return;
  setTimeout(runScrape, 10_000); // let the server finish booting first
  setInterval(runScrape, INTERVAL_MS).unref();
}
