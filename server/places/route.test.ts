import { describe, expect, it } from "vitest";
import { parsePoint, thin } from "./route";

describe("route", () => {
  it("accepts points in Nigeria only", () => {
    expect(parsePoint("6.50951,3.37921")).toEqual([6.5095, 3.3792]);
    expect(parsePoint("51.5,-0.12")).toBeNull();
    expect(parsePoint("abc")).toBeNull();
  });

  it("thins long lines but keeps both ends", () => {
    const pts = Array.from({ length: 1000 }, (_, i) => i);
    const out = thin(pts, 100);
    expect(out.length).toBeLessThanOrEqual(101);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(999);
  });
});
