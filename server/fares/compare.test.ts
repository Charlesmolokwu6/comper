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
