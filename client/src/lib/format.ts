/** Display formatting. All dates/times are Lagos local time (WAT, UTC+1). */

const naira = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

export const formatNaira = (n: number) => `₦${naira.format(n)}`;

/** "YYYY-MM-DD HH:mm" → "06:00" */
export const formatTime = (departure: string) => departure.slice(11, 16);

/** "YYYY-MM-DD" → "Sat 17 Oct" (timezone-independent). */
export function formatDay(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Today's date in Lagos, offset by `days`, as YYYY-MM-DD. */
export function lagosDate(days = 0, now = Date.now()) {
  return new Date(now + 3_600_000 + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** "3 h ago" / "25 min ago" */
export function formatAge(iso: string, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

export function formatSeats(n: number | null) {
  if (n == null) return null;
  return `${n} seat${n === 1 ? "" : "s"} available`;
}

/** State/city prefixes operators put in front of a terminal name ("Lagos (Empire)", "Anambra-Onitsha"). */
const PREFIXES = [
  "lagos",
  "abuja",
  "anambra",
  "abia",
  "akwa ibom",
  "rivers",
  "imo",
  "enugu",
  "ebonyi",
  "delta",
  "edo",
  "oyo",
  "cross river",
  "benin republic",
  "ghana",
  "togo",
  "ph",
  "fct",
];

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/**
 * Readable terminal name for display: drops Chisco's "--am/--pm" session markers, the word
 * "Terminal", and a leading state/city ("Lagos (Empire--am)" → "Empire",
 * "Anambra-Onitsha----am" → "Onitsha", "ABUJA - UTAKO" → "Utako"). Names like
 * "Okota (Cele)" or "Ifite-Awka" are kept.
 */
export function prettyStop(name: string) {
  let s = name
    .replace(/[—–]/g, "-")
    .replace(/\s*-{2,}\s*(am|pm)\b/gi, "")
    .replace(/[-\s]*\bterminal\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const paren = s.match(/^([^()]+)\((.+)\)$/);
  if (paren && PREFIXES.includes(paren[1].trim().toLowerCase()))
    s = paren[2].trim();
  const dash = s.match(/^([^-]+?)\s*-\s*(.+)$/);
  if (dash && PREFIXES.includes(dash[1].trim().toLowerCase()))
    s = dash[2].trim();
  return s === s.toUpperCase() ? titleCase(s) : s;
}

/** "LUGGAGE ALLOWED PER PAX (0 -10kg)" → "Luggage allowed per pax (0 -10kg)". */
export function sentenceCase(s: string) {
  const letters = s.replace(/[^a-z]/gi, "");
  const upper = letters.replace(/[^A-Z]/g, "").length;
  if (!letters.length || upper / letters.length < 0.7) return s;
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
