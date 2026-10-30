import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bus, LocateFixed, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { LogoMark } from "@/components/compare/Logo";
import { MapCredits } from "@/components/compare/MapCredits";
import { StatGrid } from "@/components/compare/MapHero";
import { SiteShell } from "@/components/compare/SiteShell";
import { useGps, useOnline, useWakeLock } from "@/hooks/useGps";
import { track } from "@/lib/analytics";
import { formatDay, formatNaira, formatTime } from "@/lib/format";
import {
  alongRoute,
  deleteTrip,
  savedTrip,
  savedTrips,
  type SavedTrip,
} from "@/lib/trips";
import { cn } from "@/lib/utils";

// The map library loads with the trip; it's cached after the first visit, so it opens offline.
const TripTracker = lazy(() => import("@/components/compare/TripTracker"));

const LAST_KEY = (id: string) => `compare.trip.${id}.last`;

const km = (n: number) =>
  n >= 10 ? Math.round(n).toLocaleString("en-NG") : n.toFixed(1);

function duration(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

/** My trip: where you are on a saved route, offline. Positions stay on this phone. */
export function TripPage({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const trip = useMemo(() => savedTrip(id), [id]);
  const [follow, setFollow] = useState(false);
  const [awake, setAwake] = useState(true);
  const { fix: live, state } = useGps(!!trip);
  const online = useOnline();
  const screenOn = useWakeLock(!!trip && awake);

  // Last known position, so reopening the trip shows where you were.
  const [last] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LAST_KEY(id)) ?? "null");
    } catch {
      return null;
    }
  });
  const fix = live ?? last;
  useEffect(() => {
    if (live)
      try {
        localStorage.setItem(LAST_KEY(id), JSON.stringify(live));
      } catch {
        // Storage full: only the "last seen" memory is lost.
      }
  }, [id, live]);

  useEffect(() => {
    if (trip) track("Trip opened", { company: trip.operatorName });
  }, [trip]);

  // Pace from the last ~20 minutes of progress along the route.
  const samples = useRef<{ t: number; at: number }[]>([]);
  const total = useMemo(
    () =>
      trip
        ? alongRoute(trip.line, {
            lat: trip.line[trip.line.length - 1][0],
            lon: trip.line[trip.line.length - 1][1],
          }).at
        : 0,
    [trip]
  );
  const pos = trip && fix ? alongRoute(trip.line, fix) : null;
  useEffect(() => {
    if (!live || !pos) return;
    const s = samples.current;
    s.push({ t: live.time, at: pos.at });
    while (s.length && live.time - s[0].t > 20 * 60_000) s.shift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  if (!trip)
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl py-12 text-center">
          <p className="text-lg font-semibold">
            This trip isn't saved on this phone
          </p>
          <Link
            href="/trips"
            className="mt-3 inline-block font-medium text-primary-ink underline underline-offset-4"
          >
            See my trips
          </Link>
        </div>
      </SiteShell>
    );

  const done = pos ? Math.min(total, pos.at) : 0;
  const left = Math.max(0, total - done);
  const offRoute = pos && pos.off > 5 ? pos.off : null;
  const next = trip.towns.find(t => t.at > done + 0.5);
  const s = samples.current;
  const first = s[0];
  const lastS = s[s.length - 1];
  const hours = first && lastS ? (lastS.t - first.t) / 3_600_000 : 0;
  const speed = hours > 5 / 60 ? (lastS.at - first.at) / hours : null;
  const arrive = speed && speed > 10 && left > 1 ? left / speed : null;
  const notYet =
    Date.now() <
    new Date(`${trip.departure.replace(" ", "T")}:00+01:00`).getTime();

  const status =
    state === "blocked"
      ? "Location is blocked for this site. Allow it in your browser settings to see where you are."
      : state === "unavailable"
        ? "This browser can't share your location."
        : state === "waiting"
          ? last
            ? "Waiting for GPS… showing where you were last."
            : "Waiting for GPS… go near a window if it takes long."
          : `Live from your phone's GPS (±${Math.round(live!.accuracy)} m).`;

  return (
    <div className="min-h-dvh bg-background">
      <div className="relative h-[52dvh] min-h-72">
        <Suspense fallback={<div className="size-full bg-surface" />}>
          <TripTracker trip={trip} fix={fix} follow={follow} />
        </Suspense>
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-4 [&>*]:pointer-events-auto">
          <Link
            href="/trips"
            className="flex items-center gap-2 rounded-full bg-background/75 py-1.5 pl-1.5 pr-3.5 text-sm font-semibold backdrop-blur"
          >
            <LogoMark className="size-7" />
            <ArrowLeft aria-hidden className="size-4" />
            My trips
          </Link>
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur",
              online
                ? "bg-background/75 text-muted-foreground"
                : "bg-amber-400/90 text-black"
            )}
          >
            {online ? "Online" : "Offline · saved map"}
          </span>
        </header>
        <button
          type="button"
          onClick={() => setFollow(f => !f)}
          aria-pressed={follow}
          disabled={!fix}
          className={cn(
            "absolute bottom-4 right-4 flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-lg disabled:opacity-50",
            follow
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground"
          )}
        >
          <LocateFixed aria-hidden className="size-4" />
          {follow ? "Following you" : "Centre on me"}
        </button>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-5 sm:px-6">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Bus aria-hidden className="size-4" />
          {trip.operatorName} · {formatDay(trip.departure.slice(0, 10))},{" "}
          {formatTime(trip.departure)}
        </p>
        <h1 className="mt-1 text-[1.9rem] font-black leading-[1.08] tracking-tight">
          {trip.from.name} → {trip.to.name}
        </h1>
        {notYet && (
          <p className="mt-1 text-sm text-muted-foreground">
            Not departed yet. The map and your dot work now, so you can check it
            at the park.
          </p>
        )}

        <div className="mt-5 rounded-[1.4rem] border border-border bg-card p-4 sm:p-5">
          <StatGrid
            stats={[
              {
                label: "To go",
                value: pos ? km(left) : "—",
                unit: pos ? "km" : undefined,
                tone: "lime",
              },
              {
                label: next ? `Next: ${next.name}` : "Next stop",
                value:
                  next && pos ? km(next.at - done) : pos ? trip.to.name : "—",
                unit: next && pos ? "km" : undefined,
                tone: "sky",
              },
              {
                label: `Done of ${km(total)} km`,
                value: pos ? km(done) : "—",
                unit: pos ? "km" : undefined,
                tone: "amber",
              },
              {
                label: "At this pace",
                value: arrive ? duration(arrive) : "—",
                tone: "rose",
              },
            ]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {status}
            {offRoute != null &&
              ` You're about ${km(offRoute)} km from the road we saved, so distances are approximate.`}
            {!arrive &&
              pos &&
              " Time left appears once you've been moving for a few minutes."}
          </p>
        </div>

        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span>
            <span className="font-semibold">Keep screen on</span>
            <span className="block text-xs text-muted-foreground">
              Phones pause location for websites when the screen locks.
              {awake &&
                !screenOn &&
                " This browser can't keep it on; leave the screen awake yourself."}
            </span>
          </span>
          <input
            type="checkbox"
            checked={awake}
            onChange={e => setAwake(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
        </label>

        {trip.towns.length > 0 && (
          <section className="mt-5">
            <h2 className="text-sm font-bold">Towns on the way</h2>
            <ol className="mt-2 space-y-1.5 text-sm">
              {trip.towns.map(t => (
                <li
                  key={t.name}
                  className={cn(
                    "flex justify-between",
                    pos && t.at < done
                      ? "text-muted-foreground line-through"
                      : ""
                  )}
                >
                  <span>{t.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {km(t.at)} km
                  </span>
                </li>
              ))}
              <li className="flex justify-between font-semibold">
                <span>{trip.to.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {km(total)} km
                </span>
              </li>
            </ol>
          </section>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Booked with {trip.operatorName}, {formatNaira(trip.fare)} at the time
          of booking. Your location stays on this phone; Compare doesn't receive
          it. Distances follow the road we saved and may differ a little from
          the bus's route.
        </p>
        <button
          type="button"
          onClick={async () => {
            await deleteTrip(trip.id);
            navigate("/trips");
          }}
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Trash2 aria-hidden className="size-4" />
          Delete this trip
        </button>
        <MapCredits className="mt-6 block" />
      </main>
    </div>
  );
}

export function TripsPage() {
  const trips: SavedTrip[] = savedTrips();
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl py-8">
        <h1 className="text-3xl font-extrabold tracking-tight">My trips</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved on this phone, with the map, so you can follow your journey
          without network.
        </p>
        {trips.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No saved trips yet. After you book a bus from Compare, choose "Save
            trip for offline" and it appears here.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {trips.map(t => (
              <li key={t.id}>
                <Link
                  href={`/trip/${t.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 hover:bg-accent"
                >
                  <p className="text-sm text-muted-foreground">
                    {t.operatorName} · {formatDay(t.departure.slice(0, 10))},{" "}
                    {formatTime(t.departure)}
                  </p>
                  <p className="mt-0.5 text-lg font-bold">
                    {t.from.name} → {t.to.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {km(t.km)} km by road
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
