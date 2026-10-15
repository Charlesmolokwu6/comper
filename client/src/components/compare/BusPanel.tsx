import { useEffect, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { useCompare, type CompareQuery } from "@/hooks/useCompare";
import { useNetwork } from "@/hooks/useNetwork";
import { formatDay, lagosDate } from "@/lib/format";
import { groupByOperator } from "@/lib/group";
import type { Near } from "./NearPicker";
import { OperatorCard } from "./OperatorCard";
import { SearchForm, type SearchValues } from "./SearchForm";
import { SearchProgress, SearchSummary } from "./SearchStatus";

function initialValues(): SearchValues {
  const p = new URLSearchParams(window.location.search);
  const date = p.get("date");
  return {
    from: p.get("from") ?? "lagos",
    to: p.get("to"),
    date: date && date >= lagosDate() ? date : lagosDate(1),
  };
}

const NEAR_KEY = "compare.near";

/** Per-city "boarding near" choices, remembered on this device only. */
function loadNear(): Record<string, Near> {
  try {
    const v = JSON.parse(localStorage.getItem(NEAR_KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function saveNear(v: Record<string, Near>) {
  try {
    localStorage.setItem(NEAR_KEY, JSON.stringify(v));
  } catch {
    // Storage can be blocked; the choice still applies for this visit.
  }
}

function SkeletonRow() {
  return (
    <div aria-hidden className="rounded-2xl border border-border bg-card p-5">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-white/[0.06] motion-safe:animate-pulse" />
          <div className="h-3 w-24 rounded bg-white/[0.04] motion-safe:animate-pulse" />
        </div>
        <div className="h-7 w-24 rounded bg-white/[0.06] motion-safe:animate-pulse" />
      </div>
      <div className="mt-5 h-3 w-48 rounded bg-white/[0.04] motion-safe:animate-pulse" />
    </div>
  );
}

export function BusPanel() {
  const { network, error: networkError } = useNetwork();
  const { state, search } = useCompare();
  const [values, setValues] = useState<SearchValues>(initialValues);
  const [nearByCity, setNearByCity] = useState(loadNear);
  const resultsRef = useRef<HTMLDivElement>(null);
  const setNear = (city: string, near: Near | null) =>
    setNearByCity(prev => {
      const next = { ...prev };
      if (near) next[city] = near;
      else delete next[city];
      saveNear(next);
      return next;
    });

  const run = (q: CompareQuery) => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      from: q.from,
      to: q.to,
      date: q.date,
    }).toString();
    try {
      window.history.replaceState(null, "", url);
    } catch {
      // Sandboxed frames can refuse URL changes; the search itself still runs.
    }
    search(q);
  };

  // A shared link with from/to/date runs that search straight away.
  useEffect(() => {
    if (values.from && values.to)
      run({ from: values.from, to: values.to, date: values.date });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    if (!values.from || !values.to) return;
    run({ from: values.from, to: values.to, date: values.date });
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const results = state.phase === "results" ? state.data : null;
  const near = results ? (nearByCity[results.from.city] ?? null) : null;
  const groups = results ? groupByOperator(results.trips, near) : [];
  // Same basis as the card order: with a location set that's each operator's nearest
  // terminal, so the badge is worked out here rather than taken from the server.
  const cheapestOp =
    groups[0]?.best && !groups[0].bestIsApproximate ? groups[0].operator : null;
  const pendingOps = new Set(
    results?.coverage
      .filter(c => c.status === "pending")
      .map(c => c.operator) ?? []
  );

  return (
    <div className="space-y-6">
      <SearchForm
        network={network}
        networkError={networkError}
        values={values}
        onChange={setValues}
        onSubmit={submit}
        busy={state.phase === "loading"}
        near={values.from ? (nearByCity[values.from] ?? null) : null}
        onNearChange={n => values.from && setNear(values.from, n)}
      />

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="scroll-mt-4 outline-none"
        aria-live="polite"
        aria-busy={state.phase === "loading"}
      >
        {state.phase === "loading" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Asking operators for live fares…
            </p>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {state.phase === "error" && (
          <div
            role="alert"
            className="rounded-2xl border border-border bg-card p-5"
          >
            <p className="font-semibold">Search failed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {state.message}
            </p>
            <button
              type="button"
              onClick={() => search(state.query)}
              className="mt-3 h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              Try again
            </button>
          </div>
        )}

        {state.phase === "results" && results && (
          <section
            aria-labelledby="results-heading"
            className="mx-auto max-w-3xl space-y-4"
          >
            <div>
              <h2
                id="results-heading"
                className="text-xl font-bold tracking-tight sm:text-2xl"
              >
                {results.from.name} → {results.to.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDay(results.date)}
                {groups.length > 0 &&
                  ` · ${groups.length} ${groups.length === 1 ? "operator" : "operators"} · ${results.trips.length} departures`}
                {" · "}cheapest first
                {near ? ` from near ${near.name}` : ""}, 1 adult online fare
              </p>
              {state.pollError && (
                <p className="mt-1 text-xs text-amber-200">
                  Couldn't refresh just now ({state.pollError}); retrying.
                </p>
              )}
            </div>

            {!state.timedOut && <SearchProgress coverage={results.coverage} />}

            {groups.map(g => (
              <OperatorCard
                key={g.operator}
                group={g}
                cheapest={cheapestOp === g.operator}
                near={near}
                toCityName={results.to.name}
                loading={pendingOps.has(g.operator)}
              />
            ))}

            {groups.length === 0 && state.polling && <SkeletonRow />}

            {groups.length === 0 && !state.polling && (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <SearchX
                  aria-hidden
                  className="mx-auto size-8 text-muted-foreground"
                />
                <p className="mt-3 font-semibold">
                  No live fares for this route and date
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another date. Some operators only sell a few days ahead.
                </p>
              </div>
            )}

            <SearchSummary
              coverage={results.coverage}
              timedOut={state.timedOut}
              unavailable={results.unavailableOperators}
              onRetry={() => search(state.query)}
            />
          </section>
        )}
      </div>
    </div>
  );
}
