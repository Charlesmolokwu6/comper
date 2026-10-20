import { useId, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Info,
  Navigation,
  Route,
} from "lucide-react";
import type { ComparedTrip } from "@/lib/api";
import {
  formatAge,
  formatDay,
  formatNaira,
  formatSeats,
  formatTime,
  prettyStop,
  sentenceCase,
} from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import type { BoardingPoint, OperatorGroup } from "@/lib/group";
import {
  KIND_LABEL,
  prettyVehicle,
  vehicleOptions,
  type VehicleOption,
} from "@/lib/vehicles";
import type { Near } from "./NearPicker";
import { BookingGuide } from "./BookingGuide";
import { VehicleThumb } from "./VehicleIcon";
import { cn } from "@/lib/utils";

const FIRST_ROWS = 8;

const BOOK_CLASS =
  "inline-flex min-h-8 items-center gap-0.5 rounded-md px-1 text-xs font-semibold text-primary-ink hover:underline focus-visible:outline-2 focus-visible:outline-ring";

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
        <p className="flex flex-wrap items-center gap-x-1.5 text-soft">
          <span title={t.from.name}>{prettyStop(t.from.name)}</span>
          <ArrowRight
            aria-label="to"
            className="size-3 shrink-0 text-muted-foreground"
          />
          <span title={t.to.name}>{prettyStop(t.to.name)}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {prettyVehicle(t.vehicle)}
          {t.soldOut ? " · Sold out" : seats ? ` · ${seats}` : ""}
          {t.stale && ` · price from ${formatAge(t.fetchedAt)}`}
        </p>
        {(t.approximate ||
          t.passesThrough ||
          t.via.length > 0 ||
          notes.length > 0) && (
          <ul className="mt-1.5 space-y-1 text-xs">
            {t.approximate && (
              <li className="flex gap-1.5 text-warn">
                <Info aria-hidden className="mt-px size-3.5 shrink-0" />
                <span>
                  {t.matchNotes.join("; ") || "Approximate city match"}
                </span>
              </li>
            )}
            {t.passesThrough && (
              <li className="flex gap-1.5 text-soft">
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
        <BookTrip t={t} className={BOOK_CLASS} />
      </div>
    </li>
  );
}

function VehicleTile({
  o,
  operatorName,
  selected,
  onSelect,
}: {
  o: VehicleOption;
  operatorName: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-[9.5rem] shrink-0 snap-start flex-col rounded-xl border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        selected
          ? "border-primary bg-primary/[0.07]"
          : "border-border hover:border-strong"
      )}
    >
      <VehicleThumb
        kind={o.kind}
        image={o.image}
        alt={`${operatorName} ${o.name}`}
        className="h-16 w-full"
      />
      <span className="mt-2 truncate text-sm font-semibold text-foreground">
        {o.name}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {o.kind ? KIND_LABEL[o.kind] : "Bus"}
        {o.image ? " · operator photo" : ""}
      </span>
      <span className="mt-1 text-sm tabular-nums text-soft">
        {o.best ? `from ${formatNaira(o.best.fare)}` : "Sold out"}
      </span>
    </button>
  );
}

/** Book a trip: straight to the operator's search, or a guide when it can't be deep-linked. */
function BookTrip({
  t,
  className,
  label = "Book",
}: {
  t: ComparedTrip;
  className: string;
  label?: string;
}) {
  return t.deepLink ? (
    <a
      href={t.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label}
      <ArrowUpRight aria-hidden className="size-3.5" />
      <span className="sr-only">
        {t.operatorName} {formatTime(t.departure)} from{" "}
        {prettyStop(t.from.name)} (opens in a new tab)
      </span>
    </a>
  ) : (
    <BookingGuide
      operatorName={t.operatorName}
      url={t.bookingUrl}
      triggerClassName={className}
      triggerLabel={label}
      srLabel={`${t.operatorName} ${formatTime(t.departure)} from ${prettyStop(t.from.name)}`}
      rows={[
        {
          label: "From",
          value: prettyStop(t.from.name),
          theirName: t.from.name,
        },
        {
          label: "To",
          value: prettyStop(t.to.name),
          theirName: t.to.name,
        },
        { label: "Date", value: formatDay(t.departure.slice(0, 10)) },
        { label: "Departs", value: formatTime(t.departure) },
        { label: "Bus", value: prettyVehicle(t.vehicle) },
        { label: "Fare", value: formatNaira(t.fare) },
      ]}
    />
  );
}

