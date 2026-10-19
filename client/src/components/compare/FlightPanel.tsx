import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, CalendarDays, Search } from "lucide-react";
import { useLocation } from "wouter";
import { fetchFlightNetwork, type FlightNetworkCity } from "@/lib/api";
import { lagosDate } from "@/lib/format";
import {
  flightsPath,
  lastFlightSearch,
  rememberFlightSearch,
} from "@/lib/routes";
import { CityPicker, type CityOption } from "./CityPicker";

const MAX_DAYS_AHEAD = 180;

function useFlightNetwork() {
  const [cities, setCities] = useState<FlightNetworkCity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchFlightNetwork(ctrl.signal)
      .then(r => setCities(r.cities))
      .catch(e => !ctrl.signal.aborted && setError(e.message));
    return () => ctrl.abort();
  }, []);
  return { cities, error };
}

/** Flight search form. Compare opens the results on their own page. */
export function FlightPanel() {
  const { cities, error } = useFlightNetwork();
  const [, navigate] = useLocation();
  const [values, setValues] = useState(() => {
    const last = lastFlightSearch();
    return {
      from: last.from ?? "lagos",
      to: last.to ?? null,
      date: last.date && last.date >= lagosDate() ? last.date : lagosDate(1),
    } as { from: string | null; to: string | null; date: string };
  });

  const list = cities ?? [];
  const fromCity = list.find(c => c.city === values.from);
  const fromOptions: CityOption[] = useMemo(
    () => list.map(c => ({ city: c.city, name: c.name })),
    [list]
  );
  const toOptions: CityOption[] = useMemo(
    () =>
      (fromCity?.destinations ?? []).map(d => ({ city: d.city, name: d.name })),
    [fromCity]
  );
  const today = lagosDate();

  const submit = () => {
    if (!values.from || !values.to) return;
    const q = { from: values.from, to: values.to, date: values.date };
    rememberFlightSearch(q);
    navigate(flightsPath(q));
    window.scrollTo(0, 0);
  };

  const swap = () => {
    const back = list.find(c => c.city === values.to);
    const reachable = back?.destinations.some(d => d.city === values.from);
    setValues(v => ({ ...v, from: v.to, to: reachable ? v.from : null }));
  };

  return (
    <form
      className="rounded-2xl border border-border bg-card p-3.5 sm:p-5"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
      aria-label="Search flight fares"
    >
      <div className="grid gap-2.5 md:grid-cols-[1fr_auto_1fr_minmax(11rem,0.8fr)] md:items-end">
        <CityPicker
          label="From"
          value={values.from}
          options={fromOptions}
          onChange={from =>
            setValues(v => ({
              ...v,
              from,
              to: list
                .find(c => c.city === from)
                ?.destinations.some(d => d.city === v.to)
                ? v.to
                : null,
            }))
          }
          placeholder={
            cities
              ? "Departure city"
              : error
                ? "Couldn't load cities"
                : "Loading cities…"
          }
          disabled={!cities}
        />
        <div className="flex justify-end md:mb-2 md:justify-center">
          <button
            type="button"
            onClick={swap}
            disabled={!values.from || !values.to}
            aria-label="Swap From and To"
            className="-my-2.5 flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 md:my-0"
          >
            <ArrowDownUp aria-hidden className="size-4 md:rotate-90" />
          </button>
        </div>
        <CityPicker
          label="To"
          value={values.to}
          options={toOptions}
          onChange={to => setValues(v => ({ ...v, to }))}
          placeholder={values.from ? "Destination city" : "Choose From first"}
          disabled={!values.from}
        />
        <label className="block min-w-0">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Date
          </span>
          <span className="relative flex h-12 items-center rounded-xl border border-border bg-surface px-3.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
            <CalendarDays
              aria-hidden
              className="pointer-events-none mr-2.5 size-5 shrink-0 text-muted-foreground"
            />
            <input
              type="date"
              required
              value={values.date}
              min={today}
              max={lagosDate(MAX_DAYS_AHEAD)}
              onChange={e =>
                setValues(v => ({
                  ...v,
                  date: e.target.value < today ? today : e.target.value,
                }))
              }
              className="w-full bg-transparent text-[15px] font-semibold text-foreground outline-none"
            />
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!values.from || !values.to || !values.date}
        className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground transition-[filter,opacity] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Search aria-hidden className="size-5" />
        Compare flights
      </button>

      {error && !cities && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Couldn't load the airports list: {error}.
        </p>
      )}
    </form>
  );
}
