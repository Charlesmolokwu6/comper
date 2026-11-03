import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  LocateFixed,
  MapPin,
  Navigation,
  Share2,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Link } from "wouter";
import { LogoMark } from "@/components/compare/Logo";
import { MapCredits } from "@/components/compare/MapCredits";
import { StatGrid } from "@/components/compare/MapHero";
import { PlaceInput } from "@/components/compare/PlaceInput";
import {
  LocateButton,
  useCurrentLocation,
} from "@/components/compare/CurrentLocation";
import { SiteShell } from "@/components/compare/SiteShell";
import { useGps, useWakeLock } from "@/hooks/useGps";
import { track } from "@/lib/analytics";
import { fetchRoute, type RoadRoute } from "@/lib/api";
import type { CabPoint } from "@/lib/cab";
import { pinPath, readPin, type Pin } from "@/lib/pins";
import { alongRoute } from "@/lib/trips";
import { distanceKm } from "@/lib/geo";
import { sayDistance, speak, stopSpeaking, voiceAvailable } from "@/lib/voice";
import { cn } from "@/lib/utils";

const PinMap = lazy(() => import("@/components/compare/PinMap"));

const VOICE_KEY = "compare.voice";
const fieldLabel =
  "mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

const km = (n: number) =>
  n >= 10 ? Math.round(n).toLocaleString("en-NG") : n.toFixed(1);
const metres = (m: number) =>
  m >= 1000
    ? `${km(m / 1000)} km`
    : `${Math.max(10, Math.round(m / 10) * 10)} m`;

/** Arrow for a manoeuvre. */
function arrow(type: string, modifier: string | null) {
  if (type === "arrive") return "◎";
  if (type.includes("roundabout") || type === "rotary") return "↻";
  const m = modifier ?? "";
  if (m === "uturn") return "↶";
  if (m.includes("sharp left")) return "↰";
  if (m.includes("left")) return "↖";
  if (m.includes("sharp right")) return "↱";
  if (m.includes("right")) return "↗";
  return "↑";
}

// ---- Share a location -------------------------------------------------------------------

const EXPIRY = [
  { label: "24 hours", ms: 24 * 3600_000 },
  { label: "7 days", ms: 7 * 86400_000 },
  { label: "No end date", ms: 0 },
];

