import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Moon, Sun } from "lucide-react";
import { fetchRoute, type RoadRoute } from "@/lib/api";
import type { CabPoint } from "@/lib/cab";
import {
  compareMapStyle,
  FIRST_LABEL_LAYER,
  type MapLook,
} from "@/lib/mapStyle";
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

/** Pickup: lime dot with a radar-style pulse. Drop-off: a square pin, as ride apps do. */
function pin(kind: "pickup" | "dropoff") {
  const el = document.createElement("div");
  el.className = kind === "pickup" ? "pin-pickup" : "pin-dropoff";
  return el;
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Distance-based positions along a line, for moving the light at an even speed. */
function measure(line: [number, number][]) {
  const cum = [0];
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    cum.push(cum[i - 1] + Math.hypot(x2 - x1, (y2 - y1) * 1.0));
  }
  const total = cum[cum.length - 1] || 1;
  return (t: number): [number, number] => {
    const d = t * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const f = Math.min(1, Math.max(0, (d - cum[i - 1]) / seg));
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    return [x1 + (x2 - x1) * f, y1 + (y2 - y1) * f];
  };
}

/** Reveals the route up to `p` (0–1) through each route layer's line-gradient. */
function reveal(m: maplibregl.Map, p: number, look: Look) {
  const cut = (colour: string) =>
    p >= 1
      ? colour
      : ([
          "step",
          ["line-progress"],
          colour,
          Math.max(p, 0.0001),
          "rgba(0,0,0,0)",
        ] as any);
  const ink = look === "light" ? "#14170c" : "rgba(0,0,0,0.5)";
  if (m.getLayer("trip-glow"))
    m.setPaintProperty(
      "trip-glow",
      "line-gradient",
      cut("rgba(192,241,28,0.45)")
    );
  if (m.getLayer("trip-casing"))
    m.setPaintProperty("trip-casing", "line-gradient", cut(ink));
  if (m.getLayer("trip-line"))
    m.setPaintProperty("trip-line", "line-gradient", cut(LIME));
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
  const frame = useRef<number | null>(null);
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
      maxPitch: 60,
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
      if (frame.current) cancelAnimationFrame(frame.current);
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
    // lineMetrics lets the line-gradient reveal the route from start to end.
    else m.addSource("trip", { type: "geojson", data, lineMetrics: true });
    const point = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Point" as const, coordinates: line[0] ?? LAGOS },
    };
    const comet = m.getSource("trip-comet") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (comet) comet.setData(point);
    else m.addSource("trip-comet", { type: "geojson", data: point });

    // A style switch drops our layers; put them back, under the place names.
    if (!m.getLayer("trip-line")) {
      const before = m.getLayer(FIRST_LABEL_LAYER)
        ? FIRST_LABEL_LAYER
        : undefined;
      const round = { "line-cap": "round", "line-join": "round" } as const;
      if (look === "dark")
        m.addLayer(
          {
            id: "trip-glow",
            type: "line",
            source: "trip",
            layout: round,
            paint: { "line-width": 18, "line-blur": 12 },
          },
          before
        );
      // Light map: a dark "ink" route with a lime core, like Bolt's bold route line.
      m.addLayer(
        {
          id: "trip-casing",
          type: "line",
          source: "trip",
          layout: round,
          paint: { "line-width": look === "light" ? 9 : 10 },
        },
        before
      );
      m.addLayer(
        {
          id: "trip-line",
          type: "line",
          source: "trip",
          layout: round,
          paint: { "line-width": look === "light" ? 3.5 : 5 },
        },
        before
      );
      // The light that travels along the route.
      m.addLayer({
        id: "trip-comet-glow",
        type: "circle",
        source: "trip-comet",
        paint: {
          "circle-radius": 13,
          "circle-color": LIME,
          "circle-opacity": 0,
          "circle-blur": 1,
        },
      });
      m.addLayer({
        id: "trip-comet",
        type: "circle",
        source: "trip-comet",
        paint: {
          "circle-radius": 4.5,
          "circle-color": "#ffffff",
          "circle-stroke-color": LIME,
          "circle-stroke-width": 2,
          "circle-opacity": 0,
          "circle-stroke-opacity": 0,
        },
      });
    }
    m.setPaintProperty("trip-line", "line-opacity", route ? 1 : 0.5);

    markers.current.forEach(mk => mk.remove());
    markers.current = [];
    const pts: [number, number][] = [];
    if (a) {
      markers.current.push(
        new maplibregl.Marker({ element: pin("pickup") })
          .setLngLat([a.lon, a.lat])
          .addTo(m)
      );
      pts.push([a.lon, a.lat]);
    }
    if (b) {
      markers.current.push(
        new maplibregl.Marker({ element: pin("dropoff") })
          .setLngLat([b.lon, b.lat])
          .addTo(m)
      );
      pts.push([b.lon, b.lat]);
    }

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    const still = reducedMotion();
    const all = [...line, ...pts];
    if (all.length > 1) {
      const bounds = all.reduce(
        (bb, c) => bb.extend(c),
        new maplibregl.LngLatBounds(all[0], all[0])
      );
      // Room at the top for the Dark/Light switch, at the right for the zoom buttons.
      const cam = m.cameraForBounds(bounds, {
        padding: { top: 70, bottom: 36, left: 36, right: 60 },
        maxZoom: 16,
      });
      if (cam?.center != null && cam.zoom != null) {
        // Tilted, the far end recedes; zoom out a touch so the whole trip still fits.
        const target = {
          center: cam.center,
          zoom: route ? cam.zoom - 0.45 : cam.zoom,
          pitch: route ? 48 : 0,
          bearing: route ? -14 : 0,
        };
        if (still) m.jumpTo(target);
        else
          m.flyTo({ ...target, duration: route ? 2200 : 700, essential: true });
      }
    } else if (all.length === 1)
      m.easeTo({ center: all[0], zoom: 14, pitch: 0 });

    // The route draws itself, then a light travels along it on a loop.
    if (!route || still || line.length < 2) {
      reveal(m, 1, look);
      return;
    }
    const at = measure(line);
    const DRAW = 1600;
    const TRAVEL = 3600;
    const PAUSE = 900;
    const start = performance.now() + (m.isMoving() ? 900 : 0);
    const tick = (now: number) => {
      const mm = map.current;
      if (!mm || !mm.getLayer("trip-line")) return;
      const t = now - start;
      if (t < DRAW) {
        const e = Math.max(0, t) / DRAW;
        reveal(mm, 1 - Math.pow(1 - e, 3), look);
      } else {
        reveal(mm, 1, look);
        const loop = (t - DRAW) % (TRAVEL + PAUSE);
        const on = loop < TRAVEL;
        const f = on ? loop / TRAVEL : 1;
        const pos = at(f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);
        (mm.getSource("trip-comet") as maplibregl.GeoJSONSource).setData({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: pos },
        });
        const o = on ? Math.min(1, Math.min(loop, TRAVEL - loop) / 300) : 0;
        mm.setPaintProperty("trip-comet", "circle-opacity", o);
        mm.setPaintProperty("trip-comet", "circle-stroke-opacity", o);
        mm.setPaintProperty("trip-comet-glow", "circle-opacity", o * 0.6);
      }
      frame.current = requestAnimationFrame(tick);
    };
    reveal(m, 0, look);
    frame.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, route, a?.lat, a?.lon, b?.lat, b?.lon]);

  // Stop the animation when the map goes away.
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    []
  );

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
            className="size-2.5 rounded-[3px] border-2 border-black bg-white"
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
