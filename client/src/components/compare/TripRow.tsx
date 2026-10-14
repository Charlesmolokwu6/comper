import { ArrowRight, ArrowUpRight, Clock, Info, Route } from "lucide-react";
import type { ComparedTrip } from "@/lib/api";
import {
  formatAge,
  formatDay,
  formatNaira,
  formatSeats,
  formatTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  trip: ComparedTrip;
  cheapest: boolean;
  /** Searched destination city name, for the pass-through note. */
  toCityName: string;
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs leading-snug",
        tone === "warn"
          ? "bg-amber-400/10 text-amber-200"
          : "bg-white/[0.06] text-neutral-300"
      )}
    >
      {children}
    </span>
  );
}

export function TripRow({ trip: t, cheapest, toCityName }: Props) {
  const seats = formatSeats(t.seatsAvailable);
  const day = formatDay(t.departure);
  const time = formatTime(t.departure);

  return (
    <article
      aria-label={`${t.operatorName}, ${time}, ${formatNaira(t.fare)}${t.soldOut ? ", sold out" : ""}`}
      className={cn(
        "rounded-2xl border bg-card p-4 sm:p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        cheapest ? "border-primary/70" : "border-border",
        t.soldOut && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            {t.operatorName}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t.vehicle}
            {seats && !t.soldOut && <span> · {seats}</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {cheapest && (
            <span className="mb-1 inline-block rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
              Cheapest
            </span>
          )}
          <p className="text-[1.75rem] font-extrabold leading-none tracking-tight tabular-nums text-foreground sm:text-3xl">
            {formatNaira(t.fare)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">1 adult, online</p>
        </div>
      </div>

      {t.listFare != null && (
        <p className="mt-2 text-xs text-muted-foreground sm:text-right">
          {t.listFareLabel ?? "Before discount"}{" "}
          <span className="tabular-nums">{formatNaira(t.listFare)}</span>
          {t.fareNote && <> · {t.fareNote}</>}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Clock aria-hidden className="size-4 text-muted-foreground" />
          {time}
        </span>
        <span className="text-muted-foreground">{day}</span>
        {/* Full terminal names (not truncated): users re-enter them on the operator's site. */}
        <span className="flex basis-full flex-wrap items-center gap-x-1.5 break-words text-neutral-300 sm:basis-auto">
          <span>{t.from.name}</span>
          <ArrowRight
            aria-label="to"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span>{t.to.name}</span>
        </span>
      </div>

      {(t.soldOut ||
        t.approximate ||
        t.passesThrough ||
        t.stale ||
        t.via.length > 0 ||
        t.notes.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {t.soldOut && <Badge>Sold out</Badge>}
          {t.approximate && (
            <Badge tone="warn">
              <Info aria-hidden className="mt-px size-3.5 shrink-0" />
              <span>
                Approximate match
                {t.matchNotes.length ? `: ${t.matchNotes.join("; ")}` : ""}
              </span>
            </Badge>
          )}
          {t.passesThrough && (
            <Badge>
              <Route aria-hidden className="mt-px size-3.5 shrink-0" />
              <span>
                Bus continues to {t.busFinalDestination}. Fare shown is to{" "}
                {toCityName}.
              </span>
            </Badge>
          )}
          {t.via.length > 0 && <Badge>Stops: {t.via.join(", ")}</Badge>}
          {t.stale && (
            <Badge>Price checked {formatAge(t.fetchedAt)} · refreshing</Badge>
          )}
          {t.notes.map(n => (
            <Badge key={n}>{n}</Badge>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {t.deepLink
            ? "Opens this search on the operator's site."
            : `On their site, search: ${t.from.name} → ${t.to.name}, ${day}, ${time}.`}
        </p>
        <a
          href={t.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            t.soldOut
              ? "border border-border text-foreground hover:bg-accent"
              : "border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {t.soldOut ? "View on" : "Book on"} {t.operatorName}
          <ArrowUpRight aria-hidden className="size-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}
