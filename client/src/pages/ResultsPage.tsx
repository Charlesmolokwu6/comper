import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { Link, useLocation } from "wouter";
import { NearPicker } from "@/components/compare/NearPicker";
import { OperatorCard } from "@/components/compare/OperatorCard";
import {
  SearchProgress,
  SearchSummary,
} from "@/components/compare/SearchStatus";
import { SiteShell } from "@/components/compare/SiteShell";
import { VEHICLE_ART } from "@/components/compare/VehicleIcon";
import { useCompare } from "@/hooks/useCompare";
import { useNear } from "@/hooks/useNear";
import { useNetwork } from "@/hooks/useNetwork";
import {
  CATEGORIES,
  cheapestFare,
  splitByCategory,
  type Category,
} from "@/lib/categories";
import { formatDay, formatNaira, lagosDate } from "@/lib/format";
import { groupByOperator } from "@/lib/group";
import { rememberSearch, resultsPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const ICON: Record<Category, "coach" | "car" | "minibus"> = {
  luxury: "coach",
  sienna: "car",
  regular: "minibus",
};

const MAX_DAYS_AHEAD = 90;

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "port-harcourt" → "Port Harcourt", for the moment before city names load. */
const titleFromId = (id: string) =>
  id.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());

function SkeletonCard() {
  return (
    <div aria-hidden className="rounded-2xl border border-border bg-card p-5">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-white/[0.06] motion-safe:animate-pulse" />
          <div className="h-3 w-24 rounded bg-white/[0.04] motion-safe:animate-pulse" />
        </div>
        <div className="h-7 w-24 rounded bg-white/[0.06] motion-safe:animate-pulse" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-24 w-36 rounded-xl bg-white/[0.04] motion-safe:animate-pulse" />
        <div className="h-24 w-36 rounded-xl bg-white/[0.04] motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

function ClassTabs({
  active,
  onChange,
  fares,
  counts,
  loading,
}: {
  active: Category;
  onChange: (c: Category) => void;
  fares: Record<Category, number | null>;
  counts: Record<Category, number>;
  loading: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="tablist"
      aria-label="Vehicle class"
      className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1"
      onKeyDown={e => {
        const i = CATEGORIES.findIndex(c => c.id === active);
        const next =
          e.key === "ArrowRight"
            ? (i + 1) % 3
            : e.key === "ArrowLeft"
              ? (i + 2) % 3
              : -1;
        if (next < 0) return;
        e.preventDefault();
        onChange(CATEGORIES[next].id);
        refs.current[next]?.focus();
      }}
    >
      {CATEGORIES.map((c, i) => {
        const on = c.id === active;
        const fare = fares[c.id];
        return (
          <button
            key={c.id}
            ref={el => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`class-tab-${c.id}`}
            aria-selected={on}
            aria-controls="class-panel"
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(c.id)}
            className={cn(
              "flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              on
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <img
              src={VEHICLE_ART[ICON[c.id]]}
              alt=""
              className="h-8 w-16 object-contain"
            />
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
                : counts[c.id]
                  ? "Sold out"
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

export default function ResultsPage({
  from,
  to,
  date,
}: {
  from: string;
  to: string;
  date: string;
}) {
  const { state, search } = useCompare();
  const { network } = useNetwork();
  const { nearFor, setNear } = useNear();
  const [picked, setPicked] = useState<Category | null>(null);
  const [, navigate] = useLocation();
  const today = lagosDate();
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today;

  useEffect(() => {
    if (!validDate) return;
    rememberSearch({ from, to, date });
    setPicked(null);
    search({ from, to, date });
  }, [from, to, date, validDate, search]);

  const results = state.phase === "results" ? state.data : null;
  const fromCity = network?.cities.find(c => c.city === from);
  const fromName = results?.from.name ?? fromCity?.name ?? titleFromId(from);
  const toName =
    results?.to.name ??
    fromCity?.destinations.find(d => d.city === to)?.name ??
    titleFromId(to);
  const near = nearFor(from);
  const timedOut = state.phase === "results" && state.timedOut;
  const pollError = state.phase === "results" ? state.pollError : null;
  const pending = !!results?.coverage.some(c => c.status === "pending");
  const stillLoading = state.phase === "loading" || (pending && !timedOut);

  const split = splitByCategory(results?.trips ?? []);
  const fares = {
    luxury: cheapestFare(split.luxury),
    sienna: cheapestFare(split.sienna),
    regular: cheapestFare(split.regular),
  };
  const counts = {
    luxury: split.luxury.length,
    sienna: split.sienna.length,
    regular: split.regular.length,
  };
  // Until the traveller picks a tab, open the first class that has seats to sell.
  const active: Category =
    picked ??
    CATEGORIES.find(c => fares[c.id] != null)?.id ??
    CATEGORIES.find(c => counts[c.id] > 0)?.id ??
    "luxury";
  const groups = groupByOperator(split[active], near);
  const cheapestOp =
    groups.length > 1 && groups[0].best && !groups[0].bestIsApproximate
      ? groups[0].operator
      : null;
  const pendingOps = new Set(
    results?.coverage
      .filter(c => c.status === "pending")
      .map(c => c.operator) ?? []
  );
  const activeLabel = CATEGORIES.find(c => c.id === active)!;
  const otherWithFares = CATEGORIES.filter(
    c => c.id !== active && fares[c.id] != null
  );

  const go = (d: string) => navigate(resultsPath({ from, to, date: d }));

  // Every operator that runs the route answers "not on sale yet": the date is past their
  // sales windows. Operators that don't run the route have no say.
  const onRoute = results?.coverage.filter(c => c.status !== "no_route") ?? [];
  const latestOnSale =
    onRoute.length &&
    onRoute.every(c => c.status === "not_on_sale" && c.onSaleUntil)
      ? onRoute
          .map(c => c.onSaleUntil!)
          .sort()
          .at(-1)!
      : null;
  const tooFarAhead = latestOnSale != null && date > latestOnSale;

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl pt-6 sm:pt-8">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Change search
        </Link>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {fromName} → {toName}
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

        {fromCity && fromCity.places.length > 0 && (
          <NearPicker
            cityName={fromCity.name}
            places={fromCity.places}
            value={near}
            onChange={n => setNear(from, n)}
          />
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
            <ClassTabs
              active={active}
              onChange={setPicked}
              fares={fares}
              counts={counts}
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
              id="class-panel"
              role="tabpanel"
              aria-labelledby={`class-tab-${active}`}
              className="space-y-4"
            >
              {groups.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {groups.length}{" "}
                  {groups.length === 1 ? "operator" : "operators"} · cheapest
                  first{near ? ` from near ${near.name}` : ""} · 1 adult, online
                  fare
                </p>
              )}

              {groups.map(g => (
                <OperatorCard
                  key={`${active}:${g.operator}`}
                  group={g}
                  cheapest={cheapestOp === g.operator}
                  toCityName={toName}
                  loading={pendingOps.has(g.operator)}
                  near={near}
                />
              ))}

              {groups.length === 0 && stillLoading && (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              )}

              {groups.length === 0 && !stillLoading && (
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <SearchX
                    aria-hidden
                    className="mx-auto size-8 text-muted-foreground"
                  />
                  {tooFarAhead ? (
                    <>
                      <p className="mt-3 font-semibold">
                        Tickets for {formatDay(date)} aren't on sale yet
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Operators open bookings a few weeks ahead. The latest
                        date you can book right now is{" "}
                        {formatDay(latestOnSale!)}.
                      </p>
                      <button
                        type="button"
                        onClick={() => go(latestOnSale!)}
                        className="mt-4 h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        See fares for {formatDay(latestOnSale!)}
                      </button>
                    </>
                  ) : (
                    <p className="mt-3 font-semibold">
                      No {activeLabel.label.toLowerCase()} fares for this date
                    </p>
                  )}
                  {tooFarAhead ? null : otherWithFares.length > 0 ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {otherWithFares.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setPicked(c.id)}
                          className="h-10 rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          See {c.label} from {formatNaira(fares[c.id]!)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try another date. Some operators only sell a few days
                      ahead.
                    </p>
                  )}
                </div>
              )}

              {(groups.length > 0 || !stillLoading) && (
                <p className="text-xs text-muted-foreground">
                  {activeLabel.note} Vehicle pictures show the type of vehicle,
                  not the operator's own bus.
                </p>
              )}
            </section>

            {results && (
              <SearchSummary
                coverage={results.coverage}
                withFares={Array.from(
                  new Set(results.trips.map(t => t.operatorName))
                )}
                timedOut={timedOut}
                unavailable={results.unavailableOperators}
                onRetry={() => search({ from, to, date })}
              />
            )}
          </>
        )}
      </div>
    </SiteShell>
  );
}
