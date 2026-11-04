import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Crosshair,
  LogOut,
  Navigation,
  Users,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { LogoMark } from "@/components/compare/Logo";
import { MapCredits } from "@/components/compare/MapCredits";
import { SiteShell } from "@/components/compare/SiteShell";
import { useGps, useOnline, useWakeLock } from "@/hooks/useGps";
import { track } from "@/lib/analytics";
import {
  fetchConvoy,
  fetchRoute,
  joinConvoy,
  leaveConvoy,
  sendConvoyPosition,
  startConvoy,
  type ConvoyView,
} from "@/lib/api";
import { distanceKm } from "@/lib/geo";
import { pinPath } from "@/lib/pins";
import { cn } from "@/lib/utils";
import type { Car } from "@/components/compare/ConvoyMap";

const ConvoyMap = lazy(() => import("@/components/compare/ConvoyMap"));

const COLORS = [
  "#38bdf8",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
  "#34d399",
  "#f97316",
  "#e879f9",
  "#94a3b8",
];
const LEADER = "#c0f11c";
const STALE_MS = 90_000;
const POLL_MS = 5_000;

const fieldLabel =
  "mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const input =
  "h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground focus:outline-2 focus:outline-ring";

interface Me {
  member: string;
  key: string;
}
const meKey = (id: string) => `compare.convoy.${id}`;
const NAME_KEY = "compare.convoy.name";
const readMe = (id: string): Me | null => {
  try {
    return JSON.parse(localStorage.getItem(meKey(id)) ?? "null");
  } catch {
    return null;
  }
};
const saveMe = (id: string, me: Me | null) => {
  try {
    if (me) localStorage.setItem(meKey(id), JSON.stringify(me));
    else localStorage.removeItem(meKey(id));
  } catch {
    // Not remembered: this phone just won't rejoin automatically.
  }
};
const savedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};
const rememberName = (n: string) => {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {
    // Fine: they type it next time.
  }
};

function ago(ms: number) {
  if (ms < 60_000) return "now";
  const m = Math.round(ms / 60_000);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}
const km = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1));

// ---- Start a convoy ----------------------------------------------------------------------

