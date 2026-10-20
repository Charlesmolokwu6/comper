import { useState } from "react";
import {
  ArrowUpRight,
  CarTaxiFront,
  Check,
  Copy,
  Info,
  Search,
} from "lucide-react";
import { CAB_PROVIDERS, type CabPoint } from "@/lib/cab";
import { cn } from "@/lib/utils";
import { closeHero, HeroScreen, MapHero, StatGrid } from "./MapHero";
import { LocateButton, useCurrentLocation } from "./CurrentLocation";
import { PlaceInput } from "./PlaceInput";

/**
 * Cab tab. Bolt, LagRide and inDrive only show live prices inside their apps, after login, and they
 * change with demand, so this tab never shows a price. Neither publishes a trip link, so it
 * opens each app and makes the drop-off one paste away.
 */
export function CabPanel() {
  const [pickup, setPickup] = useState<CabPoint | null>(null);
  const [dropoff, setDropoff] = useState<CabPoint | null>(null);
  const gps = useCurrentLocation(setPickup);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const ready = !!dropoff;
  const [open, setOpen] = useState(false);
  const dropText = dropoff
    ? [dropoff.name, dropoff.address].filter(Boolean).join(", ")
    : "";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-5">
        <div className="grid gap-2.5 md:grid-cols-2">
          <PlaceInput
            compact
            label="Pickup"
            value={pickup}
            onChange={setPickup}
            placeholder="Where are you?"
            extra={
              <LocateButton onClick={gps.locate} locating={gps.locating} />
            }
          />
          <PlaceInput
            compact
            label="Drop-off"
            value={dropoff}
            onChange={setDropoff}
            placeholder="Where to?"
          />
        </div>
        <button
          type="button"
          disabled={!ready}
          onClick={() => setOpen(true)}
          data-umami-event="Cab options"
          className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search aria-hidden className="size-5" />
          See ride options
        </button>
        {gps.error && !pickup && (
          <p role="alert" className="mt-3 text-sm text-warn">
            {gps.error}
          </p>
        )}
      </div>

      {open && dropoff && (
        <HeroScreen onClose={() => setOpen(false)}>
          <MapHero
            pickup={pickup}
            dropoff={dropoff}
            onBack={closeHero}
            backLabel="Change trip"
            eyebrow={
              <>
                <CarTaxiFront aria-hidden />
                Cab
              </>
            }
            title={`${pickup?.name ?? "Your pickup"} → ${dropoff.name}`}
          >
            {route => (
              <section aria-label="Ride apps" className="space-y-3">
                {route && (
                  <div className="rounded-[1.4rem] border border-border bg-card p-4 sm:p-5">
                    <StatGrid
                      stats={[
                        {
                          label: "Distance",
                          value: route.km.toLocaleString("en-NG"),
                          unit: "km",
                          tone: "lime",
                        },
                        {
                          label: "Drive, clear roads",
                          value: route.minutes,
                          unit: "min",
                          tone: "sky",
                        },
                      ]}
                    />
                    <p className="mt-2.5 text-xs text-muted-foreground">
                      Road distance from OpenStreetMap. Traffic makes most trips
                      take longer.
                    </p>
                  </div>
                )}

                <h2 className="pt-2 text-xl font-extrabold tracking-tight">
                  Ride apps
                </h2>
                <div className="flex gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Info
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-primary-ink"
                  />
                  <p>
                    Ride apps only show live prices inside their apps, and they
                    change minute to minute, so we don't show a price here. Open
                    each app to compare.
                  </p>
                </div>

                {CAB_PROVIDERS.map(p => (
                  <article
                    key={p.id}
                    className="rounded-2xl border border-border bg-card p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-foreground">
                          {p.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {p.note}
                        </p>
                      </div>
                      <a
                        href={p.link(pickup, dropoff)}
                        data-umami-event="Open ride app"
                        data-umami-event-company={p.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        Open {p.name}
                        <ArrowUpRight aria-hidden className="size-4" />
                      </a>
                    </div>
                    {!p.prefills && (
                      <button
                        type="button"
                        onClick={() => copy(p.id, dropText)}
                        className={cn(
                          "mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
                          copied === p.id
                            ? "border-primary/50 text-primary-ink"
                            : "border-border text-foreground hover:bg-accent"
                        )}
                      >
                        {copied === p.id ? (
                          <Check aria-hidden className="size-4" />
                        ) : (
                          <Copy aria-hidden className="size-4" />
                        )}
                        {copied === p.id ? "Copied" : "Copy drop-off address"}
                      </button>
                    )}
                  </article>
                ))}
              </section>
            )}
          </MapHero>
        </HeroScreen>
      )}
    </div>
  );
}
