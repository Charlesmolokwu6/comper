import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  compareMapStyle,
  FIRST_LABEL_LAYER,
  type MapLook,
} from "@/lib/mapStyle";
import { fastMapOptions, keepMapAlive } from "@/lib/mapRuntime";

const LIME = "#c0f11c";
const look = (): MapLook =>
  window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";

/** How close the map comes when following starts: street level, but not so close it can't keep up. */
const FOLLOW_ZOOM = 15;
const MAX_ZOOM_FOLLOW = 16;
/** Cars glide to their new place over this long instead of jumping. */
const GLIDE_MS = 1_000;

export interface Car {
  id: string;
  name: string;
  leader: boolean;
  color: string;
  lat: number;
  lon: number;
  /** Seen long ago: drawn faded. */
  stale: boolean;
  me: boolean;
}

interface Drawn {
  marker: maplibregl.Marker;
  /** What the marker shows; it's only rebuilt when this changes, so its pulse keeps going. */
  look: string;
  from: [number, number];
  to: [number, number];
  start: number;
}

/** Names are set as plain text, never as HTML, whatever people type. */
function paint(el: HTMLElement, c: Car, index: number) {
  el.dataset.leader = String(c.leader);
  el.dataset.stale = String(c.stale);
  el.style.setProperty("--car", c.color);
  const dot = document.createElement("span");
  dot.className = "convoy-dot";
  dot.textContent = c.leader ? "★" : String(index);
  const name = document.createElement("span");
  name.className = "convoy-name";
  name.textContent = c.me ? "You" : c.name;
  el.replaceChildren(dot, name);
}

const lookOf = (c: Car, index: number) =>
  `${c.leader}|${c.stale}|${c.color}|${index}|${c.me ? "You" : c.name}`;

/** Rough metres between two [lon, lat] points; enough to tell a glide from a jump. */
const metres = (a: [number, number], b: [number, number]) =>
  Math.hypot(
    (a[0] - b[0]) * 111_320 * Math.cos((a[1] * Math.PI) / 180),
    (a[1] - b[1]) * 110_540
  );

