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
import type { CabPoint } from "@/lib/cab";
import { formatAge, formatNaira } from "@/lib/format";
import { STATE_CAPITALS } from "@/lib/stateCapitals";
import { cn } from "@/lib/utils";
import { LoadingResults } from "./Loader";
import { PlaceInput } from "./PlaceInput";

// The map library only loads once the delivery tab shows a map.
const TripMap = lazy(() => import("./TripMap"));

const LAGOS = 4;

const fieldLabel =
  "mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const field =
  "flex h-12 w-full items-center rounded-xl border border-border bg-surface px-3.5 text-[15px] font-semibold text-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring";

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

type Mode = "within" | "between";

/** The state an address search result sits in, from the state names in its address. */
export function stateOf(
  p: CabPoint,
  stations: DeliveryStation[]
): number | undefined {
  const text = `${p.name}, ${p.address ?? ""}`
    .toLowerCase()
    .replace("federal capital territory", "abuja");
  let best: { id: number; at: number } | undefined;
  for (const s of stations) {
    const at = text.lastIndexOf(s.name.replace(/\s*\(.*\)/, "").toLowerCase());
    if (at >= 0 && (!best || at > best.at)) best = { id: s.id, at };
  }
  return best?.id;
}

/**
 * Delivery tab: live parcel prices by state, weight and declared value. GIG Logistics is the
 * only courier whose public calculator we can use today; the rest are listed with why not.
 */
