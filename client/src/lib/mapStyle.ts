/**
 * Compare's own map design, drawn from OpenFreeMap's free OpenStreetMap vector data
 * (OpenMapTiles schema). Black and greys like the app, with lime kept for our own route.
 */
import type { StyleSpecification } from "maplibre-gl";

export type MapLook = "dark" | "light";

interface Palette {
  land: string;
  water: string;
  waterLabel: string;
  park: string;
  built: string;
  building: string;
  minor: string;
  street: string;
  main: string;
  highway: string;
  casing: string;
  rail: string;
  label: string;
  labelMuted: string;
  halo: string;
}

const PALETTES: Record<MapLook, Palette> = {
  dark: {
    land: "#0b0b0b",
    water: "#0d1b22",
    waterLabel: "#4f7889",
    park: "#0f1a10",
    built: "#121212",
    building: "#1a1a1a",
    minor: "#1d1d1d",
    street: "#262626",
    main: "#343434",
    highway: "#4a4a4a",
    casing: "#050505",
    rail: "#2b2b2b",
    label: "#e5e5e5",
    labelMuted: "#8a8a8a",
    halo: "#0b0b0b",
  },
  light: {
    land: "#f4f4f2",
    water: "#cfdde3",
    waterLabel: "#5d7f8c",
    park: "#e3ecdc",
    built: "#ececea",
    building: "#e0e0dd",
    minor: "#ffffff",
    street: "#ffffff",
    main: "#ffffff",
    highway: "#d9d9d4",
    casing: "#cfcfca",
    rail: "#c4c4c0",
    label: "#1f1f1f",
    labelMuted: "#6b6b6b",
    halo: "#f4f4f2",
  },
};

const FONT = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];

/** Road width by zoom: thin when zoomed out, wider close in. */
const width = (base: number) =>
  [
    "interpolate",
    ["exponential", 1.5],
    ["zoom"],
    8,
    base * 0.25,
    12,
    base,
    16,
    base * 4,
    19,
    base * 12,
  ] as any;

const isClass = (...classes: string[]) =>
  ["match", ["get", "class"], classes, true, false] as any;

export function compareMapStyle(look: MapLook): StyleSpecification {
  const c = PALETTES[look];
  const roads: [string, string[], number, number][] = [
    // id, OpenMapTiles classes, width, min zoom
    ["minor", ["minor", "service", "track"], 0.8, 13],
    ["street", ["tertiary"], 1.1, 11],
    ["main", ["primary", "secondary"], 1.6, 8],
    ["highway", ["motorway", "trunk"], 2.2, 5],
  ];
  const roadColour: Record<string, string> = {
    minor: c.minor,
    street: c.street,
    main: c.main,
    highway: c.highway,
  };

  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      osm: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution:
          '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: "land", type: "background", paint: { "background-color": c.land } },
      {
        id: "built-up",
        type: "fill",
        source: "osm",
        "source-layer": "landuse",
        filter: isClass("residential", "commercial", "industrial", "retail"),
        paint: { "fill-color": c.built },
      },
      {
        id: "parks",
        type: "fill",
        source: "osm",
        "source-layer": "landcover",
        filter: isClass("grass", "wood", "farmland"),
        paint: { "fill-color": c.park, "fill-opacity": 0.8 },
      },
      {
        id: "water",
        type: "fill",
        source: "osm",
        "source-layer": "water",
        paint: { "fill-color": c.water },
      },
      {
        id: "rivers",
        type: "line",
        source: "osm",
        "source-layer": "waterway",
        paint: {
          "line-color": c.water,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 2],
        },
      },
      {
        id: "buildings",
        type: "fill",
        source: "osm",
        "source-layer": "building",
        minzoom: 14,
        paint: { "fill-color": c.building, "fill-opacity": 0.9 },
      },
      // Casings first, then fills, so junctions read cleanly.
      ...roads.map(([id, classes, w, minzoom]) => ({
        id: `road-${id}-casing`,
        type: "line" as const,
        source: "osm",
        "source-layer": "transportation",
        minzoom,
        filter: isClass(...classes),
        layout: { "line-cap": "round" as const, "line-join": "round" as const },
        paint: { "line-color": c.casing, "line-width": width(w + 0.8) },
      })),
      ...roads.map(([id, classes, w, minzoom]) => ({
        id: `road-${id}`,
        type: "line" as const,
        source: "osm",
        "source-layer": "transportation",
        minzoom,
        filter: isClass(...classes),
        layout: { "line-cap": "round" as const, "line-join": "round" as const },
        paint: { "line-color": roadColour[id], "line-width": width(w) },
      })),
      {
        id: "rail",
        type: "line",
        source: "osm",
        "source-layer": "transportation",
        minzoom: 11,
        filter: isClass("rail", "transit"),
        paint: {
          "line-color": c.rail,
          "line-width": 1,
          "line-dasharray": [3, 3],
        },
      },
      {
        id: "water-names",
        type: "symbol",
        source: "osm",
        "source-layer": "water_name",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Italic"],
          "text-size": 12,
        },
        paint: {
          "text-color": c.waterLabel,
          "text-halo-color": c.halo,
          "text-halo-width": 1,
        },
      },
      {
        id: "road-names",
        type: "symbol",
        source: "osm",
        "source-layer": "transportation_name",
        minzoom: 13,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": FONT,
          "text-size": 11,
        },
        paint: {
          "text-color": c.labelMuted,
          "text-halo-color": c.halo,
          "text-halo-width": 1.5,
        },
      },
      {
        id: "areas",
        type: "symbol",
        source: "osm",
        "source-layer": "place",
        minzoom: 11,
        filter: isClass("suburb", "neighbourhood", "quarter"),
        layout: {
          "text-field": ["get", "name"],
          "text-font": FONT,
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 15, 13],
        },
        paint: {
          "text-color": c.labelMuted,
          "text-halo-color": c.halo,
          "text-halo-width": 1.5,
        },
      },
      {
        id: "towns",
        type: "symbol",
        source: "osm",
        "source-layer": "place",
        filter: isClass("city", "town", "village"),
        layout: {
          "text-field": ["get", "name"],
          "text-font": FONT_BOLD,
          "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 12, 13],
        },
        paint: {
          "text-color": c.label,
          "text-halo-color": c.halo,
          "text-halo-width": 1.5,
        },
      },
    ],
  };
}
