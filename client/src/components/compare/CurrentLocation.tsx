import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { fetchReverse } from "@/lib/api";
import type { CabPoint } from "@/lib/cab";

/**
 * The phone's position, named by the street it's on so people can check it's right.
 * A precise GPS fix often times out indoors, so it falls back to the network-based position.
 */
export function useCurrentLocation(onFound: (p: CabPoint) => void) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const found = (pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    // One retry: a busy address service usually answers the second time.
    fetchReverse(lat, lon)
      .catch(() =>
        new Promise(r => setTimeout(r, 1500)).then(() => fetchReverse(lat, lon))
      )
      .then(p =>
        onFound({ name: p.name, address: p.address, lat, lon, gps: true })
      )
      .catch(() =>
        onFound({ name: "My current location", lat, lon, gps: true })
      )
      .finally(() => setLocating(false));
  };
  const failed = (err: GeolocationPositionError) => {
    setLocating(false);
    setError(
      err.code === err.PERMISSION_DENIED
        ? "Location is blocked for this site. Allow it in your browser settings, or type the address."
        : "Couldn't find your location right now. Try again outside or near a window, or type the address."
    );
  };
  const locate = () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("This browser can't share your location. Type the address.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      found,
      err => {
        if (err.code === err.PERMISSION_DENIED) return failed(err);
        navigator.geolocation.getCurrentPosition(found, failed, {
          enableHighAccuracy: false,
          timeout: 15_000,
          maximumAge: 5 * 60_000,
        });
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 }
    );
  };

  return { locate, locating, error };
}

/** "Use my current location" chip under an address box. */
export function LocateButton({
  onClick,
  locating,
}: {
  onClick: () => void;
  locating: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locating}
      className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
    >
      <LocateFixed aria-hidden className="size-4 text-primary-ink" />
      {locating ? "Finding you…" : "Use my current location"}
    </button>
  );
}
