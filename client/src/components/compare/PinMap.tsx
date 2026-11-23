import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fastMapOptions, keepMapAlive } from "@/lib/mapRuntime";
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

const el = (className: string) => {
  const d = document.createElement("div");
  d.className = className;
  return d;
};

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Map for a shared location: the pin, your position and the road between them. While
 * guiding it follows you closely; otherwise it shows the whole way.
 */
export default function PinMap({
  pin,
  me,
  line,
  guiding = false,
  onPick,
  label = null,
}: {
  pin: LatLon;
  me: LatLon | null;
  /** [lat, lon] along the road. */
  line: [number, number][] | null;
  guiding?: boolean;
  /** Lets the person drag the pin, or tap the map, to set the exact spot. */
  onPick?: (p: LatLon) => void;
  /** Address shown in a bubble above the pin. */
  label?: string | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const ready = useRef(false);
  const fitted = useRef(false);
  const pinMarker = useRef<maplibregl.Marker | null>(null);
  // The person's finger is on the map: the camera leaves it alone.
  const handling = useRef(false);
  const aimed = useRef(false);
  const glide = useRef<{
    from: [number, number];
    to: [number, number];
    start: number;
  }>({ from: [0, 0], to: [0, 0], start: 0 });
  const frame = useRef<number | null>(null);
  const guidingRef = useRef(guiding);
  guidingRef.current = guiding;
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: compareMapStyle(look()),
      center: [pin.lon, pin.lat],
      zoom: 14,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      ...fastMapOptions(),
    });
    m.touchZoomRotate.disableRotation();
    const byHand = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) handling.current = true;
    };
    m.on("dragstart", byHand);
    m.on("zoomstart", byHand);
    m.on("moveend", () => {
      handling.current = false;
    });
    const marker = new maplibregl.Marker({
      element: el("pin-share"),
      anchor: "bottom",
      draggable: !!onPick,
    })
      .setLngLat([pin.lon, pin.lat])
      .addTo(m);
    pinMarker.current = marker;
    if (onPick) {
      marker.on("dragend", () => {
        const at = marker.getLngLat();
        pick.current?.({ lat: at.lat, lon: at.lng });
      });
      m.on("click", e => {
        marker.setLngLat(e.lngLat);
        pick.current?.({ lat: e.lngLat.lat, lon: e.lngLat.lng });
      });
    }
    m.on("style.load", () => {
      m.addSource("way", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      const before = m.getLayer(FIRST_LABEL_LAYER)
        ? FIRST_LABEL_LAYER
        : undefined;
      const round = { "line-cap": "round", "line-join": "round" } as const;
      m.addLayer(
        {
          id: "way-glow",
          type: "line",
          source: "way",
          layout: round,
          paint: {
            "line-color": LIME,
            "line-width": 16,
            "line-blur": 10,
            "line-opacity": 0.35,
          },
        },
        before
      );
      m.addLayer(
        {
          id: "way",
          type: "line",
          source: "way",
          layout: round,
          paint: { "line-color": LIME, "line-width": 5 },
        },
        before
      );
      ready.current = true;
      m.fire("compare:redraw");
    });
    map.current = m;
    const stopAlive = keepMapAlive(m, box.current);
    return () => {
      stopAlive();
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = null;
      m.remove();
      map.current = null;
      meMarker.current = null;
      pinMarker.current = null;
      ready.current = false;
    };
    // The map is made once; the pin moves below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The address bubble above the pin, as plain text.
  useEffect(() => {
    const host = pinMarker.current?.getElement();
    if (!host) return;
    let tag = host.querySelector<HTMLElement>(".pin-label");
    if (!label) return tag?.remove();
    if (!tag) {
      tag = document.createElement("span");
      tag.className = "pin-label";
      host.appendChild(tag);
    }
    tag.textContent = label;
  }, [label]);

  // The pin moved (a new search, or dragged): follow it, bringing it into view if needed.
  useEffect(() => {
    const m = map.current;
    pinMarker.current?.setLngLat([pin.lon, pin.lat]);
    if (m && !m.getBounds().contains([pin.lon, pin.lat]))
      m.easeTo({
        center: [pin.lon, pin.lat],
        zoom: Math.max(m.getZoom(), 15),
        duration: 600,
      });
  }, [pin.lat, pin.lon]);

  // The road.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const draw = () => {
      const src = m.getSource("way") as maplibregl.GeoJSONSource | undefined;
      src?.setData(
        line && line.length > 1
          ? {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: line.map(([lat, lon]) => [lon, lat]),
              },
            }
          : { type: "FeatureCollection", features: [] }
      );
    };
    if (ready.current) draw();
    m.on("compare:redraw", draw);
    return () => {
      m.off("compare:redraw", draw);
    };
  }, [line]);

  // You, and the camera.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (me) {
      const to: [number, number] = [me.lon, me.lat];
      if (!meMarker.current) {
        meMarker.current = new maplibregl.Marker({ element: el("pin-me") })
          .setLngLat(to)
          .addTo(m);
        glide.current = { from: to, to, start: 0 };
      } else if (
        to[0] !== glide.current.to[0] ||
        to[1] !== glide.current.to[1]
      ) {
        // Glide to the new fix over a second rather than jumping; while guiding, the map
        // rides along so you stay in the middle.
        const at = meMarker.current.getLngLat();
        glide.current = {
          from: [at.lng, at.lat],
          to,
          start: performance.now(),
        };
        if (!frame.current) {
          let last = 0;
          const step = () => {
            const t = performance.now();
            if (t - last < 30) {
              frame.current = requestAnimationFrame(step);
              return;
            }
            last = t;
            const g = glide.current;
            const k = Math.min(1, (t - g.start) / 1_000);
            const here: [number, number] = [
              g.from[0] + (g.to[0] - g.from[0]) * k,
              g.from[1] + (g.to[1] - g.from[1]) * k,
            ];
            meMarker.current?.setLngLat(here);
            if (guidingRef.current && !handling.current)
              m.jumpTo({ center: here });
            frame.current = k < 1 ? requestAnimationFrame(step) : null;
          };
          frame.current = requestAnimationFrame(step);
        }
      }
    }
    if (guiding && me) {
      // Guiding starts: bring you to the middle at street level, once.
      if (!aimed.current && !handling.current) {
        aimed.current = true;
        m.easeTo({
          center: [me.lon, me.lat],
          zoom: Math.min(Math.max(m.getZoom(), 16), 17),
          duration: 700,
        });
      }
      return;
    }
    aimed.current = false;
    if (fitted.current && !guiding) return;
    const pts: [number, number][] = [[pin.lon, pin.lat]];
    if (me) pts.push([me.lon, me.lat]);
    for (const [lat, lon] of line ?? []) pts.push([lon, lat]);
    if (pts.length < 2) return;
    const b = pts.reduce(
      (bb, c) => bb.extend(c),
      new maplibregl.LngLatBounds(pts[0], pts[0])
    );
    m.fitBounds(b, {
      padding: { top: 90, bottom: 60, left: 50, right: 50 },
      maxZoom: 16,
      duration: 600,
    });
    if (line) fitted.current = true;
  }, [me, line, guiding, pin.lat, pin.lon]);

  return (
    <div
      ref={box}
      role="img"
      aria-label="Map of the shared location and the way there"
      className="size-full bg-surface"
    />
  );
}
