import { useState } from "react";
import { ArrowRight, ArrowUpRight, Plane } from "lucide-react";
import { formatAge, formatNaira, formatTime } from "@/lib/format";
import type { AirlineGroup, FlightRow } from "@/lib/flights";
import { prettyVehicle } from "@/lib/vehicles";
import { cn } from "@/lib/utils";

const FIRST_ROWS = 4;

function stopsLabel(stops: number) {
  return stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`;
}

function FlightRowItem({ r }: { r: FlightRow }) {
  const f = r.flight;
  // Worth saying when the airline uses a particular terminal, e.g. Rano Air's "LAGOS (MMA2)".
  const terminal = /\(/.test(f.fromName) ? f.fromName : null;
  const soldOut = !r.fares.length;
  return (
    <li className={cn("py-3.5", soldOut && "opacity-55")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-semibold tabular-nums text-foreground">
            {formatTime(f.departure)}
            <ArrowRight
              aria-label="to"
              className="size-3.5 text-muted-foreground"
            />
            {formatTime(f.arrival)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[
              f.duration,
              stopsLabel(f.stops),
              f.flightNumber && `Flight ${f.flightNumber}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {terminal && (
            <p className="mt-0.5 text-xs text-soft">
              Departs {prettyVehicle(terminal)}
            </p>
          )}
        </div>
        {soldOut ? (
          <span className="pt-0.5 text-sm font-semibold text-muted-foreground">
            Sold out
          </span>
        ) : (
          <a
            href={f.bookingUrl}
            data-umami-event="Book flight"
            data-umami-event-company={f.airlineName}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 shrink-0 items-center gap-0.5 rounded-md px-1 text-sm font-semibold text-primary-ink hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Book
            <ArrowUpRight aria-hidden className="size-4" />
            <span className="sr-only">
              {f.airlineName} {formatTime(f.departure)} flight (opens in a new
              tab)
            </span>
          </a>
        )}
      </div>
      {r.fares.length > 0 && (
        <ul aria-label="Fares" className="mt-2.5 flex flex-wrap gap-1.5">
          {r.fares.map((x, i) => (
            <li
              key={x.name}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs",
                i === 0
                  ? "border-primary/50 bg-primary/[0.07] text-foreground"
                  : "border-border text-soft"
              )}
            >
              <span className="text-muted-foreground">
                {prettyVehicle(x.name)}
              </span>{" "}
              <span className="font-semibold tabular-nums">
                {formatNaira(x.price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function FlightCard({
  group: g,
  cheapest,
  loading,
}: {
  group: AirlineGroup;
  cheapest: boolean;
  loading: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? g.rows : g.rows.slice(0, FIRST_ROWS);
  const times = g.rows.map(r => r.flight.departure).sort();
  const first = formatTime(times[0]);
  const last = formatTime(times[times.length - 1]);
  const span = first === last ? first : `${first}–${last}`;
  const deep = g.rows.some(r => r.flight.deepLink);
  const fetchedAt = g.rows[0]?.flight.fetchedAt;

  return (
    <article
      aria-label={`${g.airlineName}${g.best ? `, from ${formatNaira(g.best.price)}` : ", sold out"}`}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        cheapest ? "border-primary/60" : "border-border"
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-primary-ink"
              >
                <Plane className="size-4" />
              </span>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {g.airlineName}
              </h3>
              {cheapest && (
                <span className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  Cheapest
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {g.rows.length} {g.rows.length === 1 ? "flight" : "flights"} ·{" "}
              {span}
              {loading && " · more loading"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {g.best ? (
              <>
                <p className="text-xs text-muted-foreground">from</p>
                <p className="text-[1.75rem] font-extrabold leading-none tracking-tight tabular-nums text-foreground sm:text-3xl">
                  {formatNaira(g.best.price)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  1 adult, taxes incl.
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">
                Sold out
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 sm:px-5">
        <ul className="divide-y divide-border">
          {rows.map(r => (
            <FlightRowItem
              key={`${r.flight.flightNumber}-${r.flight.departure}`}
              r={r}
            />
          ))}
        </ul>
        {!showAll && g.rows.length > FIRST_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mb-3 h-11 w-full rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            Show {g.rows.length - FIRST_ROWS} more
          </button>
        )}
        <p className="pb-4 pt-1 text-xs text-muted-foreground">
          {deep
            ? `Book opens this search on ${g.airlineName}'s own site.`
            : `Book opens ${g.airlineName}'s site: search the same flight there.`}
          {fetchedAt && ` Prices checked ${formatAge(fetchedAt)}.`}
        </p>
      </div>
    </article>
  );
}
