import { describe, expect, it } from "vitest";
import { parsePoint, stepText, thin } from "./route";

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

describe("stepText", () => {
  const s = (type: string, modifier?: string, name = "", extra: any = {}) => ({
    name,
    maneuver: { type, modifier, ...extra },
  });
  it("words turns, roundabouts and arrival", () => {
    expect(stepText(s("turn", "left", "Awolowo Road"))).toBe(
      "Turn left onto Awolowo Road"
    );
    expect(
      stepText(s("roundabout", "right", "Admiralty Way", { exit: 2 }))
    ).toBe("At the roundabout, take exit 2 onto Admiralty Way");
    expect(stepText(s("fork", "slight right"))).toBe("Keep right at the fork");
    expect(stepText(s("depart", "", "Herbert Macaulay Way"))).toBe(
      "Head off on Herbert Macaulay Way"
    );
    expect(stepText(s("arrive"))).toBe("You've arrived");
    expect(stepText(s("turn", "uturn"))).toBe("Make a U-turn");
  });
});
