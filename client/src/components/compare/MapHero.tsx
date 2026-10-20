import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { RoadRoute } from "@/lib/api";
import type { CabPoint } from "@/lib/cab";
import type { MapExtra } from "./TripMap";
import { cn } from "@/lib/utils";
import { MapCredits } from "./MapCredits";
import { LogoMark } from "./Logo";

// The map library only loads once a results screen shows.
const TripMap = lazy(() => import("./TripMap"));

type RouteState = "idle" | "loading" | "error";

/**
 * Results screen with the trip map behind it, like a workout summary: the map fills the top
 * edge to edge, fades into the page, and the trip's headline and prices sit over the fade.
 */
export function MapHero({
  pickup,
  dropoff,
  pointZoom,
  onBack,
  backLabel = "Change search",
  eyebrow,
  title,
  routeNote,
  meta,
  credits = true,
  extras,
  children,
}: {
  pickup: CabPoint | null;
  dropoff: CabPoint | null;
  pointZoom?: number;
  onBack: () => void;
  backLabel?: string;
  eyebrow: ReactNode;
  title: ReactNode;
  /** Said after the distance, e.g. "between city centres". */
  routeNote?: string;
  meta?: ReactNode;
  /** False when the page shows MapCredits itself, further down. */
  credits?: boolean;
  /** Other terminals, in orange (TripMap). */
  extras?: MapExtra[];
  children: (route: RoadRoute | null) => ReactNode;
}) {
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeState, setRouteState] = useState<RouteState>("idle");
  const hasMap = !!(pickup?.lat ?? dropoff?.lat);

  return (
    <div className="relative isolate">
      {hasMap && (
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden sm:h-[38rem]">
          <Suspense fallback={<div className="size-full bg-surface" />}>
            <TripMap
              hero
              pickup={pickup}
              dropoff={dropoff}
              pointZoom={pointZoom}
              extras={extras}
              onRoute={(r, s) => {
                setRoute(r);
                setRouteState(s);
              }}
            />
          </Suspense>
          {/* Dim the top for the header, then melt the map into the page. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, color-mix(in srgb, var(--background) 65%, transparent) 0, transparent 6rem, transparent 50%, var(--background) 86%)",
            }}
          />
        </div>
      )}

      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <LogoMark />
          <span className="text-lg font-extrabold tracking-tight">Compare</span>
        </Link>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background/70 px-3.5 text-sm font-semibold backdrop-blur hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {backLabel}
        </button>
      </header>

      <div
        className={cn(
          "mx-auto max-w-3xl px-4 pb-10 sm:px-6",
          hasMap ? "pt-[15.5rem] sm:pt-[19rem]" : "pt-8"
        )}
      >
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground [&_svg]:size-4">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-[1.9rem] font-black leading-[1.08] tracking-tight sm:text-4xl">
          {title}
        </h1>
        {route ? (
          <p className="mt-1.5 text-[2.1rem] font-black leading-none tracking-tight text-primary-ink tabular-nums">
            {route.km.toLocaleString("en-NG")}
            <span className="ml-1.5 text-lg font-extrabold uppercase">
              km by road
            </span>
            {routeNote && (
              <span className="ml-1.5 text-sm font-semibold normal-case tracking-normal text-muted-foreground">
                {routeNote}
              </span>
            )}
          </p>
        ) : routeState === "loading" ? (
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            Finding the road…
          </p>
        ) : null}
        {meta && (
          <p className="mt-1.5 text-[15px] font-medium text-muted-foreground">
            {meta}
          </p>
        )}

        <div className="mt-6">{children(route)}</div>

        {hasMap && credits && <MapCredits className="mt-8 block" />}
      </div>
    </div>
  );
}

/**
 * A results screen laid over the compare page. The phone's back button closes it, like a page.
 */
export function HeroScreen({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const body = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.history.pushState({ heroScreen: true }, "");
    const pop = () => onClose();
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      document.body.style.overflow = body;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background"
    >
      {children}
    </div>,
    document.body
  );
}

/** Closes a HeroScreen through history, so the back button and ours agree. */
export const closeHero = () => window.history.back();

type Tone = "lime" | "sky" | "amber" | "rose";
const TONE: Record<Tone, string> = {
  lime: "text-primary-ink",
  sky: "text-sky-ink",
  amber: "text-amber-ink",
  rose: "text-rose-ink",
};

/** Big coloured numbers in a two-column grid, like a workout summary. */
export function StatGrid({
  stats,
}: {
  stats: { label: string; value: ReactNode; unit?: string; tone: Tone }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-3.5">
      {stats.map(s => (
        <div key={s.label} className="min-w-0">
          <dt className="text-sm font-semibold text-foreground">{s.label}</dt>
          <dd
            className={cn(
              "mt-0.5 truncate text-[1.65rem] font-black leading-tight tracking-tight tabular-nums",
              TONE[s.tone]
            )}
          >
            {s.value}
            {s.unit && (
              <span className="ml-0.5 text-[0.95rem] font-extrabold uppercase">
                {s.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