export function SharePinPage() {
  const [place, setPlace] = useState<CabPoint | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState(EXPIRY[0].ms);
  const [copied, setCopied] = useState(false);
  const gps = useCurrentLocation(p => {
    setPlace(p);
  });

  const at =
    place?.lat != null && place.lon != null
      ? { lat: place.lat, lon: place.lon }
      : null;
  const pin: Pin | null = at
    ? {
        ...at,
        name: name.trim() || place!.name,
        address:
          [place!.gps ? null : place!.name, place!.address]
            .filter(Boolean)
            .join(", ") || undefined,
        note: note.trim() || undefined,
        expires: expiry ? Date.now() + expiry : undefined,
      }
    : null;
  const link = pin ? `${window.location.origin}${pinPath(pin)}` : "";
  const message = pin
    ? `${pin.name}${pin.note ? ` (${pin.note})` : ""}. Tap for directions: ${link}`
    : "";

  const shared = (how: string) => track("Pin shared", { how });
  const share = async () => {
    if (!pin) return;
    shared("Share sheet");
    try {
      await navigator.share({ title: pin.name, text: message });
    } catch {
      // Cancelled, or no share sheet: the other buttons still work.
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      shared("Copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-xl py-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Share a location
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Send someone a link. When they open it, Compare shows them the way
          there from wherever they are, with spoken directions. No app needed.
        </p>

        <div className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-5">
          <PlaceInput
            compact
            label="Where"
            value={place}
            onChange={setPlace}
            placeholder="Search an address or place"
            extra={
              <LocateButton onClick={gps.locate} locating={gps.locating} />
            }
          />
          {gps.error && !place && (
            <p role="alert" className="text-sm text-warn">
              {gps.error}
            </p>
          )}
          {place && !at && (
            <p className="text-sm text-warn">
              Pick a suggestion from the list, or use your current location, so
              the link has an exact spot.
            </p>
          )}

          {at && (
            <div className="h-48 overflow-hidden rounded-xl border border-border">
              <Suspense fallback={<div className="size-full bg-surface" />}>
                <PinMap pin={at} me={null} line={null} />
              </Suspense>
            </div>
          )}

          <label className="block">
            <span className={fieldLabel}>Name it</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              placeholder={place?.name ?? "e.g. Ade's house"}
              className="h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground focus:outline-2 focus:outline-ring"
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>
              Note for whoever opens it (optional)
            </span>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="e.g. Blue gate, opposite the church. Call when you're outside."
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground focus:outline-2 focus:outline-ring"
            />
          </label>
          <div>
            <span className={fieldLabel}>Link works for</span>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1">
              {EXPIRY.map(x => (
                <button
                  key={x.label}
                  type="button"
                  aria-pressed={expiry === x.ms}
                  onClick={() => setExpiry(x.ms)}
                  className={cn(
                    "h-9 rounded-lg text-sm font-semibold",
                    expiry === x.ms
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <a
            href={
              pin
                ? `https://wa.me/?text=${encodeURIComponent(message)}`
                : undefined
            }
            aria-disabled={!pin}
            onClick={() => pin && shared("WhatsApp")}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:brightness-110",
              !pin && "pointer-events-none opacity-40"
            )}
          >
            Share on WhatsApp
          </a>
          <div className="grid grid-cols-2 gap-2">
            {"share" in navigator && (
              <button
                type="button"
                disabled={!pin}
                onClick={share}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold disabled:opacity-40"
              >
                <Share2 aria-hidden className="size-4" />
                More ways to share
              </button>
            )}
            <button
              type="button"
              disabled={!pin}
              onClick={copy}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold disabled:opacity-40"
            >
              {copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            The spot is written into the link itself, so anyone the link is
            forwarded to can see it. Compare doesn't keep a copy.
          </p>
        </div>
      </div>
    </SiteShell>
  );
}

// ---- Open a shared location: the way there ---------------------------------------------

export function PinPage() {
  const pin = useMemo(() => readPin(window.location.search), []);
  const [wantGps, setWantGps] = useState(false);
  const { fix, state: gpsState } = useGps(wantGps);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeState, setRouteState] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [guiding, setGuiding] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => {
    try {
      return localStorage.getItem(VOICE_KEY) !== "off";
    } catch {
      return true;
    }
  });
  useWakeLock(guiding);
  const lastRoute = useRef(0);
  const offCount = useRef(0);
  const said = useRef(new Set<string>());
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    if (pin) track("Pin opened");
  }, [pin]);

  const getRoute = (from: { lat: number; lon: number }) => {
    if (!pin) return;
    lastRoute.current = Date.now();
    setRouteState("loading");
    fetchRoute(from, pin, undefined, true)
      .then(r => {
        setRoute(r);
        setRouteState("idle");
        said.current.clear();
      })
      .catch(() => setRouteState("error"));
  };

  // First fix → the way there.
  useEffect(() => {
    if (fix && !route && routeState === "idle") getRoute(fix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix]);

  const say = (key: string, text: string) => {
    if (said.current.has(key)) return;
    said.current.add(key);
    if (voiceOn) speak(text);
  };

  // Where we are on the way, and what's next.
  const nav = useMemo(() => {
    if (!route?.steps || !fix) return null;
    const pos = alongRoute(route.line, fix);
    const stepAt = route.steps.map(
      s => alongRoute(route.line, { lat: s.at[0], lon: s.at[1] }).at
    );
    const total = stepAt[stepAt.length - 1] || pos.at;
    let i = stepAt.findIndex(a => a > pos.at + 0.015);
    if (i < 0) i = route.steps.length - 1;
    const next = route.steps[i];
    return {
      pos,
      index: i,
      next,
      toNext: Math.max(0, (stepAt[i] - pos.at) * 1000),
      left: Math.max(0, total - pos.at),
      total,
    };
  }, [route, fix]);

  const toPin = fix && pin ? distanceKm(fix, pin) * 1000 : null;

  useEffect(() => {
    if (!guiding || !nav || !fix || !pin) return;
    // Arrived.
    if (toPin != null && toPin < 35) {
      setArrived(true);
      setGuiding(false);
      say("arrived", `You've arrived at ${pin.name}`);
      track("Pin arrived");
      return;
    }
    // Off the road we planned: plan again from here.
    if (nav.pos.off > 0.06) offCount.current++;
    else offCount.current = 0;
    if (offCount.current >= 2 && Date.now() - lastRoute.current > 20_000) {
      offCount.current = 0;
      if (voiceOn) speak("Finding a new route");
      getRoute(fix);
      return;
    }
    const { next, toNext, index } = nav;
    if (next.type === "arrive") {
      if (toNext < 300)
        say(`${index}-arrive`, `${pin.name} is ${sayDistance(toNext)} ahead`);
      return;
    }
    // A road changing its name isn't a turn: show it, don't say it.
    const quiet =
      (next.type === "new name" || next.type === "continue") &&
      (!next.modifier || next.modifier === "straight");
    if (quiet) return;
    if (toNext <= 60) say(`${index}-now`, next.text);
    else if (toNext <= 400)
      say(
        `${index}-soon`,
        `In ${sayDistance(toNext)}, ${next.text.charAt(0).toLowerCase()}${next.text.slice(1)}`
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, guiding]);

  useEffect(() => () => stopSpeaking(), []);

  if (!pin)
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl py-12 text-center">
          <p className="text-lg font-semibold">
            This location link is incomplete
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask the person who sent it to share it again.
          </p>
        </div>
      </SiteShell>
    );

  const expired = pin.expires != null && Date.now() > pin.expires;
  if (expired)
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl py-12 text-center">
          <p className="text-lg font-semibold">
            This location link has expired
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The person who shared “{pin.name}” set it to stop working. Ask them
            for a new link.
          </p>
        </div>
      </SiteShell>
    );

  const start = () => {
    setGuiding(true);
    setArrived(false);
    track("Directions started");
    said.current.clear();
    if (voiceOn && route?.steps?.[0]) speak(route.steps[0].text);
  };
  const toggleVoice = () => {
    const v = !voiceOn;
    setVoiceOn(v);
    if (!v) stopSpeaking();
    try {
      localStorage.setItem(VOICE_KEY, v ? "on" : "off");
    } catch {
      // Not remembered; the choice still applies now.
    }
  };
  const minutesLeft =
    route && nav
      ? Math.max(1, Math.round((route.minutes * nav.left) / (nav.total || 1)))
      : null;
  const arriveAt = minutesLeft
    ? new Date(Date.now() + minutesLeft * 60_000)
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "Africa/Lagos",
        })
        .replace(" ", "")
        .toLowerCase()
    : null;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lon}`;

  return (
    <div className="min-h-dvh bg-background">
      <div
        className={cn(
          "relative",
          guiding ? "h-[62dvh]" : "h-[50dvh]",
          "min-h-72"
        )}
      >
        <Suspense fallback={<div className="size-full bg-surface" />}>
          <PinMap
            pin={pin}
            me={fix}
            line={route?.line ?? null}
            guiding={guiding}
          />
        </Suspense>
        {!guiding && (
          <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-4 [&>*]:pointer-events-auto">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full bg-background/75 py-1.5 pl-1.5 pr-3.5 text-sm font-bold backdrop-blur"
            >
              <LogoMark className="size-7" />
              Compare
            </Link>
            <a
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1 rounded-full bg-background/75 px-3 text-xs font-semibold backdrop-blur"
            >
              Open in Google Maps
              <ArrowUpRight aria-hidden className="size-3.5" />
            </a>
          </header>
        )}
        {guiding && nav && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-x-3 top-3 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-xl"
          >
            <span aria-hidden className="text-4xl font-black leading-none">
              {arrow(nav.next.type, nav.next.modifier)}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight">
                {nav.next.type === "arrive"
                  ? `Arrive at ${pin.name}`
                  : nav.next.text}
              </p>
              <p className="text-sm font-semibold opacity-75">
                in {metres(nav.toNext)}
              </p>
            </div>
          </div>
        )}
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-10 pt-5 sm:px-6">
        {!guiding && (
          <>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <MapPin aria-hidden className="size-4" />
              Shared location
            </p>
            <h1 className="mt-1 text-[1.9rem] font-black leading-[1.08] tracking-tight">
              {pin.name}
            </h1>
            {pin.address && (
              <p className="mt-1 text-sm text-muted-foreground">
                {pin.address}
              </p>
            )}
            {pin.note && <p className="mt-2 text-[15px]">“{pin.note}”</p>}
          </>
        )}

        {arrived && (
          <p className="mt-4 rounded-xl bg-primary/15 px-4 py-3 font-semibold text-primary-ink">
            You've arrived at {pin.name}.
          </p>
        )}

        {!wantGps && !arrived && (
          <button
            type="button"
            onClick={() => setWantGps(true)}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:brightness-110"
          >
            <LocateFixed aria-hidden className="size-5" />
            Show me the way there
          </button>
        )}
        {wantGps && !fix && (
          <p className="mt-5 text-sm text-muted-foreground">
            {gpsState === "blocked"
              ? "Location is blocked for this site. Allow it in your browser settings, or open the pin in Google Maps."
              : gpsState === "unavailable"
                ? "This browser can't share your location. Open the pin in Google Maps instead."
                : "Finding where you are…"}
          </p>
        )}
        {fix && routeState === "loading" && !route && (
          <p className="mt-5 text-sm text-muted-foreground">
            Finding the road…
          </p>
        )}
        {routeState === "error" && (
          <div className="mt-5 text-sm text-muted-foreground">
            Couldn't find a road route just now.{" "}
            <button
              type="button"
              onClick={() => fix && getRoute(fix)}
              className="font-semibold text-primary-ink underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        {route && (
          <div className="mt-5 rounded-[1.4rem] border border-border bg-card p-4 sm:p-5">
            <StatGrid
              stats={[
                {
                  label: guiding ? "To go" : "Distance",
                  value: km(guiding && nav ? nav.left : route.km),
                  unit: "km",
                  tone: "lime",
                },
                guiding && arriveAt
                  ? { label: "Arrive about", value: arriveAt, tone: "sky" }
                  : {
                      label: "Drive, clear roads",
                      value: route.minutes,
                      unit: "min",
                      tone: "sky",
                    },
              ]}
            />
            {!guiding ? (
              <button
                type="button"
                onClick={start}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:brightness-110"
              >
                <Navigation aria-hidden className="size-5" />
                Start directions
              </button>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={!voiceAvailable()}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold disabled:opacity-40"
                >
                  {voiceOn ? (
                    <Volume2 aria-hidden className="size-4" />
                  ) : (
                    <VolumeX aria-hidden className="size-4" />
                  )}
                  {voiceOn ? "Voice on" : "Voice off"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuiding(false);
                    stopSpeaking();
                  }}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold"
                >
                  <Square aria-hidden className="size-4" />
                  End
                </button>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {guiding
                ? "Keep this screen on: phones pause location for websites when it locks. Times are for clear roads."
                : "Road and times from OpenStreetMap, for clear roads; traffic will add more. Your location stays on your phone."}
            </p>
          </div>
        )}

        {!guiding && route?.steps && route.steps.length > 1 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              All {route.steps.length} steps
            </summary>
            <ol className="mt-2 space-y-1.5">
              {route.steps.map((s, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {s.type === "arrive" ? `Arrive at ${pin.name}` : s.text}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {s.metres ? metres(s.metres) : ""}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}

        {!guiding && (
          <p className="mt-6 text-xs text-muted-foreground">
            <Link
              href="/share"
              className="font-semibold text-primary-ink underline underline-offset-4"
            >
              Share your own location
            </Link>
            {" · "}
            <a
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Open in Google Maps
            </a>
          </p>
        )}
        <MapCredits className="mt-4 block" />
      </main>
      {!guiding && (
        <Link href="/" className="sr-only">
          <ArrowLeft aria-hidden /> Back to Compare
        </Link>
      )}
    </div>
  );
}
