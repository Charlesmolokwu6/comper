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
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

export function formatSeats(n: number | null) {
  if (n == null) return null;
  return `${n} seat${n === 1 ? "" : "s"} available`;
}
