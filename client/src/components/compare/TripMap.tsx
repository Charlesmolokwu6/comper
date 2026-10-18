import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Moon, Sun } from "lucide-react";
import { fetchRoute, type RoadRoute } from "@/lib/api";
import type { CabPoint } from "@/lib/cab";
import { compareMapStyle, type MapLook } from "@/lib/mapStyle";
import { cn } from "@/lib/utils";

type Located = CabPoint & { lat: number; lon: number };
const located = (p: CabPoint | null): p is Located =>
  p?.lat != null && p.lon != null;

const LIME = "#c0f11c";
const LAGOS: [number, number] = [3.3792, 6.5244];

type Look = MapLook;

const LOOK_KEY = "compare.mapLook";
function savedLook(): Look {
  try {
    return localStorage.getItem(LOOK_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function dot(fill: string, ring: string) {
  const el = document.createElement("div");
  el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${fill};border:3px solid ${ring};box-shadow:0 1px 4px rgb(0 0 0 / .5)`;
  return el;
}

/**
 * Map of the trip: pickup (lime dot), drop-off (white dot) and the road between them, from
 * /api/places/route. Dark or light map, remembered on this device.
 */
export default function TripMap({
  pickup,
  dropoff,
}: {
  pickup: CabPoint | null;
  dropoff: CabPoint | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [look, setLook] = useState<Look>(savedLook);
  const [ready, setReady] = useState(0);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: compareMapStyle(savedLook()),
      center: LAGOS,
      zoom: 10,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );
    // Our route layers live in the style, so they're re-added after every style load.
    m.on("style.load", () => setReady(n => n + 1));
    // Start the credits folded into the small (i) button; they open on tap.
    m.once("load", () =>
      box.current
        ?.querySelector(".maplibregl-ctrl-attrib")
        ?.classList.remove("maplibregl-compact-show")
    );
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  const switchLook = (next: Look) => {
    setLook(next);
    try {
      localStorage.setItem(LOOK_KEY, next);
    } catch {
      // Storage can be blocked; the choice still applies for this visit.
    }
    map.current?.setStyle(compareMapStyle(next), { diff: false });
  };

  // Fetch the road whenever both ends are known points.
  const a = located(pickup) ? pickup : null;
  const b = located(dropoff) ? dropoff : null;
  const key = a && b ? `${a.lat},${a.lon}|${b.lat},${b.lon}` : "";
  useEffect(() => {
    setRoute(null);
    if (!a || !b) return setState("idle");
    const ctrl = new AbortController();
    setState("loading");
    fetchRoute(a, b, ctrl.signal)
      .then(r => {
        setRoute(r);
        setState("idle");
      })
      .catch(() => !ctrl.signal.aborted && setState("error"));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Draw the road and the two dots, then fit them in view.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    // Right after a style switch the new style can still be loading; draw once it settles.
    if (!m.isStyleLoaded()) {
      m.once("idle", () => setReady(n => n + 1));
      return;
    }
    const line: [number, number][] = route
      ? route.line.map(([lat, lon]) => [lon, lat])
      : a && b
        ? [
            [a.lon, a.lat],
            [b.lon, b.lat],
          ]
        : [];
    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: line },
    };
    const src = m.getSource("trip") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    else m.addSource("trip", { type: "geojson", data });
    // A style switch drops our layers; put them back on top of the new style.
    if (!m.getLayer("trip-line")) {
      m.addLayer({
        id: "trip-casing",
        type: "line",
        source: "trip",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#000", "line-width": 10, "line-opacity": 0.5 },
      });
      m.addLayer({
        id: "trip-line",
        type: "line",
        source: "trip",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": LIME, "line-width": 5 },
      });
    }
    // A darker edge keeps the lime readable on the light map.
    m.setPaintProperty(
      "trip-casing",
      "line-opacity",
      look === "light" ? 0.8 : 0.5
    );
    // Straight dashed line while the road loads or if it can't be found.
    m.setPaintProperty("trip-line", "line-dasharray", route ? [1, 0] : [2, 2]);

    markers.current.forEach(mk => mk.remove());
    markers.current = [];
    const pts: [number, number][] = [];
    if (a) {
      markers.current.push(
        new maplibregl.Marker({ element: dot(LIME, "#000") })
          .setLngLat([a.lon, a.lat])
          .addTo(m)
      );
      pts.push([a.lon, a.lat]);
    }
    if (b) {
      markers.current.push(
        new maplibregl.Marker({ element: dot("#fff", LIME) })
          .setLngLat([b.lon, b.lat])
          .addTo(m)
      );
      pts.push([b.lon, b.lat]);
    }
    const all = [...line, ...pts];
    if (all.length > 1) {
      const bounds = all.reduce(
        (bb, c) => bb.extend(c),
        new maplibregl.LngLatBounds(all[0], all[0])
      );
      // Extra room at the top for the Dark/Light switch, at the right for the zoom buttons.
      m.fitBounds(bounds, {
        padding: { top: 64, bottom: 28, left: 28, right: 56 },
        maxZoom: 16,
        duration: 600,
      });
    } else if (all.length === 1) m.easeTo({ center: all[0], zoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, route, a?.lat, a?.lon, b?.lat, b?.lon]);

  const typedOnly =
    (pickup && !located(pickup)) || (dropoff && !located(dropoff));

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative">
        <div
          ref={box}
          role="img"
          aria-label={
            route
              ? `Map of the road route, ${route.km} km`
              : "Map of your pickup and drop-off"
          }
          className="h-64 w-full bg-surface sm:h-80"
        />
        <div
          role="group"
          aria-label="Map style"
          className="absolute left-3 top-3 flex rounded-full border border-border bg-black/70 p-0.5 backdrop-blur"
        >
          {(
            [
              ["dark", "Dark", Moon],
              ["light", "Light", Sun],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={look === id}
              onClick={() => switchLook(id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                look === id
                  ? "bg-primary text-primary-foreground"
                  : "text-neutral-200 hover:text-white"
              )}
            >
              <Icon aria-hidden className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ background: LIME }}
          />
          Pickup
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden
            className="size-2.5 rounded-full border-2 bg-white"
            style={{ borderColor: LIME }}
          />
          Drop-off
        </span>
        <span className="ml-auto text-foreground">
          {route
            ? `${route.km} km by road`
            : state === "loading"
              ? "Finding the road…"
              : state === "error"
                ? "Couldn't load the road route"
                : typedOnly
                  ? "Pick a suggestion to see that point on the map"
                  : ""}
        </span>
      </figcaption>
    </figure>
  );
}