interface Props {
  group: OperatorGroup;
  cheapest: boolean;
  toCityName: string;
  /** More departures may still arrive for this operator. */
  loading: boolean;
  near: Near | null;
}

function TripList({
  trips,
  toCityName,
  sharedNotes,
}: {
  trips: ComparedTrip[];
  toCityName: string;
  sharedNotes: string[];
}) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? trips : trips.slice(0, FIRST_ROWS);
  return (
    <>
      <ul className="divide-y divide-border">
        {rows.map(t => (
          <DepartureRow
            key={`${t.from.id}:${t.id}`}
            t={t}
            toCityName={toCityName}
            sharedNotes={sharedNotes}
          />
        ))}
      </ul>
      {!showAll && trips.length > FIRST_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mb-3 h-11 w-full rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          Show {trips.length - FIRST_ROWS} more
        </button>
      )}
    </>
  );
}

function PointHeading({ p }: { p: BoardingPoint }) {
  return (
    <h4 className="flex items-baseline justify-between gap-3 pt-4 text-sm font-semibold text-foreground">
      <span>
        {p.name}
        {p.distanceKm != null && (
          <span className="font-normal text-muted-foreground">
            {" "}
            · {formatDistance(p.distanceKm)}
          </span>
        )}
      </span>
      <span className="font-normal tabular-nums text-muted-foreground">
        {p.best ? `from ${formatNaira(p.best.fare)}` : "Sold out"}
      </span>
    </h4>
  );
}

