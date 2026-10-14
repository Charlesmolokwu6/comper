import {
  AlertTriangle,
  Ban,
  CalendarX,
  CheckCircle2,
  CircleDashed,
  Loader2,
  RotateCw,
} from "lucide-react";
import type { ComparedTrip, Coverage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  coverage: Coverage[];
  trips: ComparedTrip[];
  /** Polling gave up: still-pending operators are shown as not responding. */
  timedOut: boolean;
  onRetry: () => void;
}

function describe(c: Coverage, tripCount: number, timedOut: boolean) {
  switch (c.status) {
    case "fares":
      return {
        icon: CheckCircle2,
        tone: "ok",
        text: `${tripCount} ${tripCount === 1 ? "trip" : "trips"}`,
      };
    case "no_trips":
      return { icon: CalendarX, tone: "muted", text: "No trips on this date" };
    case "no_route":
      return { icon: Ban, tone: "muted", text: "Doesn't run this route" };
    case "not_on_sale":
      return {
        icon: CalendarX,
        tone: "muted",
        text: c.message ?? "Not on sale for this date yet",
      };
    case "pending":
      // Trips arrive per route while the operator's other routes are still being checked.
      if (timedOut)
        return {
          icon: AlertTriangle,
          tone: "warn",
          text: tripCount
            ? `${tripCount} found, then stopped responding`
            : "Didn't respond in time",
        };
      return {
        icon: Loader2,
        tone: "loading",
        text: tripCount ? `${tripCount} so far · checking…` : "Checking…",
      };
    case "error":
      return {
        icon: AlertTriangle,
        tone: "warn",
        text: `Couldn't get fares from ${c.operatorName}`,
      };
  }
}

export function OperatorStatusList({
  coverage,
  trips,
  timedOut,
  onRetry,
}: Props) {
  const done = coverage.filter(c => c.status !== "pending").length;
  const needsRetry = coverage.some(
    c => c.status === "error" || (timedOut && c.status === "pending")
  );

  return (
    <section
      aria-labelledby="operators-heading"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="operators-heading"
          className="text-sm font-semibold text-foreground"
        >
          Operators checked
        </h2>
        <p
          className="text-xs tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {done} of {coverage.length}
        </p>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {coverage.map(c => {
          const count = trips.filter(t => t.operator === c.operator).length;
          const d = describe(c, count, timedOut);
          const Icon = d.icon;
          return (
            <li key={c.operator} className="flex items-start gap-3 py-2.5">
              <Icon
                aria-hidden
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  d.tone === "ok" && "text-primary",
                  d.tone === "muted" && "text-muted-foreground",
                  d.tone === "warn" && "text-amber-300",
                  d.tone === "loading" &&
                    "text-muted-foreground motion-safe:animate-spin"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-medium text-foreground">
                    {c.operatorName}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      d.tone === "warn"
                        ? "text-amber-200"
                        : "text-muted-foreground"
                    )}
                  >
                    {d.text}
                  </span>
                </div>
                {c.status === "error" && c.message && (
                  <details className="mt-1 text-xs text-muted-foreground">
                    <summary className="cursor-pointer select-none">
                      Details
                    </summary>
                    <p className="mt-1 break-words">{c.message}</p>
                  </details>
                )}
                {c.status === "pending" && !timedOut && (
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                    aria-hidden
                  >
                    <div className="h-full w-1/3 rounded-full bg-white/20 motion-safe:animate-pulse" />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {needsRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
        >
          <RotateCw aria-hidden className="size-4" />
          Retry
        </button>
      )}
      {coverage.some(c => c.status === "pending") && !timedOut && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CircleDashed aria-hidden className="size-3.5" />
          Results appear as each operator answers. Some take up to a minute on
          first search.
        </p>
      )}
    </section>
  );
}
