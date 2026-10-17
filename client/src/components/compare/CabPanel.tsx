import { useState } from "react";
import { ArrowUpRight, Check, Copy, Info, LocateFixed } from "lucide-react";
import { CAB_PROVIDERS, type CabPoint } from "@/lib/cab";
import { distanceKm, formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { PlaceInput } from "./PlaceInput";

/**
 * Cab tab. Bolt, LagRide and inDrive only show live prices inside their apps, after login, and they
 * change with demand, so this tab never shows a price. Neither publishes a trip link, so it
 * opens each app and makes the drop-off one paste away.
 */
export function CabPanel() {
  const [pickup, setPickup] = useState<CabPoint | null>(null);
  const [dropoff, setDropoff] = useState<CabPoint | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "locating" | "denied">(
    "idle"
  );
  const [copied, setCopied] = useState<string | null>(null);

  const locate = () => {
    if (!("geolocation" in navigator)) return setGpsState("denied");
    setGpsState("locating");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsState("idle");
        setPickup({
          name: "My current location",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          gps: true,
        });
      },
      () => setGpsState("denied"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const ready = !!dropoff && (!!pickup || gpsState !== "denied");
  const km = pickup && dropoff ? distanceKm(pickup, dropoff) : null;
  const dropText = dropoff
    ? [dropoff.name, dropoff.address].filter(Boolean).join(", ")
    : "";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <PlaceInput
            label="Pickup"
            value={pickup}
            onChange={setPickup}
            placeholder="Where are you?"
            extra={
              <button
                type="button"
                onClick={locate}
                className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
              >
                <LocateFixed aria-hidden className="size-4 text-primary" />
                {gpsState === "locating"
                  ? "Finding you…"
                  : "Use my current location"}
              </button>
            }
          />
          <PlaceInput
            label="Drop-off"
            value={dropoff}
            onChange={setDropoff}
            placeholder="Where to?"
          />
        </div>
        {gpsState === "denied" && (
          <p role="alert" className="mt-3 text-sm text-amber-200">
            Couldn't get your location. Type your pickup address instead.
          </p>
        )}
      </div>

      {ready && dropoff && (
        <section aria-label="Ride apps" className="space-y-3">
          <div className="flex gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Ride apps only show live prices inside their apps, and they change
              minute to minute, so we don't show a price here. Open each app to
              compare.
              {km != null &&
                ` These points are ${formatDistance(km)} apart in a straight line.`}
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
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                    "mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary",
                    copied === p.id
                      ? "border-primary/50 text-primary"
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
    </div>
  );
}
