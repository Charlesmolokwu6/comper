import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchRoute, type RoadRoute } from "@/lib/api";
import type { CabPoint } from "@/lib/cab";
import { MapCredits } from "./MapCredits";
import {
  compareMapStyle,
  FIRST_LABEL_LAYER,
  type MapLook,
} from "@/lib/mapStyle";

type Located = CabPoint & { lat: number; lon: number };
const located = (p: CabPoint | null): p is Located =>
  p?.lat != null && p.lon != null;

const LIME = "#c0f11c";
/** Other terminals: where a company stops instead of the one picked. */
const PUMPKIN = "#ff7518";

export interface MapExtra {
  name: string;
  lat: number;
  lon: number;
  /** The picked terminal it stands in for; a dashed line joins them. */
  from: { lat: number; lon: number };
}

function altPin(name: string) {
  const el = document.createElement("div");
  el.className = "pin-alt";
  const label = document.createElement("span");
  label.textContent = name;
  el.appendChild(label);
  return el;
}
const LAGOS: [number, number] = [3.3792, 6.5244];

type Look = MapLook;

/** The map follows the phone's own light or dark setting. */
const LIGHT_QUERY = "(prefers-color-scheme: light)";
const systemLook = (): Look =>
  typeof window !== "undefined" && window.matchMedia?.(LIGHT_QUERY).matches
    ? "light"
    : "dark";

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

/**
 * A glowing streak that ends at `f` (0–1 along the route) and fades out behind it, painted
 * through line-gradient. `alpha` fades the whole trail in and out.
 */
