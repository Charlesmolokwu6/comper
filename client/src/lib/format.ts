/** Display formatting. All dates/times are Lagos local time (WAT, UTC+1). */

const naira = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

export const formatNaira = (n: number) => `₦${naira.format(n)}`;

/** "YYYY-MM-DD HH:mm" → "6:00am" / "7:30pm": 12-hour, as travellers read times. */
export function formatTime(departure: string) {
  const [h, m] = departure.slice(11, 16).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return departure.slice(11, 16);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

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

export { prettyStop } from "@shared/stops";

/** "LUGGAGE ALLOWED PER PAX (0 -10kg)" → "Luggage allowed per pax (0 -10kg)". */
export function sentenceCase(s: string) {
  const letters = s.replace(/[^a-z]/gi, "");
  const upper = letters.replace(/[^A-Z]/g, "").length;
  if (!letters.length || upper / letters.length < 0.7) return s;
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
