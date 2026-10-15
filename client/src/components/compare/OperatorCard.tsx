import { useId, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Info,
  Route,
} from "lucide-react";
import type { ComparedTrip } from "@/lib/api";
import {
  formatAge,
  formatNaira,
  formatSeats,
  formatTime,
  prettyStop,
  sentenceCase,
} from "@/lib/format";
import type { OperatorGroup } from "@/lib/group";
import { cn } from "@/lib/utils";

const FIRST_ROWS = 8;

function DepartureRow({
  t,
  toCityName,
  sharedNotes,
}: {
  t: ComparedTrip;
  toCityName: string;
  sharedNotes: string[];
}) {
  const seats = formatSeats(t.seatsAvailable);
  const notes = t.notes.filter(n => !sharedNotes.includes(n));
  return (
    <li
      className={cn(
        "grid grid-cols-[3.25rem_minmax(0,1fr)_auto] gap-x-3 py-3",
        t.soldOut && "opacity-55"
      )}
    >
      <span className="pt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {formatTime(t.departure)}
      </span>

      <div className="min-w-0 text-sm">
        <p className="flex flex-wrap items-center gap-x-1.5 text-neutral-200">
          <span title={t.from.name}>{prettyStop(t.from.name)}</span>
          <ArrowRight
            aria-label="to"
            className="size-3 shrink-0 text-muted-foreground"
          />
          <span title={t.to.name}>{prettyStop(t.to.name)}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t.vehicle}
          {t.soldOut ? " · Sold out" : seats ? ` · ${seats}` : ""}
          {t.stale && ` · price from ${formatAge(t.fetchedAt)}`}
        </p>
        {(t.approximate ||
          t.passesThrough ||
          t.via.length > 0 ||
          notes.length > 0) && (
          <ul className="mt-1.5 space-y-1 text-xs">
            {t.approximate && (
              <li className="flex gap-1.5 text-amber-200">
                <Info aria-hidden className="mt-px size-3.5 shrink-0" />
                <span>
                  {t.matchNotes.join("; ") || "Approximate city match"}
                </span>
              </li>
            )}
            {t.passesThrough && (
              <li className="flex gap-1.5 text-neutral-300">
                <Route aria-hidden className="mt-px size-3.5 shrink-0" />
                <span>
                  Continues to {t.busFinalDestination}; fare is to {toCityName}
                </span>
              </li>
            )}
            {t.via.length > 0 && (
              <li className="text-muted-foreground">
                Stops: {t.via.join(", ")}
              </li>
            )}
            {notes.map(n => (
              <li key={n} className="text-muted-foreground">
                {sentenceCase(n)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-base font-bold tabular-nums text-foreground">
          {formatNaira(t.fare)}
        </span>
        <a
          href={t.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-8 items-center gap-0.5 rounded-md px-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Book
          <ArrowUpRight aria-hidden className="size-3.5" />
          <span className="sr-only">
            {t.operatorName} {formatTime(t.departure)} from{" "}
            {prettyStop(t.from.name)} (opens in a new tab)
          </span>
        </a>
      </div>
    </li>
  );
}

interface Props {
  group: OperatorGroup;
  cheapest: boolean;
  toCityName: string;
  /** More departures may still arrive for this operator. */
  loading: boolean;
}

export function OperatorCard({
  group: g,
  cheapest,
  toCityName,
  loading,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const best = g.best;
  // Chisco lists Jibowu (am) and Jibowu (pm) separately; they're one place to a traveller.
  const boarding = Array.from(new Set(g.boardingPoints.map(prettyStop)));
  const count = g.trips.length;
  const rows = showAll ? g.trips : g.trips.slice(0, FIRST_ROWS);
  const span =
    formatTime(g.firstDeparture) === formatTime(g.lastDeparture)
      ? formatTime(g.firstDeparture)
      : `${formatTime(g.firstDeparture)}–${formatTime(g.lastDeparture)}`;

  return (
    <article
      aria-label={`${g.operatorName}${best ? `, from ${formatNaira(best.fare)}` : ", sold out"}`}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        cheapest ? "border-primary/60" : "border-border"
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(o => !o)}
        className="block w-full p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {g.operatorName}
              </h3>
              {cheapest && (
                <span className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  Cheapest
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {count} {count === 1 ? "departure" : "departures"} · {span}
              {loading && " · more loading"}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {boarding.length === 1
                ? `Boards at ${boarding[0]}`
                : `${boarding.length} boarding points`}
            </p>
          </div>

          <div className="shrink-0 text-right">
            {best ? (
              <>
                <p className="text-xs text-muted-foreground">from</p>
                <p className="text-[1.75rem] font-extrabold leading-none tracking-tight tabular-nums text-foreground sm:text-3xl">
                  {formatNaira(best.fare)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  1 adult, online
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">
                Sold out
              </p>
            )}
          </div>
        </div>

        {best?.listFare != null && (
          <p className="mt-3 text-xs text-muted-foreground">
            {best.listFareLabel ?? "Before discount"}{" "}
            {formatNaira(best.listFare)}
            {best.fareNote && ` · ${best.fareNote}`}
          </p>
        )}
        {g.bestIsApproximate && best && (
          <p className="mt-2 flex gap-1.5 text-xs text-amber-200">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>
              Only via an approximate match: {best.matchNotes.join("; ")}
            </span>
          </p>
        )}

        <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-foreground">
          {open
            ? "Hide departures"
            : `See ${count === 1 ? "departure" : `all ${count} departures`}`}
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </span>
      </button>

      <div
        id={listId}
        hidden={!open}
        className="border-t border-border px-4 sm:px-5"
      >
        {g.sharedNotes.length > 0 && (
          <p className="pt-3 text-xs text-muted-foreground">
            {g.sharedNotes.map(sentenceCase).join(" · ")}
          </p>
        )}
        <ul className="divide-y divide-border">
          {rows.map(t => (
            <DepartureRow
              key={`${t.from.id}:${t.id}`}
              t={t}
              toCityName={toCityName}
              sharedNotes={g.sharedNotes}
            />
          ))}
        </ul>
        {!showAll && count > FIRST_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mb-3 h-11 w-full rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
          >
            Show {count - FIRST_ROWS} more
          </button>
        )}
        <p className="pb-4 pt-1 text-xs text-muted-foreground">
          {g.trips.some(t => t.deepLink)
            ? `Book opens this search on ${g.operatorName}'s site.`
            : `Book opens ${g.operatorName}'s site: search the same terminal, date and time there.`}
        </p>
      </div>
    </article>
  );
}