/** The convoy: every car, the leader with a star, and the road from you to the leader. */
export default function ConvoyMap({
  cars,
  line,
  follow,
}: {
  cars: Car[];
  /** [lat, lon] from you to the leader, when known. */
  line: [number, number][] | null;
  /** Keep the leader in the middle. */
  follow: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawn = useRef(new Map<string, Drawn>());
  const frame = useRef<number | null>(null);
  const ready = useRef(false);
  // Keep every car in view until the person moves the map themselves.
  const touched = useRef(false);
  // The person's finger is on the map: the camera leaves it alone.
  const handling = useRef(false);
  const wasFollowing = useRef(false);
  // Read by the glide loop: whether to carry the camera along with the leader, and which car leads.
  const following = useRef(follow);
  following.current = follow;
  const leaderId = useRef<string | null>(null);
  leaderId.current = cars.find(c => c.leader)?.id ?? null;
  const fittedIds = useRef("");
  // Bumped to make the map again if the phone dropped its graphics.
  const [gen, setGen] = useState(0);

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: compareMapStyle(look()),
      center: [3.38, 6.52],
      zoom: 10,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      ...fastMapOptions(),
    });
    m.touchZoomRotate.disableRotation();
    const byHand = (e: { originalEvent?: unknown }) => {
      if (!e.originalEvent) return;
      touched.current = true;
      handling.current = true;
    };
    m.on("dragstart", byHand);
    m.on("zoomstart", byHand);
    m.on("moveend", () => {
      handling.current = false;
    });
    m.on("style.load", () => {
      m.addSource("to-leader", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer(
        {
          id: "to-leader",
          type: "line",
          source: "to-leader",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": LIME, "line-width": 5, "line-opacity": 0.85 },
        },
        m.getLayer(FIRST_LABEL_LAYER) ? FIRST_LABEL_LAYER : undefined
      );
      ready.current = true;
      m.fire("compare:redraw");
    });
    map.current = m;
    const stopAlive = keepMapAlive(m, box.current, () => setGen(g => g + 1));
    const all = drawn.current;
    return () => {
      stopAlive();
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = null;
      all.clear();
      m.remove();
      map.current = null;
      ready.current = false;
      wasFollowing.current = false;
      fittedIds.current = "";
    };
  }, [gen]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const draw = () =>
      (
        m.getSource("to-leader") as maplibregl.GeoJSONSource | undefined
      )?.setData(
        line && line.length > 1
          ? {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: line.map(([la, lo]) => [lo, la]),
              },
            }
          : { type: "FeatureCollection", features: [] }
      );
    if (ready.current) draw();
    m.on("compare:redraw", draw);
    return () => {
      m.off("compare:redraw", draw);
    };
  }, [line, gen]);

  // Cars: placed once, then only moved (gliding) and repainted when what they show changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const now = performance.now();
    const seen = new Set<string>();
    let n = 1;
    for (const c of cars) {
      seen.add(c.id);
      const index = c.leader ? 0 : ++n;
      const to: [number, number] = [c.lon, c.lat];
      const d = drawn.current.get(c.id);
      if (!d) {
        const el = document.createElement("div");
        el.className = "convoy-car";
        paint(el, c, index);
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(to)
          .addTo(m);
        drawn.current.set(c.id, {
          marker,
          look: lookOf(c, index),
          from: to,
          to,
          start: now,
        });
        continue;
      }
      const l = lookOf(c, index);
      if (l !== d.look) {
        paint(d.marker.getElement(), c, index);
        d.look = l;
      }
      if (to[0] === d.to[0] && to[1] === d.to[1]) continue;
      const at = d.marker.getLngLat();
      const here: [number, number] = [at.lng, at.lat];
      if (metres(here, to) > 2_000) {
        // A big jump (first fix, or back after a while): no point gliding across town.
        d.marker.setLngLat(to);
        d.from = d.to = to;
        if (follow && c.leader && !handling.current) m.jumpTo({ center: to });
      } else {
        d.from = here;
        d.to = to;
        d.start = now;
      }
    }
    for (const [id, d] of Array.from(drawn.current))
      if (!seen.has(id)) {
        d.marker.remove();
        drawn.current.delete(id);
      }

    if (!frame.current) {
      let last = 0;
      const step = () => {
        const t = performance.now();
        // About 30 steps a second is smooth to the eye and half the work for the phone.
        if (t - last < 30) {
          frame.current = requestAnimationFrame(step);
          return;
        }
        last = t;
        let moving = false;
        for (const [id, d] of Array.from(drawn.current)) {
          if (d.from === d.to) continue;
          const k = Math.min(1, (t - d.start) / GLIDE_MS);
          const at: [number, number] = [
            d.from[0] + (d.to[0] - d.from[0]) * k,
            d.from[1] + (d.to[1] - d.from[1]) * k,
          ];
          d.marker.setLngLat(at);
          // Following: the map rides along with the leader, so the star stays in the middle.
          if (following.current && id === leaderId.current && !handling.current)
            m.jumpTo({ center: at });
          if (k >= 1) d.from = d.to;
          else moving = true;
        }
        frame.current = moving ? requestAnimationFrame(step) : null;
      };
      frame.current = requestAnimationFrame(step);
    }
  }, [cars, follow, gen]);

  // The camera. Following is carried by the glide above; here it only starts, and otherwise
  // keeps everyone in view until the person moves the map themselves.
  useEffect(() => {
    const m = map.current;
    if (!m || !cars.length || handling.current) return;
    const startFollowing = follow && !wasFollowing.current;
    wasFollowing.current = follow;
    const leader = cars.find(c => c.leader);
    if (follow && leader) {
      if (startFollowing)
        m.easeTo({
          center: [leader.lon, leader.lat],
          zoom: Math.min(Math.max(m.getZoom(), FOLLOW_ZOOM), MAX_ZOOM_FOLLOW),
          duration: 600,
        });
      return;
    }
    if (touched.current) return;
    // Keep everyone in view: refit only when a car joins or leaves, or someone leaves the view.
    const ids = cars.map(c => c.id).join(",");
    const c = m.getCanvas();
    const pad = 50;
    const outside = cars.some(car => {
      const p = m.project([car.lon, car.lat]);
      return (
        p.x < pad ||
        p.y < pad ||
        p.x > c.clientWidth - pad ||
        p.y > c.clientHeight - pad
      );
    });
    if (ids === fittedIds.current && !outside) return;
    fittedIds.current = ids;
    const b = cars.reduce(
      (bb, car) => bb.extend([car.lon, car.lat]),
      new maplibregl.LngLatBounds(
        [cars[0].lon, cars[0].lat],
        [cars[0].lon, cars[0].lat]
      )
    );
    m.fitBounds(b, { padding: 70, maxZoom: FOLLOW_ZOOM, duration: 800 });
  }, [cars, follow, gen]);

  return (
    <div
      ref={box}
      role="img"
      aria-label="Map of the convoy"
      className="size-full bg-surface"
    />
  );
}
