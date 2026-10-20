import { describe, expect, it } from "vitest";
import { cityOf, parsePlace, placeString } from "./places";

describe("places", () => {
  it("round-trips a city with or without a terminal", () => {
    expect(parsePlace("lagos~ajah")).toEqual({ city: "lagos", terminal: "ajah" });
    expect(parsePlace("lagos")).toEqual({ city: "lagos", terminal: null });
    expect(parsePlace("")).toBeNull();
    expect(placeString("lagos", "ajah")).toBe("lagos~ajah");
    expect(placeString("lagos", null)).toBe("lagos");
    expect(cityOf("port-harcourt~mile1")).toBe("port-harcourt");
  });
});
