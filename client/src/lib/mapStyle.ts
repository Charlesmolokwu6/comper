/**
 * Compare's own map design, drawn from OpenFreeMap's free OpenStreetMap vector data
 * (OpenMapTiles schema). Black and greys like the app, with lime kept for our own route.
 */
import type { StyleSpecification } from "maplibre-gl";

export type MapLook = "dark" | "light";
/** Candidate looks shown to the owner; not offered in the app until picked. */
export type MapDraft =
  | "olive"
  | "navy"
  | "sand"
  | "graphite"
  | "olive2"
  | "olive3"
  | "dayClean"
  | "dayOlive"
  | "dayPaper";

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
  /** Thin line along shores so water reads clearly against dark land. */
  shore?: string;
  /** Area names in spaced capitals. */
  areaCaps?: boolean;
}

const PALETTES: Record<MapLook | MapDraft, Palette> = {
  olive: {
    land: "#0a0c06",
    water: "#0b1416",
    waterLabel: "#5f7a5a",
    park: "#121a0a",
    built: "#10130a",
    building: "#181d10",
    minor: "#1b2012",
    street: "#283014",
    main: "#3b4a12",
    highway: "#5c7414",
    casing: "#050603",
    rail: "#2a3018",
    label: "#e9f5c2",
    labelMuted: "#8b9a6a",
    halo: "#0a0c06",
  },
  // Olive night, refined: roads step back so the route leads; water has a shoreline.
  olive2: {
    land: "#0c0e09",
    water: "#060d10",
    waterLabel: "#3f6470",
    park: "#0f1609",
    built: "#11140d",
    building: "#171b11",
    minor: "#171b10",
    street: "#1f2614",
    main: "#2b3517",
    highway: "#3d4c19",
    casing: "#080906",
    rail: "#252b18",
    label: "#eef6d2",
    labelMuted: "#7f8c63",
    halo: "#0c0e09",
    shore: "#2a3a2e",
    areaCaps: true,
  },
  // Same, a shade lighter and with main roads warmer, for readability in sunlight.
  // Light looks in the spirit of Bolt's map: pale land, white roads with thin grey edges,
  // soft water and parks, few small labels, so a dark route reads instantly.
  dayClean: {
    land: "#f2f3f1",
    water: "#cfe3ef",
    waterLabel: "#5a83a0",
    park: "#dbeed6",
    built: "#eeefec",
    building: "#e4e5e2",
    minor: "#ffffff",
    street: "#ffffff",
    main: "#ffffff",
    highway: "#ffffff",
    casing: "#d9dbd6",
    rail: "#cfd1cc",
    label: "#2c2f2a",
    labelMuted: "#7d827a",
    halo: "#f7f8f6",
    shore: "#b9d3e2",
    areaCaps: true,
  },
  // Same, with a faint olive tint so it pairs with the olive dark map.
  dayOlive: {
    land: "#f1f3ea",
    water: "#cfe1df",
    waterLabel: "#557a77",
    park: "#dbe9c9",
    built: "#ecefe3",
    building: "#e1e5d6",
    minor: "#ffffff",
    street: "#ffffff",
    main: "#fbfdf3",
    highway: "#eef6cf",
    casing: "#d5dbc4",
    rail: "#cdd2bf",
    label: "#262b1c",
    labelMuted: "#7b8468",
    halo: "#f5f7ef",
    shore: "#b6cfcb",
    areaCaps: true,
  },
  // Warm paper white, the calmest of the three.
  dayPaper: {
    land: "#f4f2ee",
    water: "#d3e2e8",
    waterLabel: "#5f7f8a",
    park: "#e1ead7",
    built: "#efede8",
    building: "#e6e3dc",
    minor: "#ffffff",
    street: "#ffffff",
    main: "#ffffff",
    highway: "#fff4d9",
    casing: "#dcd8cf",
    rail: "#d2cec5",
    label: "#2e2a24",
    labelMuted: "#857d70",
    halo: "#f8f6f2",
    shore: "#bfd2d9",
    areaCaps: true,
  },
  olive3: {
    land: "#121509",
    water: "#09151a",
    waterLabel: "#4f7682",
    park: "#152010",
    built: "#171b0e",
    building: "#1e2414",
    minor: "#1d2313",
    street: "#283018",
    main: "#38441b",
    highway: "#56681f",
    casing: "#0a0c06",
    rail: "#2d3420",
    label: "#f2f8dc",
    labelMuted: "#94a174",
    halo: "#121509",
    shore: "#334a3c",
    areaCaps: true,
  },
  navy: {
    land: "#0a1020",
    water: "#060a14",
    waterLabel: "#4c6a9a",
    park: "#0d1a24",
    built: "#0e1528",
    building: "#141d36",
    minor: "#18223a",
    street: "#22304f",
    main: "#2f4470",
    highway: "#4a67a3",
    casing: "#060a14",
    rail: "#1d2944",
    label: "#e6edff",
    labelMuted: "#8796b8",
    halo: "#0a1020",
  },
  sand: {
    land: "#f3ede2",
    water: "#bcd3d6",
    waterLabel: "#4f7579",
    park: "#dfe6cc",
    built: "#ece4d5",
    building: "#e2d8c6",
    minor: "#fffaf1",
    street: "#fffaf1",
    main: "#fde9b8",
    highway: "#f6c96b",
    casing: "#d8ccb6",
    rail: "#c9bda7",
    label: "#2b2418",
    labelMuted: "#7a6d58",
    halo: "#f3ede2",
  },
  graphite: {
    land: "#1c1d1f",
    water: "#2a2d31",
    waterLabel: "#8a9096",
    park: "#202421",
    built: "#212224",
    building: "#28292c",
    minor: "#2c2d30",
    street: "#38393d",
    main: "#4a4c51",
    highway: "#6b6e74",
    casing: "#151618",
    rail: "#3a3b3f",
    label: "#f2f2f2",
    labelMuted: "#9a9ca1",
    halo: "#1c1d1f",
  },
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

/** First label layer: our route goes underneath it so place names stay readable. */
export const FIRST_LABEL_LAYER = "water-names";

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

/** The palette behind each look the app offers. Dark is "5B", picked by the owner. */
const LOOK_PALETTE: Record<MapLook, MapLook | MapDraft> = {
  dark: "olive3",
  light: "light",
};

export function compareMapStyle(look: MapLook | MapDraft): StyleSpecification {
  const c =
    PALETTES[look === "dark" || look === "light" ? LOOK_PALETTE[look] : look];
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
      ...(c.shore
        ? [
            {
              id: "shore",
              type: "line" as const,
              source: "osm",
              "source-layer": "water",
              paint: {
                "line-color": c.shore,
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8,
                  0.5,
                  14,
                  1.5,
                ] as any,
              },
            },
          ]
        : []),
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
          "text-transform": c.areaCaps ? "uppercase" : "none",
          "text-letter-spacing": c.areaCaps ? 0.12 : 0,
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
        filter: c.areaCaps
          ? isClass("town", "village")
          : isClass("city", "town", "village"),
        layout: {
          "text-field": ["get", "name"],
          "text-font": c.areaCaps ? FONT : FONT_BOLD,
          "text-transform": c.areaCaps ? "uppercase" : "none",
          "text-letter-spacing": c.areaCaps ? 0.14 : 0,
          "text-size": c.areaCaps
            ? (["interpolate", ["linear"], ["zoom"], 6, 9, 12, 11.5] as any)
            : (["interpolate", ["linear"], ["zoom"], 6, 10, 12, 13] as any),
        },
        paint: {
          "text-color": c.label,
          "text-halo-color": c.halo,
          "text-halo-width": 2,
        },
      },
      ...(c.areaCaps
        ? [
            {
              id: "cities",
              type: "symbol" as const,
              source: "osm",
              "source-layer": "place",
              filter: isClass("city"),
              layout: {
                "text-field": ["get", "name"] as any,
                "text-font": FONT_BOLD,
                "text-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6,
                  12,
                  12,
                  16,
                ] as any,
              },
              paint: {
                "text-color": c.label,
                "text-halo-color": c.halo,
                "text-halo-width": 2,
              },
            },
          ]
        : []),
    ],
  };
}
