import { describe, expect, it } from "vitest";
import { rankTrips } from "./compare";

const trip = (
  id: string,
  fare: number,
  listFare: number | null,
  extra: Partial<{ soldOut: boolean; approximate: boolean }> = {}
) => ({
  id,
  fare,
  listFare,
  departure: "2026-10-20 06:00",
  soldOut: false,
  approximate: false,
  ...extra,
});

describe("rankTrips", () => {
  it("ranks on the post-discount fare for every operator, ignoring listFare", () => {
    // GUO: ₦56,000 bus fare, ₦54,880 with coupon. Chisco: ₦50,000 before, ₦47,500 after discount.
    // ABC: ₦51,000, no discount. Pre-discount figures must never decide the order.
    const { trips, cheapest } = rankTrips([
      trip("guo", 54_880, 56_000),
      trip("abc", 51_000, null),
      trip("chisco", 47_500, 50_000),
    ]);
    expect(trips.map(t => t.id)).toEqual(["chisco", "abc", "guo"]);
    expect(cheapest?.id).toBe("chisco");
  });

  it("puts sold-out trips last and never picks them, or approximate matches, as cheapest", () => {
    const { trips, cheapest } = rankTrips([
      trip("soldout", 30_000, null, { soldOut: true }),
      trip("mararaba", 40_000, null, { approximate: true }),
      trip("utako", 45_000, null),
    ]);
    expect(trips.map(t => t.id)).toEqual(["mararaba", "utako", "soldout"]);
    expect(cheapest?.id).toBe("utako");
  });
});

import { notOnSaleReason } from "./compare";
import { lagosDate } from "./store";

describe("notOnSaleReason", () => {
  const op = (extra: object = {}) =>
    ({
      id: "x",
      name: "GUO Transport",
      website: "",
      maxDaysAhead: 45,
      origins: async () => [],
      destinations: async () => [],
      search: async () => [],
      ...extra,
    }) as any;

  it("uses the operator's own booking window when it publishes one (GUO: from tomorrow)", async () => {
    const window = { first: lagosDate(1), last: lagosDate(45) };
    const guo = op({ salesWindow: async () => window });
    expect(await notOnSaleReason(guo, lagosDate(0))).toMatch(
      /sells online from/
    );
    expect(await notOnSaleReason(guo, lagosDate(1))).toBeNull();
  });

  it("falls back to maxDaysAhead", async () => {
    const pmt = op({ name: "Peace Mass Transit", maxDaysAhead: 4 });
    expect(await notOnSaleReason(pmt, lagosDate(4))).toBeNull();
    expect(await notOnSaleReason(pmt, lagosDate(5))).toMatch(
      /up to 4 days ahead/
    );
  });

  it("ignores a window lookup that fails", async () => {
    const flaky = op({
      salesWindow: async () => {
        throw new Error("down");
      },
    });
    expect(await notOnSaleReason(flaky, lagosDate(0))).toBeNull();
  });
});

import { stopLocation } from "./geo";
import { resolveCity } from "./cities";

describe("stopLocation", () => {
  it("locates terminals from their district, and leaves unknown places null", () => {
    const at = (label: string) => stopLocation(resolveCity(label)!);
    expect(at("Lagos (Jibowu--am)")).toEqual({ lat: 6.51878, lon: 3.36837 });
    expect(at("Lagos - Mazamaza Terminal")).toEqual(at("MAZA MAZA"));
    expect(at("Abuja-Mararaba Terminal")?.lon).toBeGreaterThan(7.55); // not GUO's copy of Utako's
    expect(at("Lagos (Chisco HQ)")).toBeNull();
    expect(at("ABUJA")).toBeNull();
  });
});
