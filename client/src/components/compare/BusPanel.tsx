import { useEffect, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { useCompare, type CompareQuery } from "@/hooks/useCompare";
import { useNetwork } from "@/hooks/useNetwork";
import { tripKey } from "@/lib/api";
import { formatDay, lagosDate } from "@/lib/format";
import { OperatorStatusList } from "./OperatorStatusList";
import { SearchForm, type SearchValues } from "./SearchForm";
import { TripRow } from "./TripRow";

function initialValues(): SearchValues {
  const p = new URLSearchParams(window.location.search);
  const date = p.get("date");
  return {
    from: p.get("from") ?? "lagos",
    to: p.get("to"),
    date: date && date >= lagosDate() ? date : lagosDate(1),
  };
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

function NotIncluded({
  operators,
  className,
}: {
  operators: { name: string }[];
  className?: string;
}) {
  if (!operators.length) return null;
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-4 text-sm sm:p-5 ${className ?? ""}`}
    >
      <h2 className="font-semibold">Not included</h2>
      <p className="mt-1 text-muted-foreground">
        {operators.map(o => o.name).join(" and ")}{" "}
        {operators.length === 1 ? "isn't" : "aren't"} compared: their fare
        search only works after logging in to their booking system, which we
        don't do without their permission. This is not a statement about their
        routes or prices.
      </p>
    </section>
  );
}

export function BusPanel() {
  const { network, error: networkError } = useNetwork();
  const { state, search } = useCompare();
  const [values, setValues] = useState<SearchValues>(initialValues);
  const resultsRef = useRef<HTMLDivElement>(null);

  const run = (q: CompareQuery) => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      from: q.from,
      to: q.to,
      date: q.date,
    }).toString();
    window.history.replaceState(null, "", url);
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
  const cheapestKey = results?.cheapest ? tripKey(results.cheapest) : null;
  const fareOperators = results
    ? new Set(results.trips.map(t => t.operator)).size
    : 0;

  return (
    <div className="space-y-6">
      <SearchForm
        network={network}
        networkError={networkError}
        values={values}
        onChange={setValues}
        onSubmit={submit}
        busy={state.phase === "loading"}
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <section
              aria-labelledby="results-heading"
              className="min-w-0 space-y-3"
            >
              <div>
                <h2
                  id="results-heading"
                  className="text-xl font-bold tracking-tight"
                >
                  {results.from.name} → {results.to.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDay(results.date)} · {results.trips.length}{" "}
                  {results.trips.length === 1 ? "trip" : "trips"}
                  {fareOperators > 0 &&
                    ` from ${fareOperators} ${fareOperators === 1 ? "operator" : "operators"}`}
                  {" · "}sorted by online fare, 1 adult
                </p>
                {state.pollError && (
                  <p className="mt-1 text-xs text-amber-200">
                    Couldn't refresh just now ({state.pollError}); retrying.
                  </p>
                )}
              </div>

              {results.trips.map(t => (
                <TripRow
                  key={tripKey(t)}
                  trip={t}
                  cheapest={tripKey(t) === cheapestKey}
                  toCityName={results.to.name}
                />
              ))}

              {results.trips.length === 0 && state.polling && <SkeletonRow />}

              {results.trips.length === 0 && !state.polling && (
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <SearchX
                    aria-hidden
                    className="mx-auto size-8 text-muted-foreground"
                  />
                  <p className="mt-3 font-semibold">
                    No live fares for this route and date
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    See each operator's status for why. Try another date — some
                    operators only sell a few days ahead.
                  </p>
                </div>
              )}
              <NotIncluded
                operators={results.unavailableOperators}
                className="lg:hidden"
              />
            </section>

            <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-4">
              <OperatorStatusList
                coverage={results.coverage}
                trips={results.trips}
                timedOut={state.timedOut}
                onRetry={() => search(state.query)}
              />
              <NotIncluded
                operators={results.unavailableOperators}
                className="hidden lg:block"
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