function trail(f: number, alpha: number, length = 0.22) {
  const clear = "rgba(192,241,28,0)";
  if (alpha <= 0 || f <= 0.002) return clear as any;
  const head = Math.min(f, 0.999);
  const tail = Math.max(0, head - length);
  const stops: (number | string)[] = [];
  const push = (at: number, colour: string) => {
    if (stops.length && (stops[stops.length - 2] as number) >= at) return;
    stops.push(at, colour);
  };
  push(0, clear);
  push(tail, clear);
  push(head - (head - tail) * 0.35, `rgba(192,241,28,${0.55 * alpha})`);
  push(head, `rgba(240,255,190,${alpha})`);
  push(Math.min(1, head + 0.001), clear);
  push(1, clear);
  return ["interpolate", ["linear"], ["line-progress"], ...stops] as any;
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
 * /api/places/route. Dark or light map to match the phone setting.
 */
export default function TripMap({
  pickup,
  dropoff,
  labels = { from: "Pickup", to: "Drop-off" },
  describe = km => `${km} km by road`,
  note,
  pointZoom = 14,
  hero = false,
  onRoute,
  extras = [],
  roadExtras = false,
}: {
  pickup: CabPoint | null;
  dropoff: CabPoint | null;
  /** Legend names for the two ends. */
  labels?: { from: string; to: string };
  /** Caption once the road is known. */
  describe?: (km: number) => string;
  /** Caption when there's no route to draw (e.g. one point only). */
  note?: string;
  /** Zoom for a single point: close for a street, wider for a whole state. */
  pointZoom?: number;
  /** Full-bleed, still backdrop behind a results screen (MapHero): no caption, no gestures. */
  hero?: boolean;
  /** Other terminals to mark in orange, each joined to the picked one by a dashed line. */
  extras?: MapExtra[];
  /** Draw the real road to each extra (orange, with its road km) instead of a straight line. */
  roadExtras?: boolean;
  /** Told when the road route arrives (or fails), for text shown outside the map. */
  onRoute?: (
    route: RoadRoute | null,
    state: "idle" | "loading" | "error"
  ) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const frame = useRef<number | null>(null);
  const [look, setLook] = useState<Look>(systemLook);
  const [ready, setReady] = useState(0);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: compareMapStyle(systemLook()),
      center: LAGOS,
      zoom: 10,
      // Credits sit in the caption under the map instead of a button on it.
      attributionControl: false,
      // Behind a results screen the map is scenery: swiping should scroll the page.
      interactive: !hero,
      dragRotate: false,
      pitchWithRotate: false,
      maxPitch: 60,
    });
    m.touchZoomRotate.disableRotation();
    // Our route layers live in the style, so they're re-added after every style load.
    m.on("style.load", () => setReady(n => n + 1));
    map.current = m;
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.(LIGHT_QUERY);
    if (!mq) return;
    const follow = () => {
      const next = systemLook();
      setLook(next);
      map.current?.setStyle(compareMapStyle(next), { diff: false });
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

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

  const extrasKey = extras.map(x => `${x.name}@${x.lat},${x.lon}`).join("|");

  // Road routes to the extras, one at a time (the route proxy is rate-limited anyway).
  const [roads, setRoads] = useState<Record<string, RoadRoute>>({});
  useEffect(() => {
    setRoads({});
    if (!roadExtras || !extras.length) return;
    const ctrl = new AbortController();
    (async () => {
      for (const x of extras) {
        const r = await fetchRoute(x.from, x, ctrl.signal).catch(() => null);
        if (ctrl.signal.aborted) return;
        if (r) setRoads(prev => ({ ...prev, [x.name]: r }));
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadExtras, extrasKey]);
  const roadsKey = Object.keys(roads).join("|");

  // Draw the road and the two dots, then fit them in view.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    // The running animation keeps the map from ever going idle, so stop it first.
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    // Right after a style switch the new style can still be loading; "style.load" bumps
    // `ready` and brings us back. Don't wait for tiles: on slow mobile data that left
    // the pins with no route until every tile had arrived.
    if (!(m as unknown as { style?: { _loaded?: boolean } }).style?._loaded)
      return;
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
      // The glowing streak the travelling light leaves behind it.
      m.addLayer(
        {
          id: "trip-trail-glow",
          type: "line",
          source: "trip",
          layout: round,
          paint: { "line-width": 16, "line-blur": 9 },
        },
        before
      );
      m.addLayer(
        {
          id: "trip-trail",
          type: "line",
          source: "trip",
          layout: round,
          paint: { "line-width": look === "light" ? 4 : 5 },
        },
        before
      );
      m.setPaintProperty("trip-trail-glow", "line-gradient", trail(0, 0));
      m.setPaintProperty("trip-trail", "line-gradient", trail(0, 0));
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

    // Other terminals: by road when we have it, else a straight dashed line (the km on
    // the cards are straight-line).
    const legs = {
      type: "FeatureCollection" as const,
      features: extras.map(x => ({
        type: "Feature" as const,
        properties: { road: !!roads[x.name] },
        geometry: {
          type: "LineString" as const,
          coordinates: roads[x.name]
            ? roads[x.name].line.map(([lat, lon]) => [lon, lat])
            : [
                [x.from.lon, x.from.lat],
                [x.lon, x.lat],
              ],
        },
      })),
    };
    const legSrc = m.getSource("trip-extras") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (legSrc) legSrc.setData(legs);
    else m.addSource("trip-extras", { type: "geojson", data: legs });
    if (!m.getLayer("trip-extras"))
      m.addLayer(
        {
          id: "trip-extras",
          type: "line",
          source: "trip-extras",
          layout: { "line-cap": "round" },
          filter: ["!", ["get", "road"]],
          paint: {
            "line-color": PUMPKIN,
            "line-width": 3,
            "line-dasharray": [1.5, 1.5],
          },
        },
        m.getLayer(FIRST_LABEL_LAYER) ? FIRST_LABEL_LAYER : undefined
      );
    if (!m.getLayer("trip-extras-road"))
      m.addLayer(
        {
          id: "trip-extras-road",
          type: "line",
          source: "trip-extras",
          layout: { "line-cap": "round", "line-join": "round" },
          filter: ["get", "road"],
          paint: { "line-color": PUMPKIN, "line-width": 4 },
        },
        m.getLayer(FIRST_LABEL_LAYER) ? FIRST_LABEL_LAYER : undefined
      );
    for (const x of extras) {
      markers.current.push(
        new maplibregl.Marker({
          element: altPin(
            roads[x.name]
              ? `${x.name} · ${roads[x.name].km} km by road`
              : x.name
          ),
          anchor: "left",
          offset: [-7, 0],
        })
          .setLngLat([x.lon, x.lat])
          .addTo(m)
      );
      pts.push([x.lon, x.lat]);
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
      // As a backdrop, keep the trip in the top part: the text covers the bottom.
      const h = m.getContainer().clientHeight;
      const cam = m.cameraForBounds(bounds, {
        padding: hero
          ? { top: 76, bottom: Math.round(h * 0.42), left: 44, right: 44 }
          : { top: 48, bottom: 36, left: 40, right: 40 },
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
      m.easeTo({ center: all[0], zoom: pointZoom, pitch: 0 });

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
        const along = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        mm.setPaintProperty("trip-trail", "line-gradient", trail(along, o));
        mm.setPaintProperty(
          "trip-trail-glow",
          "line-gradient",
          trail(along, o * 0.8, 0.28)
        );
        mm.setPaintProperty("trip-comet", "circle-opacity", o);
        mm.setPaintProperty("trip-comet", "circle-stroke-opacity", o);
        mm.setPaintProperty("trip-comet-glow", "circle-opacity", o * 0.6);
      }
      frame.current = requestAnimationFrame(tick);
    };
    reveal(m, 0, look);
    frame.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, route, a?.lat, a?.lon, b?.lat, b?.lon, extrasKey, roadsKey]);

  // Stop the animation when the map goes away.
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    []
  );

  useEffect(() => {
    onRoute?.(route, state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, state]);

  const typedOnly =
    (pickup && !located(pickup)) || (dropoff && !located(dropoff));

  if (hero)
    return (
      <div
        ref={box}
        role="img"
        aria-label={
          route ? `Map of the road route, ${route.km} km` : "Map of the trip"
        }
        className="size-full bg-surface"
      />
    );

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
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
        {pickup && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: LIME }}
            />
            {labels.from}
          </span>
        )}
        {extras.length > 0 && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: PUMPKIN }}
            />
            Where other companies stop
          </span>
        )}
        {dropoff && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden
              className="size-2.5 rounded-[3px] border-2 border-black bg-white"
            />
            {labels.to}
          </span>
        )}
        <span className="ml-auto text-foreground">
          {route
            ? describe(route.km)
            : note
              ? note
              : state === "loading"
                ? "Finding the road…"
                : state === "error"
                  ? "Couldn't load the road route"
                  : typedOnly
                    ? "Pick a suggestion to see that point on the map"
                    : ""}
        </span>
        <MapCredits className="w-full" />
      </figcaption>
    </figure>
  );
}
