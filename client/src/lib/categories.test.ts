import { describe, expect, it } from "vitest";
import type { ComparedTrip } from "./api";
import { categoryOf, cheapestFare, splitByCategory } from "./categories";

describe("categories", () => {
  it("files each class by its vehicle: coaches are luxury, minibuses regular", () => {
    expect(categoryOf("SIENNA")).toBe("sienna");
    expect(categoryOf("LUXURY")).toBe("luxury");
    expect(categoryOf("Luxurious")).toBe("luxury");
    expect(categoryOf("Super Executive")).toBe("luxury");
    expect(categoryOf("Executive Express")).toBe("luxury");
    expect(categoryOf("HIACE ULTRA")).toBe("regular");
    expect(categoryOf("Sprinter Service")).toBe("regular");
    expect(categoryOf("14-seat bus")).toBe("regular");
    expect(categoryOf("53-seat bus")).toBe("luxury");
    expect(categoryOf("KINGLONG BUS · Standard")).toBe("luxury");
    expect(categoryOf("SMART COACH")).toBe("luxury");
    expect(categoryOf("Executive Hiace")).toBe("regular");
  });

  it("splits trips and finds each tab's cheapest bookable fare", () => {
    const t = (vehicle: string, fare: number, soldOut = false) =>
      ({ vehicle, fare, soldOut, approximate: false }) as ComparedTrip;
    const s = splitByCategory([
      t("SIENNA", 64_000),
      t("HIACE", 40_000, true),
      t("HIACE", 45_000),
      t("LUXURY", 70_000, true),
    ]);
    expect(s.regular).toHaveLength(2);
    expect(cheapestFare(s.regular)).toBe(45_000);
    expect(cheapestFare(s.sienna)).toBe(64_000);
    expect(cheapestFare(s.luxury)).toBeNull();
  });
});
