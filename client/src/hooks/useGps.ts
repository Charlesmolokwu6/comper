import { useEffect, useState } from "react";

export type GpsState = "waiting" | "live" | "blocked" | "unavailable";

export interface GpsFix {
  lat: number;
  lon: number;
  accuracy: number;
  time: number;
}

/**
 * The phone's position while the page is open. GPS works without a network; the phone stops
 * sending positions to web pages when the screen is off or the app is in the background.
 */
export function useGps(on = true) {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [state, setState] = useState<GpsState>("waiting");

  useEffect(() => {
    if (!on) return;
    if (!("geolocation" in navigator)) {
      setState("unavailable");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      p => {
        setState("live");
        setFix({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracy: p.coords.accuracy,
          time: p.timestamp,
        });
      },
      err =>
        setState(err.code === err.PERMISSION_DENIED ? "blocked" : "waiting"),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [on]);

  return { fix, state };
}

/** Keep the screen on while tracking (Screen Wake Lock), where the browser allows it. */
export function useWakeLock(on: boolean) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (
          t: "screen"
        ) => Promise<{
          release: () => Promise<void>;
          addEventListener: (e: string, f: () => void) => void;
        }>;
      };
    };
    if (!on || !nav.wakeLock) return setHeld(false);
    let lock: Awaited<
      ReturnType<NonNullable<typeof nav.wakeLock>["request"]>
    > | null = null;
    let stopped = false;
    const take = () =>
      nav
        .wakeLock!.request("screen")
        .then(l => {
          if (stopped) return l.release();
          lock = l;
          setHeld(true);
          l.addEventListener("release", () => setHeld(false));
        })
        .catch(() => setHeld(false));
    // The lock drops when the page is hidden; take it again on return.
    const again = () => document.visibilityState === "visible" && take();
    take();
    document.addEventListener("visibilitychange", again);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", again);
      lock?.release().catch(() => {});
    };
  }, [on]);
  return held;
}

/** navigator.onLine, kept up to date. */
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}
