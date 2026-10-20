/** Small fetch helpers shared by the operator adapters. */

export const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const TIMEOUT_MS = 30_000;
/** Minimum gap between requests to the same operator host (politeness / rate limit). */
const GAP_MS = Number(process.env.FARE_REQUEST_GAP_MS || 2000);

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Minimal cookie jar: keeps name=value pairs from Set-Cookie headers. */
export class CookieJar {
  private cookies = new Map<string, string>();

  store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0)
        this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  get(name: string) {
    return this.cookies.get(name);
  }

  header() {
    return Array.from(this.cookies, ([k, v]) => `${k}=${v}`).join("; ");
  }
}

// One request at a time per host, at least GAP_MS apart.
const hostQueues = new Map<string, Promise<unknown>>();
function throttled<T>(host: string, fn: () => Promise<T>): Promise<T> {
  const run = (hostQueues.get(host) ?? Promise.resolve()).then(fn);
  hostQueues.set(
    host,
    run.catch(() => {}).then(() => new Promise(r => setTimeout(r, GAP_MS)))
  );
  return run;
}

export interface RequestOptions extends RequestInit {
  jar?: CookieJar;
  /** false for static assets (JS chunks) that don't touch the operator's backend. */
  throttle?: boolean;
}

export function request(
  url: string,
  init: RequestOptions = {}
): Promise<Response> {
  const go = () => send(url, init);
  return init.throttle === false ? go() : throttled(new URL(url).host, go);
}

async function send(url: string, init: RequestOptions): Promise<Response> {
  const { jar, headers, throttle: _t, ...rest } = init;
  const h = new Headers(headers);
  h.set("User-Agent", USER_AGENT);
  if (jar) h.set("Cookie", jar.header());
  const res = await fetch(url, {
    ...rest,
    headers: h,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  jar?.store(res);
  return res;
}

export async function requestJson<T = any>(
  url: string,
  init: RequestOptions = {}
): Promise<T> {
  const res = await request(url, init);
  if (!res.ok)
    throw new HttpError(res.status, `${url} returned HTTP ${res.status}`);
  return res.json();
}

export function decodeHtmlEntities(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** "6:00 AM" / "06:00 PM" / "18:00:00" → "HH:mm". */
export function to24h(time: string): string {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/);
  if (!m) throw new Error(`Unrecognised time "${time}"`);
  let h = Number(m[1]);
  const ampm = m[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Names of places outside Nigeria; departures from these are priced in other currencies. */
export const FOREIGN =
  /\b(accra|ghana|lome|togo|cotonou|benin republic|madina|tema|spintex)\b/i;