export function DeliveryPanel() {
  const [stations, setStations] = useState<DeliveryStation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [from, setFrom] = useState<number | null>(LAGOS);
  const [toState, setTo] = useState<number | null>(LAGOS);
  const [mode, setMode] = useState<Mode>("within");
  const [pickup, setPickup] = useState<CabPoint | null>(null);
  const [dropoff, setDropoff] = useState<CabPoint | null>(null);
  const to = mode === "within" ? from : toState;
  // A price shown is always for the states on screen.
  useEffect(() => setResult(null), [from, to]);
  const [weight, setWeight] = useState("");
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
        className="rounded-2xl border border-border bg-card p-3.5 sm:p-5"
      >
        <div
          role="group"
          aria-label="Delivery type"
          className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1"
        >
          {(
            [
              ["within", "Within a state"],
              ["between", "State to state"],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                setResult(null);
              }}
              className={cn(
                "h-9 rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring",
                mode === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {text}
            </button>
          ))}
        </div>

        {mode === "within" ? (
          <div className="space-y-2.5">
            <StateSelect
              id="delivery-from"
              label="State"
              value={from}
              stations={stations}
              onChange={id => {
                setFrom(id);
                setResult(null);
              }}
            />
            <div className="grid gap-2.5 md:grid-cols-2">
              <PlaceInput
                compact
                label="Pickup address"
                value={pickup}
                onChange={p => {
                  setPickup(p);
                  const s = p && stateOf(p, stations);
                  if (s) setFrom(s);
                }}
                placeholder="e.g. Ajah, Lekki"
              />
              <PlaceInput
                compact
                label="Drop-off address"
                value={dropoff}
                onChange={setDropoff}
                placeholder="e.g. Ikeja GRA"
              />
            </div>
            {(() => {
              const s = dropoff && stateOf(dropoff, stations);
              return s && s !== from ? (
                <p className="rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-warn">
                  This drop-off looks like it's in {name(s)}.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("between");
                      setTo(s);
                      setResult(null);
                    }}
                    className="font-semibold underline underline-offset-2"
                  >
                    Switch to state to state
                  </button>
                </p>
              ) : null;
            })()}
          </div>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-2.5">
              <StateSelect
                id="delivery-from"
                label="Send from"
                value={from}
                stations={stations}
                onChange={id => {
                  setFrom(id);
                  setResult(null);
                }}
              />
              <PlaceInput
                compact
                label="Pickup address"
                value={pickup}
                onChange={p => {
                  setPickup(p);
                  const s = p && stateOf(p, stations);
                  if (s) setFrom(s);
                }}
                placeholder="Optional, e.g. Ajah"
              />
            </div>
            <div className="flex justify-end md:mt-7 md:items-start md:justify-center">
              <button
                type="button"
                onClick={() => {
                  setFrom(toState);
                  setTo(from);
                  setPickup(dropoff);
                  setDropoff(pickup);
                  setResult(null);
                }}
                aria-label="Swap pickup and drop-off"
                className="-my-2 flex size-11 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:my-0"
              >
                <ArrowDownUp aria-hidden className="size-4 md:rotate-90" />
              </button>
            </div>
            <div className="space-y-2.5">
              <StateSelect
                id="delivery-to"
                label="Deliver to"
                value={toState}
                stations={stations}
                onChange={id => {
                  setTo(id);
                  setResult(null);
                }}
              />
              <PlaceInput
                compact
                label="Drop-off address"
                value={dropoff}
                onChange={p => {
                  setDropoff(p);
                  const s = p && stateOf(p, stations);
                  if (s) setTo(s);
                }}
                placeholder="Optional, e.g. Wuse 2"
              />
            </div>
          </div>
        )}

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
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
                placeholder="e.g. 2"
                className="w-full min-w-0 bg-transparent outline-none placeholder:font-normal placeholder:text-muted-foreground"
              />
              <span className="font-normal text-muted-foreground">kg</span>
            </span>
          </div>
          <div>
            <label htmlFor="delivery-value" className={fieldLabel}>
              Item value{" "}
              <span className="normal-case tracking-normal">
                (for insurance)
              </span>
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
          </div>
        </div>

        <button
          type="submit"
          disabled={!valid || state === "loading"}
          className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search aria-hidden className="size-5" />
          {state === "loading" ? "Getting prices…" : "Get delivery prices"}
        </button>
        {loadError && (
          <p role="alert" className="mt-3 text-sm text-warn">
            Couldn't load the list of states: {loadError}
          </p>
        )}
      </form>

      {(result || state === "loading") &&
        from != null &&
        to != null &&
        (() => {
          const capA = STATE_CAPITALS[name(from)];
          const capB = STATE_CAPITALS[name(to)];
          const exact = (p: CabPoint | null) =>
            p?.lat != null && p.lon != null
              ? { name: p.name, lat: p.lat, lon: p.lon }
              : null;
          const pin = (c: typeof capA) =>
            c && { name: c.city, lat: c.lat, lon: c.lon, capital: true };
          const a = exact(pickup) ?? pin(capA);
          const b = exact(dropoff) ?? (mode === "within" ? null : pin(capB));
          if (!a) return null;
          const capitals = [a, b].some(p => p && "capital" in p);
          return (
            <Suspense
              fallback={
                <div className="h-64 rounded-2xl border border-border bg-card sm:h-80" />
              }
            >
              <TripMap
                pickup={a}
                dropoff={b}
                labels={{ from: `From ${a.name}`, to: b ? `To ${b.name}` : "" }}
                describe={km =>
                  `${km} km by road, ${a.name} to ${b?.name}` +
                  (capitals ? " (state capital where no address is given)" : "")
                }
                note={
                  b
                    ? undefined
                    : `Delivery within ${name(from)}. Add a drop-off address to see the route.`
                }
                pointZoom={exact(pickup) ? 13 : 9}
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
          className="rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-warn"
        >
          Couldn't get prices: {error}
        </p>
      )}

      {result && (
        <section aria-label="Delivery prices" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {mode === "within"
              ? `Within ${name(from)}`
              : `${name(from)} → ${name(to)}`}{" "}
            · {kg} kg · item worth {formatNaira(naira)}
          </p>
          {(pickup || dropoff) && (
            <p className="text-sm text-muted-foreground">
              GIG Logistics prices by state, weight and value, so the street
              address doesn't change this price. Give your addresses to the
              courier when you book.
            </p>
          )}
          {result.couriers.map(c => (
            <article
              key={c.id}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                    <Package aria-hidden className="size-5 text-primary-ink" />
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
                className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
