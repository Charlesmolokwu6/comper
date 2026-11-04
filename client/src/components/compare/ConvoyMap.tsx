import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  compareMapStyle,
  FIRST_LABEL_LAYER,
  type MapLook,
} from "@/lib/mapStyle";

const LIME = "#c0f11c";
const look = (): MapLook =>
  window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";

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

function carEl(c: Car) {
  const d = document.createElement("div");
  d.className = "convoy-car";
  return d;
}
function paint(el: HTMLElement, c: Car, index: number) {
  el.dataset.leader = String(c.leader);
  el.dataset.stale = String(c.stale);
  el.style.setProperty("--car", c.color);
  el.innerHTML = `<span class="convoy-dot">${c.leader ? "★" : index}</span><span class="convoy-name">${
    c.me ? "You" : c.name.replace(/[<>&]/g, "")
  }</span>`;
}

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
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const ready = useRef(false);
  // Keep every car in view until the person moves the map themselves.
  const touched = useRef(false);

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
    });
    m.touchZoomRotate.disableRotation();
    const byHand = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) touched.current = true;
    };
    m.on("dragstart", byHand);
    m.on("zoomstart", byHand);
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
    const all = markers.current;
    return () => {
      all.clear();
      m.remove();
      map.current = null;
      ready.current = false;
    };
  }, []);

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
  }, [line]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    let n = 1;
    for (const c of cars) {
      seen.add(c.id);
      const index = c.leader ? 0 : ++n;
      let mk = markers.current.get(c.id);
      if (!mk) {
        const el = carEl(c);
        paint(el, c, index);
        mk = new maplibregl.Marker({ element: el })
          .setLngLat([c.lon, c.lat])
          .addTo(m);
        markers.current.set(c.id, mk);
      } else {
        paint(mk.getElement(), c, index);
        mk.setLngLat([c.lon, c.lat]);
      }
    }
    for (const [id, mk] of Array.from(markers.current))
      if (!seen.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    const leader = cars.find(c => c.leader);
    if (follow && leader) {
      m.easeTo({
        center: [leader.lon, leader.lat],
        zoom: Math.max(m.getZoom(), 14),
        duration: 800,
      });
      return;
    }
    if (!touched.current && cars.length) {
      const b = cars.reduce(
        (bb, c) => bb.extend([c.lon, c.lat]),
        new maplibregl.LngLatBounds(
          [cars[0].lon, cars[0].lat],
          [cars[0].lon, cars[0].lat]
        )
      );
      m.fitBounds(b, { padding: 70, maxZoom: 15, duration: 600 });
    }
  }, [cars, follow]);

  return (
    <div
      ref={box}
      role="img"
      aria-label="Map of the convoy"
      className="size-full bg-surface"
    />
  );
}
