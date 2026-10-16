/** Results live at /results/<from>/<to>/<date>, so a search can be shared or bookmarked. */
export interface SearchQuery {
  from: string;
  to: string;
  date: string;
}

export const resultsPath = (q: SearchQuery) =>
  `/results/${encodeURIComponent(q.from)}/${encodeURIComponent(q.to)}/${q.date}`;

const LAST_KEY = "compare.lastSearch";

/** The last search, so "Change search" brings the form back filled in. */
export function rememberSearch(q: SearchQuery) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(q));
  } catch {
    // Storage may be blocked; the form just starts empty.
  }
}

export function lastSearch(): Partial<SearchQuery> {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export const flightsPath = (q: SearchQuery) =>
  `/flights/${encodeURIComponent(q.from)}/${encodeURIComponent(q.to)}/${q.date}`;

const LAST_FLIGHT_KEY = "compare.lastFlightSearch";

export function rememberFlightSearch(q: SearchQuery) {
  try {
    localStorage.setItem(LAST_FLIGHT_KEY, JSON.stringify(q));
  } catch {
    // Storage may be blocked; the form just starts empty.
  }
}

export function lastFlightSearch(): Partial<SearchQuery> {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_FLIGHT_KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