export function OperatorCard({
  group: g,
  cheapest,
  toCityName,
  loading,
  near,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const [vehicle, setVehicle] = useState<string | null>(null);
  const listId = useId();
  const best = g.best;
  const nearest = g.nearest;
  // With a location set, the card is about the one terminal closest to the traveller.
  const atPoint = nearest ? nearest.trips : g.trips;
  const options = vehicleOptions(atPoint);
  const picked = options.some(o => o.name === vehicle) ? vehicle : null;
  const shown = picked
    ? atPoint.filter(t => prettyVehicle(t.vehicle) === picked)
    : atPoint;
  const others = nearest ? g.points.filter(p => p !== nearest) : [];
  // The trip behind the "from" price, or the picked vehicle's cheapest seat.
  const headline =
    (picked
      ? shown.filter(t => !t.soldOut).sort((a, b) => a.fare - b.fare)[0]
      : best) ?? null;
  const count = atPoint.length;
  const times = atPoint.map(t => t.departure).sort();
  const first = formatTime(times[0]);
  const last = formatTime(times[times.length - 1]);
  const span = first === last ? first : `${first} – ${last}`;
  // Departures from this operator's other terminals, hidden while one is "nearest".
  const elsewhere = others.reduce((n, p) => n + p.trips.length, 0);
  const showElsewhere = () => {
    setOpen(true);
    setShowOthers(true);
  };

  return (
    <article
      aria-label={`${g.operatorName}${best ? `, from ${formatNaira(best.fare)}` : ", sold out"}`}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        cheapest ? "border-primary/60" : "border-border"
      )}
    >
      <div className="p-4 pb-0 sm:p-5 sm:pb-0">
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
              {count} {count === 1 ? "departure" : "departures"}
              {nearest && others.length > 0 && ` from ${nearest.name}`} · {span}
              {loading && " · more loading"}
            </p>
            {elsewhere > 0 && (
              <button
                type="button"
                onClick={showElsewhere}
                className="mt-0.5 rounded text-left text-sm font-medium text-primary-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                + {elsewhere} more at {others.length} other{" "}
                {others.length === 1 ? "terminal" : "terminals"}
              </button>
            )}
            {nearest ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-soft">
                <Navigation
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0 text-primary-ink"
                />
                <span>
                  Board at <span className="font-semibold">{nearest.name}</span>
                  {nearest.distanceKm != null && near && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatDistance(nearest.distanceKm)} from {near.name}
                    </span>
                  )}
                </span>
              </p>
            ) : (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {g.points.length === 1
                  ? `Boards at ${g.points[0].name}`
                  : near
                    ? `${g.points.length} boarding points · locations unknown`
                    : `${g.points.length} boarding points`}
              </p>
            )}
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
          <p className="mt-2 flex gap-1.5 text-xs text-warn">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>
              Only via an approximate match: {best.matchNotes.join("; ")}
            </span>
          </p>
        )}
      </div>

      {options.length === 1 && (
        <div className="mx-4 mt-4 flex items-center gap-3 sm:mx-5">
          <VehicleThumb
            kind={options[0].kind}
            image={options[0].image}
            alt={`${g.operatorName} ${options[0].name}`}
            className="h-10 w-16"
          />
          <p className="min-w-0 text-sm">
            <span className="font-semibold text-foreground">
              {options[0].name}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {options[0].kind ? KIND_LABEL[options[0].kind] : "Bus"}
            </span>
          </p>
        </div>
      )}

      {options.length > 1 && (
        <div className="mt-4">
          <p className="px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-5">
            {options.length} vehicle options
          </p>
          <div
            role="group"
            aria-label={`${g.operatorName} vehicle options`}
            className="mt-2 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-5"
          >
            {options.map(o => (
              <VehicleTile
                key={o.name}
                o={o}
                operatorName={g.operatorName}
                selected={picked === o.name}
                onSelect={() => {
                  setVehicle(picked === o.name ? null : o.name);
                  setOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pr-4 sm:pr-5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(o => !o)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-1.5 px-4 py-3 text-left text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
        >
          {open
            ? "Hide departures"
            : picked
              ? `See ${shown.length === 1 ? "the" : shown.length} ${picked} ${shown.length === 1 ? "departure" : "departures"}`
              : nearest
                ? `See ${count === 1 ? "departure" : `${count} departures`} from ${nearest.name}`
                : `See ${count === 1 ? "departure" : `all ${count} departures`}`}
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
        {/* The headline trip, bookable without opening the list. */}
        {headline && !open && (
          <BookTrip
            t={headline}
            label={
              count === 1 ? "Book" : `Book ${formatTime(headline.departure)}`
            }
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary px-3.5 text-sm font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        )}
      </div>

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
        {picked && (
          <p className="flex items-center justify-between gap-3 pt-3 text-xs text-muted-foreground">
            <span>Showing {picked} only</span>
            <button
              type="button"
              onClick={() => setVehicle(null)}
              className="min-h-8 rounded-md px-1 font-semibold text-primary-ink hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Show all vehicles
            </button>
          </p>
        )}
        <TripList
          key={picked ?? "all"}
          trips={shown}
          toCityName={toCityName}
          sharedNotes={g.sharedNotes}
        />
        {others.length > 0 && (
          <div className="border-t border-border">
            <button
              type="button"
              aria-expanded={showOthers}
              onClick={() => setShowOthers(o => !o)}
              className="flex min-h-11 w-full items-center justify-between gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {showOthers
                ? "Hide other terminals"
                : `${elsewhere} more ${elsewhere === 1 ? "departure" : "departures"} at ${others.length} other ${others.length === 1 ? "terminal" : "terminals"}`}
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 transition-transform",
                  showOthers && "rotate-180"
                )}
              />
            </button>
            {showOthers &&
              others.map(p => (
                <section key={p.name}>
                  <PointHeading p={p} />
                  <TripList
                    trips={p.trips}
                    toCityName={toCityName}
                    sharedNotes={g.sharedNotes}
                  />
                </section>
              ))}
          </div>
        )}
        <p className="pb-4 pt-1 text-xs text-muted-foreground">
          {shown.some(t => t.deepLink)
            ? `Book opens this search on ${g.operatorName}'s site.`
            : `Book shows the exact trip to pick, then opens ${g.operatorName}'s site.`}
        </p>
      </div>
    </article>
  );
}
