import { AlertTriangle, RotateCw } from "lucide-react";
import type { UnavailableOperator } from "@/lib/api";
import { quietStatuses, type CoverageLike } from "@/lib/group";

const list = (names: string[]) =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** Thin progress line shown only while operators are still answering. */
export function SearchProgress({ coverage }: { coverage: CoverageLike[] }) {
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
  explanation,
  withFares = [],
}: {
  coverage: CoverageLike[];
  timedOut: boolean;
  unavailable: UnavailableOperator[];
  onRetry: () => void;
  /** Why the unavailable operators are missing; defaults to the bus wording (login needed). */
  explanation?: string;
  /** Operators already showing fares: a timeout there means partial results, not failure. */
  withFares?: string[];
}) {
  const q = quietStatuses(coverage, timedOut);
  const partial = q.errors.filter(
    c => c.status === "pending" && withFares.includes(c.operatorName)
  );
  q.errors = q.errors.filter(c => !partial.includes(c));
  const lines: string[] = [];
  if (q.noTrips.length)
    lines.push(`No trips on this date: ${list(q.noTrips)}.`);
  if (q.unpriced.length)
    lines.push(
      `${list(q.unpriced.map(c => c.operatorName))} ${q.unpriced.length === 1 ? "has" : "have"} buses on this date but no online price yet, so they aren't listed. Check their site or try the next day.`
    );
  if (q.noRoute.length)
    lines.push(`Doesn't run this route: ${list(q.noRoute)}.`);
  if (q.notAtTerminal.length)
    lines.push(
      `Runs this route, but not from or to the terminal you picked: ${list(q.notAtTerminal)}.`
    );
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
      {partial.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
          <span className="min-w-0 flex-1">
            Some departures from {list(partial.map(c => c.operatorName))} may be
            missing: it was still answering when we stopped waiting.
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
          >
            <RotateCw aria-hidden className="size-3.5" />
            Check again
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
            {explanation ??
              "Their fare search only works after logging in to their booking system, which we don't do without their permission. This says nothing about their routes or prices."}
          </p>
        </details>
      )}
    </div>
  );
}
