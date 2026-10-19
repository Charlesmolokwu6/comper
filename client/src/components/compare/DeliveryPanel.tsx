import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  ChevronDown,
  Package,
  Search,
} from "lucide-react";
import {
  fetchDeliveryQuote,
  fetchDeliveryStations,
  type DeliveryQuoteResponse,
  type DeliveryStation,
} from "@/lib/api";
import { formatAge, formatNaira } from "@/lib/format";
import { STATE_CAPITALS } from "@/lib/stateCapitals";
import { cn } from "@/lib/utils";
import { LoadingResults } from "./Loader";

// The map library only loads once the delivery tab shows a map.
const TripMap = lazy(() => import("./TripMap"));

const WEIGHTS = [1, 2, 5, 10];
const LAGOS = 4;

const fieldLabel =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground";
const field =
  "flex h-14 w-full items-center rounded-xl border border-border bg-surface px-4 text-base font-semibold text-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary";

function StateSelect({
  id,
  label,
  value,
  stations,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  stations: DeliveryStation[];
  onChange: (id: number) => void;
}) {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className={fieldLabel}>{label}</span>
      <span className={cn(field, "relative")}>
        <select
          id={id}
          value={value ?? ""}
          onChange={e => onChange(Number(e.target.value))}
          disabled={!stations.length}
          className="w-full appearance-none bg-transparent pr-8 outline-none"
        >
          {!stations.length && <option value="">Loading states…</option>}
          {stations.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-4 size-4 text-muted-foreground"
        />
      </span>
    </label>
  );
}

/**
 * Delivery tab: live parcel prices by state, weight and declared value. GIG Logistics is the
 * only courier whose public calculator we can use today; the rest are listed with why not.
 */
export function DeliveryPanel() {
  const [stations, setStations] = useState<DeliveryStation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [from, setFrom] = useState<number | null>(LAGOS);
  const [to, setTo] = useState<number | null>(LAGOS);
  const [weight, setWeight] = useState("2");
  const [value, setValue] = useState("10000");
  const [result, setResult] = useState<DeliveryQuoteResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchDeliveryStations(ctrl.signal)
      .then(r => setStations(r.stations))
      .catch(e => !ctrl.signal.aborted && setLoadError(e.message));
    return () => ctrl.abort();
  }, []);

  const kg = Number(weight);
  const naira = Number(value || 0);
  const valid =
    from != null && to != null && kg >= 0.1 && kg <= 100 && naira >= 0;
  const name = (id: number | null) =>
    stations.find(s => s.id === id)?.name ?? "";

  const submit = () => {
    if (!valid) return;
    setState("loading");
    setError(null);
    setResult(null);
    fetchDeliveryQuote({ from: from!, to: to!, weight: kg, value: naira })
      .then(r => {
        setResult(r);
        setState("idle");
      })
      .catch(e => {
        setError(e.message);
        setState("error");
      });
  };

  return (
    <div className="space-y-4">
      <form
        aria-label="Delivery prices"
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <StateSelect
            id="delivery-from"
            label="Send from"
            value={from}
            stations={stations}
            onChange={setFrom}
          />
          <div className="flex justify-end md:mb-2 md:justify-center">
            <button
              type="button"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              aria-label="Swap states"
              className="-my-2 flex size-11 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary md:my-0"
            >
              <ArrowDownUp aria-hidden className="size-4 md:rotate-90" />
            </button>
          </div>
          <StateSelect
            id="delivery-to"
            label="Deliver to"
            value={to}
            stations={stations}
            onChange={setTo}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="delivery-weight" className={fieldLabel}>
              Weight
            </label>
            <span className={field}>
              <input
                id="delivery-weight"
                inputMode="decimal"
                value={weight}
                onChange={e => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
                className="w-full bg-transparent outline-none"
              />
              <span className="font-normal text-muted-foreground">kg</span>
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEIGHTS.map(w => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={kg === w}
                  onClick={() => setWeight(String(w))}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary",
                    kg === w
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:bg-accent"
                  )}
                >
                  {w} kg
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="delivery-value" className={fieldLabel}>
              Item value
            </label>
            <span className={field}>
              <span className="mr-1 font-normal text-muted-foreground">₦</span>
              <input
                id="delivery-value"
                inputMode="numeric"
                value={value ? Number(value).toLocaleString("en-NG") : ""}
                onChange={e => setValue(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-transparent outline-none"
              />
            </span>
            <p className="mt-2 text-xs text-muted-foreground">
              What the parcel is worth. Couriers use it for insurance.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!valid || state === "loading"}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search aria-hidden className="size-5" />
          {state === "loading" ? "Getting prices…" : "Get delivery prices"}
        </button>
        {loadError && (
          <p role="alert" className="mt-3 text-sm text-amber-200">
            Couldn't load the list of states: {loadError}
          </p>
        )}
      </form>

      {from != null &&
        to != null &&
        (() => {
          const a = STATE_CAPITALS[name(from)];
          const b = STATE_CAPITALS[name(to)];
          if (!a || !b) return null;
          const same = from === to;
          return (
            <Suspense
              fallback={
                <div className="h-64 rounded-2xl border border-border bg-card sm:h-80" />
              }
            >
              <TripMap
                pickup={{ name: a.city, lat: a.lat, lon: a.lon }}
                dropoff={same ? null : { name: b.city, lat: b.lat, lon: b.lon }}
                labels={{ from: `From ${a.city}`, to: `To ${b.city}` }}
                describe={km =>
                  `${km} km by road, ${a.city} to ${b.city} (state capitals)`
                }
                note={same ? `Delivery within ${name(from)}` : undefined}
                pointZoom={9}
              />
            </Suspense>
          );
        })()}

      {state === "loading" && (
        <LoadingResults
          title="Getting live delivery prices"
          detail="Asking each courier for its price. This takes a few seconds."
        />
      )}

      {state === "error" && (
        <p
          role="alert"
          className="rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
        >
          Couldn't get prices: {error}
        </p>
      )}

      {result && (
        <section aria-label="Delivery prices" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {name(from)} → {name(to)} · {kg} kg · item worth{" "}
            {formatNaira(naira)}
          </p>
          {result.couriers.map(c => (
            <article
              key={c.id}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                    <Package aria-hidden className="size-5 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-foreground">
                      {c.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {c.status === "price"
                        ? c.note
                        : `Couldn't get a price just now: ${c.message}`}
                    </p>
                  </div>
                </div>
                {c.status === "price" && (
                  <div className="shrink-0 text-right">
                    <p className="text-[1.75rem] font-extrabold leading-none tracking-tight tabular-nums text-foreground">
                      {formatNaira(c.price)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      price from {formatAge(c.fetchedAt)}
                    </p>
                  </div>
                )}
              </div>
              <a
                href={c.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Book on {c.name}
                <ArrowUpRight aria-hidden className="size-4" />
              </a>
            </article>
          ))}
          {result.unavailable.length > 0 && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer select-none">
                Why other couriers aren't listed
              </summary>
              <ul className="mt-2 space-y-1">
                {result.unavailable.map(u => (
                  <li key={u.name}>
                    <span className="text-foreground">{u.name}:</span>{" "}
                    {u.reason}
                  </li>
                ))}
                <li>
                  More couriers will appear here as we connect them. Prices are
                  only ever shown when a courier's own system gives them.
                </li>
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
