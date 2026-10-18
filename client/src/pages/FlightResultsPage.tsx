import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PlaneTakeoff,
  SearchX,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { FlightCard } from "@/components/compare/FlightCard";
import {
  SearchProgress,
  SearchSummary,
} from "@/components/compare/SearchStatus";
import { LoadingResults } from "@/components/compare/Loader";
import { SiteShell } from "@/components/compare/SiteShell";
import { useCompare } from "@/hooks/useCompare";
import { fetchFlights, type Cabin, type FlightsResponse } from "@/lib/api";
import { CABINS, cheapestInCabin, groupFlights } from "@/lib/flights";
import { formatDay, formatNaira, lagosDate } from "@/lib/format";
import { flightsPath, rememberFlightSearch } from "@/lib/routes";
import { cn } from "@/lib/utils";

const MAX_DAYS_AHEAD = 180;

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const titleFromId = (id: string) =>
  id.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());

function CabinTabs({
  active,
  onChange,
  fares,
  loading,
}: {
  active: Cabin;
  onChange: (c: Cabin) => void;
  fares: Record<Cabin, number | null>;
  loading: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="tablist"
      aria-label="Cabin"
      className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1"
      onKeyDown={e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const next = CABINS.findIndex(c => c.id === active) === 0 ? 1 : 0;
        onChange(CABINS[next].id);
        refs.current[next]?.focus();
      }}
    >
      {CABINS.map((c, i) => {
        const on = c.id === active;
        const fare = fares[c.id];
        return (
          <button
            key={c.id}
            ref={el => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`cabin-tab-${c.id}`}
            aria-selected={on}
            aria-controls="cabin-panel"
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(c.id)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              on
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <span className="text-sm font-semibold leading-tight">
              {c.label}
            </span>
            <span
              className={cn(
                "text-xs tabular-nums",
                on ? "text-primary-foreground/75" : "text-muted-foreground"
              )}
            >
              {fare != null
                ? `from ${formatNaira(fare)}`
                : loading
                  ? "Checking…"
                  : "None"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function FlightResultsPage({
  from,
  to,
  date,
}: {
  from: string;
  to: string;
  date: string;
}) {
  const { state, search } = useCompare<FlightsResponse>(fetchFlights);
  const [picked, setPicked] = useState<Cabin | null>(null);
  const [, navigate] = useLocation();
  const today = lagosDate();
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today;

  useEffect(() => {
    if (!validDate) return;
    rememberFlightSearch({ from, to, date });
    setPicked(null);
    search({ from, to, date });
  }, [from, to, date, validDate, search]);

  const results = state.phase === "results" ? state.data : null;
  const timedOut = state.phase === "results" && state.timedOut;
  const pollError = state.phase === "results" ? state.pollError : null;
  const pending = !!results?.coverage.some(c => c.status === "pending");
  const stillLoading = state.phase === "loading" || (pending && !timedOut);
  const flights = results?.flights ?? [];
  const fares = {
    economy: cheapestInCabin(flights, "economy"),
    premium: cheapestInCabin(flights, "premium"),
  };
  const active: Cabin =
    picked ??
    (fares.economy == null && fares.premium != null ? "premium" : "economy");
  const groups = groupFlights(flights, active);
  const cheapestAirline =
    groups.length > 1 && groups[0].best ? groups[0].airline : null;
  const pendingOps = new Set(
    results?.coverage
      .filter(c => c.status === "pending")
      .map(c => c.operator) ?? []
  );
  const cabin = CABINS.find(c => c.id === active)!;
  const other = CABINS.find(c => c.id !== active)!;
  const fromName = results?.from.name ?? titleFromId(from);
  const toName = results?.to.name ?? titleFromId(to);
  const go = (d: string) => navigate(flightsPath({ from, to, date: d }));
  const flightCount = flights.filter(f => !f.soldOut).length;

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl pt-6 sm:pt-8">
        <Link
          href="/?mode=flight"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Change search
        </Link>
        <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <PlaneTakeoff
            aria-hidden
            className="size-6 shrink-0 text-primary sm:size-7"
          />
          <span>
            {fromName} → {toName}
          </span>
        </h1>
        {validDate && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(shiftDate(date, -1))}
              disabled={shiftDate(date, -1) < today}
              aria-label="Previous day"
              className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-30"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <span className="min-w-0 flex-1 text-center text-base font-semibold sm:flex-none sm:px-2">
              {formatDay(date)}
            </span>
            <button
              type="button"
              onClick={() => go(shiftDate(date, 1))}
              disabled={shiftDate(date, 1) > lagosDate(MAX_DAYS_AHEAD)}
              aria-label="Next day"
              className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-30"
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto mt-6 max-w-3xl space-y-4" aria-live="polite">
        {!validDate && (
          <div
            role="alert"
            className="rounded-2xl border border-border bg-card p-6"
          >
            <p className="font-semibold">That date has passed</p>
            <button
              type="button"
              onClick={() => go(lagosDate(1))}
              className="mt-3 h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              Search tomorrow instead
            </button>
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

        {validDate && state.phase !== "error" && (
          <>
            <CabinTabs
              active={active}
              onChange={setPicked}
              fares={fares}
              loading={stillLoading}
            />

            {results && !timedOut && (
              <SearchProgress coverage={results.coverage} />
            )}
            {pollError && (
              <p className="text-xs text-amber-200">
                Couldn't refresh just now ({pollError}); retrying.
              </p>
            )}

            <section
              id="cabin-panel"
              role="tabpanel"
              aria-labelledby={`cabin-tab-${active}`}
              className="space-y-4"
            >
              {fares[other.id] != null &&
                fares[active] != null &&
                fares[other.id]! < fares[active]! && (
                  <button
                    type="button"
                    onClick={() => setPicked(other.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/[0.06] px-4 py-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span>
                      {other.label} is cheaper on this date, from{" "}
                      <span className="font-semibold">
                        {formatNaira(fares[other.id]!)}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-primary">
                      See it
                    </span>
                  </button>
                )}

              {groups.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {groups.length} {groups.length === 1 ? "airline" : "airlines"}{" "}
                  · {flightCount} {flightCount === 1 ? "flight" : "flights"} ·
                  cheapest first, 1 adult, taxes included
                </p>
              )}

              {groups.map(g => (
                <FlightCard
                  key={`${active}:${g.airline}`}
                  group={g}
                  cheapest={cheapestAirline === g.airline}
                  loading={pendingOps.has(g.airline)}
                />
              ))}

              {groups.length === 0 && stillLoading && (
                <LoadingResults
                  title="Getting live fares"
                  detail="Asking each airline for its prices. They appear here as each one answers."
                />
              )}

              {groups.length === 0 && !stillLoading && (
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <SearchX
                    aria-hidden
                    className="mx-auto size-8 text-muted-foreground"
                  />
                  <p className="mt-3 font-semibold">
                    No {cabin.label.toLowerCase()} fares for this date
                  </p>
                  {fares[other.id] != null ? (
                    <button
                      type="button"
                      onClick={() => setPicked(other.id)}
                      className="mt-3 h-10 rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      See {other.label} from {formatNaira(fares[other.id]!)}
                    </button>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try another date with the arrows above.
                    </p>
                  )}
                </div>
              )}

              {(groups.length > 0 || !stillLoading) && (
                <p className="text-xs text-muted-foreground">
                  {cabin.note} Prices are what each airline's own site shows for
                  one adult, taxes included; check the final price when you
                  book.
                </p>
              )}
            </section>

            {results && (
              <SearchSummary
                coverage={results.coverage}
                timedOut={timedOut}
                unavailable={results.unavailableOperators}
                onRetry={() => search({ from, to, date })}
                explanation={results.unavailableOperators[0]?.reason}
              />
            )}
          </>
        )}
      </div>
    </SiteShell>
  );
}
