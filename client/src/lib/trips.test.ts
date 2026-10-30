import { describe, expect, it } from "vitest";
import { alongRoute, corridorTiles, tileOf, townsAlong } from "./trips";

// A straight-ish road east along the equator-ish latitude of Lagos: 0.1° of longitude ≈ 11 km.
const line: [number, number][] = Array.from({ length: 41 }, (_, i) => [
  6.5,
  3.0 + i * 0.1,
]);

describe("alongRoute", () => {
  it("measures km from the start to the nearest point on the road", () => {
    const r = alongRoute(line, { lat: 6.5, lon: 3.5 });
    expect(r.at).toBeGreaterThan(54);
    expect(r.at).toBeLessThan(56);
    expect(r.off).toBeLessThan(0.1);
  });
  it("says how far off the road a point is", () => {
    const r = alongRoute(line, { lat: 6.55, lon: 4.0 });
    expect(r.off).toBeGreaterThan(5);
    expect(r.off).toBeLessThan(6);
  });
});

describe("townsAlong", () => {
  it("keeps towns near the road, in the order you reach them", () => {
    const towns = townsAlong(line, [
      { name: "Far", lat: 7.5, lon: 4 },
      { name: "Second", lat: 6.52, lon: 5.5 },
      { name: "First", lat: 6.48, lon: 4.2 },
    ]);
    expect(towns.map(t => t.name)).toEqual(["First", "Second"]);
    expect(towns[0].at).toBeLessThan(towns[1].at);
  });
});

describe("offline map tiles", () => {
  it("finds the tile for a point (Lagos at zoom 8 is 130/123)", () => {
    expect(tileOf({ lat: 6.45, lon: 3.39 }, 8)).toEqual({ x: 130, y: 123 });
  });
  it("covers a ~440 km route in a few hundred tiles", () => {
    const n = corridorTiles(line).length;
    expect(n).toBeGreaterThan(100);
    expect(n).toBeLessThan(700);
  });
});
