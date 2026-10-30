import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  compareMapStyle,
  FIRST_LABEL_LAYER,
  type MapLook,
} from "@/lib/mapStyle";
import type { SavedTrip } from "@/lib/trips";

const LIME = "#c0f11c";
const LIGHT_QUERY = "(prefers-color-scheme: light)";
const look = (): MapLook =>
  window.matchMedia?.(LIGHT_QUERY).matches ? "light" : "dark";

function el(className: string) {
  const d = document.createElement("div");
  d.className = className;
  return d;
}

export interface Fix {
  lat: number;
  lon: number;
  /** Metres. */
  accuracy: number;
}

/**
 * "My trip" map: the saved route, start and end, and the traveller's own position from the
 * phone's GPS. Works offline from the map pieces saved with the trip (sw.js).
 */
export default function TripTracker({
  trip,
  fix,
  follow,
}: {
  trip: SavedTrip;
  fix: Fix | null;
  /** Keep the map centred on the traveller. */
  follow: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const me = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const line = trip.line.map(([lat, lon]) => [lon, lat] as [number, number]);
    const bounds = line.reduce(
      (b, c) => b.extend(c),
      new maplibregl.LngLatBounds(line[0], line[0])
    );
    const m = new maplibregl.Map({
      container: box.current,
      style: compareMapStyle(look()),
      bounds,
      fitBoundsOptions: { padding: 48 },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      // Saved map pieces go up to zoom 12; closer than this would be blank offline.
      maxZoom: 13,
    });
    m.touchZoomRotate.disableRotation();
    m.on("style.load", () => {
      m.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: line },
        },
      });
      const before = m.getLayer(FIRST_LABEL_LAYER)
        ? FIRST_LABEL_LAYER
        : undefined;
      const round = { "line-cap": "round", "line-join": "round" } as const;
      m.addLayer(
        {
          id: "route-glow",
          type: "line",
          source: "route",
          layout: round,
          paint: {
            "line-color": LIME,
            "line-width": 14,
            "line-blur": 10,
            "line-opacity": 0.35,
          },
        },
        before
      );
      m.addLayer(
        {
          id: "route",
          type: "line",
          source: "route",
          layout: round,
          paint: { "line-color": LIME, "line-width": 4 },
        },
        before
      );
    });
    new maplibregl.Marker({ element: el("pin-pickup") })
      .setLngLat(line[0])
      .addTo(m);
    new maplibregl.Marker({ element: el("pin-dropoff") })
      .setLngLat(line[line.length - 1])
      .addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      me.current = null;
    };
  }, [trip]);

  useEffect(() => {
    const m = map.current;
    if (!m || !fix) return;
    // A marker needs its position before it goes on the map.
    if (!me.current)
      me.current = new maplibregl.Marker({ element: el("pin-me") })
        .setLngLat([fix.lon, fix.lat])
        .addTo(m);
    else me.current.setLngLat([fix.lon, fix.lat]);
    if (follow)
      m.easeTo({
        center: [fix.lon, fix.lat],
        zoom: Math.max(m.getZoom(), 11),
        duration: 800,
      });
  }, [fix, follow]);

  return (
    <div
      ref={box}
      role="img"
      aria-label="Map of your trip and where you are"
      className="size-full bg-surface"
    />
  );
}
