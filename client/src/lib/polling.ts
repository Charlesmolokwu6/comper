import type { Coverage } from "./api";

export const POLL_INTERVAL_MS = 4_000;
/** Stop re-polling after this long; operators still pending are shown as timed out. */
export const POLL_MAX_MS = 120_000;

/**
 * Whether to fetch /api/compare again: some operator is still `pending` and the search
 * has been running for less than POLL_MAX_MS.
 */
export function shouldPoll(
  coverage: Coverage[],
  startedAt: number,
  now: number
) {
  return (
    coverage.some(c => c.status === "pending") && now - startedAt < POLL_MAX_MS
  );
}