export function StartConvoyPage() {
  const [, navigate] = useLocation();
  const [name, setName] = useState(savedName);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setBusy(true);
    setError(null);
    startConvoy(title, name)
      .then(r => {
        saveMe(r.convoy.id, { member: r.member, key: r.key });
        rememberName(name);
        track("Convoy started");
        navigate(`/convoy/${r.convoy.id}`);
      })
      .catch(e => {
        setError(e.message);
        setBusy(false);
      });
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-xl py-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Lead a convoy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You drive in front and share where you are. Everyone you send the link
          to sees you move on the map, and the road to you, so nobody gets lost.
        </p>
        <form
          onSubmit={e => {
            e.preventDefault();
            start();
          }}
          className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-5"
        >
          <label className="block">
            <span className={fieldLabel}>Your name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. Chidi"
              className={input}
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>Convoy name (optional)</span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
              placeholder="e.g. To Ade's wedding"
              className={input}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40"
          >
            <Users aria-hidden className="size-5" />
            {busy ? "Starting…" : "Start convoy"}
          </button>
          {error && (
            <p role="alert" className="text-sm text-warn">
              Couldn't start the convoy: {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Only each car's latest position is kept, and only while the convoy
            runs. It ends when you end it, after an hour without your position,
            or after 12 hours.
          </p>
        </form>
      </div>
    </SiteShell>
  );
}

// ---- A live convoy ---------------------------------------------------------------------

export function ConvoyPage({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<Me | null>(() => readMe(id));
  const [view, setView] = useState<ConvoyView | null>(null);
  const [ended, setEnded] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [name, setName] = useState(savedName);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [watchOnly, setWatchOnly] = useState(false);
  const [follow, setFollow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [line, setLine] = useState<[number, number][] | null>(null);
  const [roadKm, setRoadKm] = useState<number | null>(null);
  const online = useOnline();
  const sharing = !!me;
  const { fix, state: gps } = useGps(sharing);
  useWakeLock(sharing);
  const lastSent = useRef(0);

  // Poll the convoy.
  useEffect(() => {
    let stop = false;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchConvoy(id)
        .then(v => {
          if (stop) return;
          setView(v);
          setPollError(false);
          // Our membership may have gone (left elsewhere, or server restarted).
          if (me && !v.members.some(m => m.id === me.member)) {
            saveMe(id, null);
            setMe(null);
          }
        })
        .catch(e => {
          if (stop) return;
          if (e.status === 404) {
            setEnded(true);
            saveMe(id, null);
          } else setPollError(true);
        });
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [id, me]);

  // Send our position (every few seconds at most).
  useEffect(() => {
    if (!me || !fix || Date.now() - lastSent.current < 4_000) return;
    lastSent.current = Date.now();
    sendConvoyPosition(id, me, {
      lat: fix.lat,
      lon: fix.lon,
      accuracy: fix.accuracy,
    })
      .then(setView)
      .catch(e => {
        if (e.status === 404) setEnded(true);
        if (e.status === 403) {
          saveMe(id, null);
          setMe(null);
        }
      });
  }, [fix, me, id]);

  const leader = view?.members.find(m => m.role === "leader") ?? null;
  const iLead = !!me && leader?.id === me.member;
  const serverOffset = view ? view.now - Date.now() : 0;
  const age = (at: number) => Date.now() + serverOffset - at;

  // The road from us to the leader, refreshed as people move.
  const routeFrom = useRef<{
    me: { lat: number; lon: number };
    to: { lat: number; lon: number };
    at: number;
  } | null>(null);
  useEffect(() => {
    const lp = leader?.position;
    if (!fix || !lp || iLead) return;
    const prev = routeFrom.current;
    // Again when either car has moved 300 m, at most every 15 s.
    const moved =
      !prev || distanceKm(prev.me, fix) > 0.3 || distanceKm(prev.to, lp) > 0.3;
    if (!moved || (prev && Date.now() - prev.at < 15_000)) return;
    routeFrom.current = {
      me: { lat: fix.lat, lon: fix.lon },
      to: lp,
      at: Date.now(),
    };
    fetchRoute(fix, lp)
      .then(r => {
        setLine(r.line);
        setRoadKm(r.km);
      })
      .catch(() => {});
  }, [fix, leader?.position, iLead]);

  const cars: Car[] = useMemo(() => {
    let n = 0;
    return (view?.members ?? [])
      .filter(m => m.position)
      .map(m => ({
        id: m.id,
        name: m.name,
        leader: m.role === "leader",
        color: m.role === "leader" ? LEADER : COLORS[n++ % COLORS.length],
        lat: m.id === me?.member && fix ? fix.lat : m.position!.lat,
        lon: m.id === me?.member && fix ? fix.lon : m.position!.lon,
        stale: age(m.position!.at) > STALE_MS,
        me: m.id === me?.member,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, fix, me]);

  const link = `${window.location.origin}/convoy/${id}`;
  const shareText = `Join my convoy${view ? ` "${view.title}"` : ""} on Compare and follow me live: ${link}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const join = () => {
    setJoining(true);
    setJoinError(null);
    joinConvoy(id, name)
      .then(r => {
        const m = { member: r.member, key: r.key };
        saveMe(id, m);
        rememberName(name);
        setMe(m);
        track("Convoy joined");
      })
      .catch(e => setJoinError(e.message))
      .finally(() => setJoining(false));
  };
  const quit = () => {
    if (!me) return;
    if (iLead && !window.confirm("End the convoy for everyone?")) return;
    leaveConvoy(id, me).finally(() => {
      saveMe(id, null);
      setMe(null);
      if (iLead) setEnded(true);
      else navigate("/");
    });
  };

  if (ended)
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl py-12 text-center">
          <p className="text-lg font-semibold">This convoy has ended</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The leader ended it, or it stopped after an hour without their
            position.
          </p>
          <Link
            href="/convoy"
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            Start a new convoy
          </Link>
        </div>
      </SiteShell>
    );

  const needsChoice = !me && !watchOnly;
  const leaderPos = leader?.position;
  const myPos = fix;
  const toLeader =
    myPos && leaderPos && !iLead ? distanceKm(myPos, leaderPos) : null;

  return (
    <div className="min-h-dvh bg-background">
      <div className="relative h-[55dvh] min-h-72">
        <Suspense fallback={<div className="size-full bg-surface" />}>
          <ConvoyMap cars={cars} line={iLead ? null : line} follow={follow} />
        </Suspense>
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-4 [&>*]:pointer-events-auto">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-background/75 py-1.5 pl-1.5 pr-3.5 text-sm font-bold backdrop-blur"
          >
            <LogoMark className="size-7" />
            Compare
          </Link>
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold",
              online && !pollError
                ? "bg-primary text-primary-foreground"
                : "bg-amber-400/90 text-black"
            )}
          >
            {online && !pollError ? "● LIVE convoy" : "No network: last known"}
          </span>
        </header>
        <button
          type="button"
          onClick={() => setFollow(f => !f)}
          aria-pressed={follow}
          disabled={!leaderPos}
          className={cn(
            "absolute bottom-4 right-4 flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-lg disabled:opacity-50",
            follow
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground"
          )}
        >
          <Crosshair aria-hidden className="size-4" />
          {follow ? "Following leader" : "Centre on leader"}
        </button>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-10 pt-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Convoy{view ? ` · ${view.title}` : ""} · {view?.members.length ?? "…"}{" "}
          {view?.members.length === 1 ? "car" : "cars"}
        </p>
        <h1 className="mt-1 text-[1.9rem] font-black leading-[1.08] tracking-tight">
          {iLead
            ? "You're leading"
            : leader
              ? `Following ${leader.name}`
              : "Loading convoy…"}
        </h1>
        {!iLead && leader && !leaderPos && (
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for {leader.name}'s position. It appears once their phone
            shares it.
          </p>
        )}
        {toLeader != null && (
          <p className="mt-1 text-[15px] font-semibold text-primary-ink">
            {roadKm != null
              ? `${km(roadKm)} km by road`
              : `About ${km(toLeader)} km`}{" "}
            to {leader!.name}
          </p>
        )}

        {needsChoice && view && (
          <form
            onSubmit={e => {
              e.preventDefault();
              join();
            }}
            className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4"
          >
            <p className="text-sm">
              Join to share your position with the convoy, or just watch.
            </p>
            <label className="block">
              <span className={fieldLabel}>Your name</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={40}
                placeholder="e.g. Tunde"
                className={input}
              />
            </label>
            <button
              type="submit"
              disabled={joining || !name.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-40"
            >
              {joining ? "Joining…" : "Join and share my position"}
            </button>
            <button
              type="button"
              onClick={() => setWatchOnly(true)}
              className="h-11 w-full rounded-xl border border-border text-sm font-semibold"
            >
              Just watch
            </button>
            {joinError && (
              <p role="alert" className="text-sm text-warn">
                {joinError}
              </p>
            )}
          </form>
        )}

        {sharing && gps !== "live" && (
          <p className="mt-3 text-sm text-warn">
            {gps === "blocked"
              ? "Location is blocked for this site, so the convoy can't see you. Allow it in your browser settings."
              : gps === "unavailable"
                ? "This browser can't share your location."
                : "Waiting for GPS…"}
          </p>
        )}

        {view && (
          <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card px-4">
            {view.members.map(m => {
              const car = cars.find(c => c.id === m.id);
              const p = m.id === me?.member && fix ? fix : m.position;
              const fromLeader =
                p && leaderPos && m.role !== "leader"
                  ? distanceKm(p, leaderPos)
                  : null;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: car?.color ?? "#555" }}
                    />
                    <span className="truncate">
                      <b>{m.id === me?.member ? "You" : m.name}</b>
                      {m.role === "leader" && " · leading"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-muted-foreground">
                    {fromLeader != null && (
                      <span className="text-foreground">
                        about {km(fromLeader)} km away ·{" "}
                      </span>
                    )}
                    {m.position ? ago(age(m.position.at)) : "no position yet"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {iLead ? (
            <>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("Convoy shared")}
                className="col-span-2 flex h-12 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground"
              >
                Invite cars on WhatsApp
              </a>
              <button
                type="button"
                onClick={copy}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold"
              >
                {copied ? (
                  <Check aria-hidden className="size-4" />
                ) : (
                  <Copy aria-hidden className="size-4" />
                )}
                {copied ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={quit}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold"
              >
                <LogOut aria-hidden className="size-4" />
                End convoy
              </button>
            </>
          ) : (
            <>
              {leaderPos && (
                <Link
                  href={pinPath({
                    lat: leaderPos.lat,
                    lon: leaderPos.lon,
                    name: `${leader!.name} (convoy leader)`,
                  })}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold"
                >
                  <Navigation aria-hidden className="size-4" />
                  Directions to {leader!.name}
                </Link>
              )}
              {me && (
                <button
                  type="button"
                  onClick={quit}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold"
                >
                  <LogOut aria-hidden className="size-4" />
                  Leave convoy
                </button>
              )}
            </>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {sharing
            ? "Keep this screen on, ideally with the phone charging: phones pause location for websites when the screen locks. In areas with no network, others see your last position until signal returns."
            : "You're watching. Positions update every few seconds while each phone has network."}
        </p>
        <MapCredits className="mt-4 block" />
      </main>
    </div>
  );
}
