import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRoute, type RoadRoute } from "@/lib/api";
import type { CabPoint } from "@/lib/cab";

type Located = CabPoint & { lat: number; lon: number };
const located = (p: CabPoint | null): p is Located =>
  p?.lat != null && p.lon != null;

const LIME = "#c0f11c";
const LAGOS: L.LatLngTuple = [6.5244, 3.3792];

/**
 * Map of the trip: pickup (lime dot), drop-off (white dot) and the road between them.
 * Tiles from OpenStreetMap; the road line from /api/places/route.
 */
export default function TripMap({
  pickup,
  dropoff,
}: {
  pickup: CabPoint | null;
  dropoff: CabPoint | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(LAGOS, 11);
    // OpenStreetMap's standard tiles (free with credit, light use); darkened as one layer in index.css.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      map.current = null;
    };
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

  // Draw markers and the road, then fit them in view.
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngTuple[] = [];
    if (route) {
      L.polyline(route.line, {
        color: "#000",
        weight: 9,
        opacity: 0.6,
      }).addTo(g);
      L.polyline(route.line, { color: LIME, weight: 5 }).addTo(g);
      pts.push(...route.line);
    } else if (a && b) {
      L.polyline(
        [
          [a.lat, a.lon],
          [b.lat, b.lon],
        ],
        { color: LIME, weight: 3, dashArray: "6 8", opacity: 0.7 }
      ).addTo(g);
    }
    if (a) {
      L.circleMarker([a.lat, a.lon], {
        radius: 8,
        color: "#000",
        weight: 3,
        fillColor: LIME,
        fillOpacity: 1,
      })
        .bindTooltip(`Pickup: ${a.name}`)
        .addTo(g);
      pts.push([a.lat, a.lon]);
    }
    if (b) {
      L.circleMarker([b.lat, b.lon], {
        radius: 8,
        color: LIME,
        weight: 4,
        fillColor: "#fff",
        fillOpacity: 1,
      })
        .bindTooltip(`Drop-off: ${b.name}`)
        .addTo(g);
      pts.push([b.lat, b.lon]);
    }
    if (pts.length > 1)
      m.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 16 });
    else if (pts.length === 1) m.setView(pts[0], 14);
  }, [route, a?.lat, a?.lon, b?.lat, b?.lon]);

  const typedOnly =
    (pickup && !located(pickup)) || (dropoff && !located(dropoff));

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card">
      <div
        ref={box}
        role="img"
        aria-label={
          route
            ? `Map of the road route, ${route.km} km`
            : "Map of your pickup and drop-off"
        }
        className="trip-map h-64 w-full bg-surface sm:h-80"
      />
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
