import { AlertTriangle, RotateCw } from "lucide-react";
import type { Coverage, UnavailableOperator } from "@/lib/api";
import { quietStatuses } from "@/lib/group";

const list = (names: string[]) =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** Thin progress line shown only while operators are still answering. */
export function SearchProgress({ coverage }: { coverage: Coverage[] }) {
  const done = coverage.filter(c => c.status !== "pending").length;
  const waiting = coverage
    .filter(c => c.status === "pending")
    .map(c => c.operatorName);
  if (!waiting.length) return null;
  return (
    <div role="status" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-foreground">Checking operators…</span>
        <span className="tabular-nums text-muted-foreground">
          {done} of {coverage.length}
        </span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-white/[0.08]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{
            width: `${Math.max(8, (done / Math.max(1, coverage.length)) * 100)}%`,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Waiting for {list(waiting)}. Results appear as each one answers.
      </p>
    </div>
  );
}

/**
 * After the search: operators without fares, as quiet sentences under the results.
 * Errors and timeouts stay visible (with Retry) so no operator silently disappears.
 */
export function SearchSummary({
  coverage,
  timedOut,
  unavailable,
  onRetry,
}: {
  coverage: Coverage[];
  timedOut: boolean;
  unavailable: UnavailableOperator[];
  onRetry: () => void;
}) {
  const q = quietStatuses(coverage, timedOut);
  const lines: string[] = [];
  if (q.noTrips.length)
    lines.push(`No trips on this date: ${list(q.noTrips)}.`);
  if (q.noRoute.length)
    lines.push(`Doesn't run this route: ${list(q.noRoute)}.`);
  for (const c of q.notOnSale)
    lines.push(
      `${c.message ?? `${c.operatorName} isn't selling this date yet`}.`
    );

  return (
    <div className="space-y-3 text-sm">
      {q.errors.length > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-amber-400/10 px-4 py-3 text-amber-100"
        >
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Couldn't get fares from {list(q.errors.map(c => c.operatorName))}{" "}
            just now.
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200/30 px-3 font-medium hover:bg-amber-400/10 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <RotateCw aria-hidden className="size-3.5" />
            Retry
          </button>
        </div>
      )}
      {lines.length > 0 && (
        <ul className="space-y-1 text-muted-foreground">
          {lines.map(l => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {unavailable.length > 0 && (
        <details className="text-muted-foreground">
          <summary className="cursor-pointer select-none">
            {list(unavailable.map(o => o.name))}{" "}
            {unavailable.length === 1 ? "isn't" : "aren't"} included
          </summary>
          <p className="mt-1 max-w-prose">
            Their fare search only works after logging in to their booking
            system, which we don't do without their permission. This says
            nothing about their routes or prices.
          </p>
        </details>
      )}
    </div>
  );
}
