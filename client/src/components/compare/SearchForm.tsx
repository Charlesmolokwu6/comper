import { useMemo } from "react";
import { ArrowDownUp, CalendarDays, Search } from "lucide-react";
import type { NetworkResponse } from "@/lib/api";
import { lagosDate } from "@/lib/format";
import { cityOf, parsePlace, placeString } from "@/lib/places";
import { CityPicker, type CityOption } from "./CityPicker";
import { NearPicker, type Near } from "./NearPicker";

/** The API accepts dates up to 90 days ahead; operators may sell less (shown per operator). */
// The longest operator sales window (GUO, 45 days); nothing is on sale beyond it.
const MAX_DAYS_AHEAD = 45;

export interface SearchValues {
  /** Places: "lagos" or "lagos~ajah" (lib/places.ts). */
  from: string | null;
  to: string | null;
  date: string;
}

interface Props {
  network: NetworkResponse | null;
  networkError: string | null;
  values: SearchValues;
  onChange: (v: SearchValues) => void;
  onSubmit: () => void;
  busy: boolean;
  near: Near | null;
  onNearChange: (near: Near | null) => void;
}

export function SearchForm({
  network,
  networkError,
  values,
  onChange,
  onSubmit,
  busy,
  near,
  onNearChange,
}: Props) {
  const cities = network?.cities ?? [];
  const fromKey = cityOf(values.from);
  const toKey = cityOf(values.to);
  const fromCity = cities.find(c => c.city === fromKey);
  const fromTerminal = parsePlace(values.from)?.terminal ?? null;

  const fromOptions: CityOption[] = useMemo(
    () =>
      cities.map(c => ({
        city: c.city,
        name: c.name,
        terminals: c.terminals,
      })),
    [cities]
  );
  const toOptions: CityOption[] = useMemo(
    () =>
      (fromCity?.destinations ?? []).map(d => ({
        city: d.city,
        name: d.name,
        hint: d.approximate ? "approx. match" : undefined,
        terminals: d.terminals,
      })),
    [fromCity]
  );

  const loadingFooter =
    network && !network.complete
      ? "More routes are loading — check back in a moment."
      : undefined;
  const today = lagosDate();
  const canSwap = !!values.from && !!values.to;
  // A terminal survives the swap only if it exists on the other side.
  const swap = () => {
    const back = cities.find(c => c.city === toKey);
    const dest = back?.destinations.find(d => d.city === fromKey);
    const keep = (
      place: string | null,
      terminals: { key: string }[] | undefined
    ) => {
      const p = parsePlace(place);
      if (!p) return null;
      return placeString(
        p.city,
        terminals?.some(t => t.key === p.terminal) ? p.terminal : null
      );
    };
    onChange({
      ...values,
      from: keep(values.to, back?.terminals),
      to: dest ? keep(values.from, dest.terminals) : null,
    });
  };

  return (
    <form
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
      aria-label="Search bus fares"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_minmax(11rem,0.8fr)] md:items-end">
        <CityPicker
          label="From"
          value={values.from}
          options={fromOptions}
          onChange={from => {
            const stillReachable = cities
              .find(c => c.city === cityOf(from))
              ?.destinations.some(d => d.city === toKey);
            onChange({
              ...values,
              from,
              to: stillReachable ? values.to : null,
            });
          }}
          placeholder={
            network
              ? "Departure city"
              : networkError
                ? "Couldn't load cities"
                : "Loading cities…"
          }
          disabled={!network}
          footer={loadingFooter}
        />

        <div className="flex justify-end md:mb-2 md:justify-center">
          <button
            type="button"
            onClick={swap}
            disabled={!canSwap}
            aria-label="Swap From and To"
            className="-my-2 flex size-11 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 md:my-0"
          >
            <ArrowDownUp aria-hidden className="size-4 md:rotate-90" />
          </button>
        </div>

        <CityPicker
          label="To"
          value={values.to}
          options={toOptions}
          onChange={to => onChange({ ...values, to })}
          placeholder={values.from ? "Destination city" : "Choose From first"}
          disabled={!values.from}
          footer={loadingFooter}
        />

        <label className="block min-w-0">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Date
          </span>
          <span className="relative flex h-14 items-center rounded-xl border border-border bg-surface px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
            <CalendarDays
              aria-hidden
              className="pointer-events-none mr-3 size-5 shrink-0 text-muted-foreground"
            />
            <input
              type="date"
              required
              value={values.date}
              min={today}
              max={lagosDate(MAX_DAYS_AHEAD)}
              onChange={e =>
                onChange({
                  ...values,
                  date: e.target.value < today ? today : e.target.value,
                })
              }
              className="w-full bg-transparent text-base font-semibold text-foreground outline-none"
            />
          </span>
        </label>
      </div>

      {fromCity && !fromTerminal && fromCity.places?.length > 0 && (
        <NearPicker
          cityName={fromCity.name}
          places={fromCity.places}
          value={near}
          onChange={onNearChange}
        />
      )}

      <button
        type="submit"
        disabled={!values.from || !values.to || !values.date || busy}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground transition-[filter,opacity] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Search aria-hidden className="size-5" />
        {busy ? "Searching…" : "Compare fares"}
      </button>

      {networkError && !network && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Couldn't load the route list: {networkError}. Retrying…
        </p>
      )}
    </form>
  );
}
