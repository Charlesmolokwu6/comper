import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

/// <reference types="@types/google.maps" />

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

/**
 * Dark-mode JSON style for Google Maps
 * Pure black background with minimal UI elements
 */
const DARK_MODE_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
  {
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#999999" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#000000" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#666666" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0a0a0a" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#666666" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0a0a0a" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0a0a0a" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#999999" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#999999" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#0a0a0a" }],
  },
  {
    featureType: "transit.line",
    elementType: "stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a0a0a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#666666" }],
  },
];

function loadMapScript() {
  return new Promise<void>((resolve) => {
    // Check if script is already loaded
    if (window.google?.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve();
      script.remove();
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      resolve();
    };
    document.head.appendChild(script);
  });
}

interface MapWithRoutesProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  routeOrigin?: google.maps.LatLngLiteral;
  routeDestination?: google.maps.LatLngLiteral;
  showRoute?: boolean;
}

export function MapWithRoutes({
  className,
  initialCenter = { lat: 6.5244, lng: 3.3792 }, // Lagos, Nigeria
  initialZoom = 13,
  onMapReady,
  routeOrigin,
  routeDestination,
  showRoute = false,
}: MapWithRoutesProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);

  const init = usePersistFn(async () => {
    await loadMapScript();
    if (!mapContainer.current || !window.google) {
      console.error("Map container or Google Maps not found");
      return;
    }

    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: false,
      styles: DARK_MODE_STYLE,
      backgroundColor: "#000000",
    });

    // Initialize directions service and renderer
    directionsService.current = new window.google.maps.DirectionsService();
    directionsRenderer.current = new window.google.maps.DirectionsRenderer({
      map: map.current,
      polylineOptions: {
        strokeColor: "#C0F11C", // Neon lime
        strokeWeight: 4,
        strokeOpacity: 0.9,
        geodesic: true,
      },
      suppressMarkers: false,
      markerOptions: {
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "#C0F11C",
          fillOpacity: 1,
          strokeColor: "#000000",
          strokeWeight: 2,
        },
      },
    });

    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  // Draw route when origin and destination change
  useEffect(() => {
    if (
      showRoute &&
      routeOrigin &&
      routeDestination &&
      directionsService.current &&
      directionsRenderer.current
    ) {
      directionsService.current.route(
        {
          origin: routeOrigin,
          destination: routeDestination,
          travelMode: window.google?.maps?.TravelMode?.DRIVING,
        },
        (result, status) => {
          if (status === window.google?.maps?.DirectionsStatus?.OK && result) {
            directionsRenderer.current?.setDirections(result);
          }
        }
      );
    }
  }, [showRoute, routeOrigin, routeDestination]);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div
      ref={mapContainer}
      className={cn("w-full h-[500px] bg-black border border-lime-900", className)}
    />
  );
}
