import { describe, expect, it } from "vitest";
import type { ComparedTrip } from "./api";
import { groupByOperator } from "./group";

let n = 0;
const trip = (
  operator: string,
  fare: number,
  extra: Partial<ComparedTrip> = {}
): ComparedTrip =>
  ({
    id: String(n++),
    operator,
    operatorName: operator.toUpperCase(),
    website: "",
    bookingUrl: "",
    deepLink: false,
    from: { id: "1", name: "Jibowu", city: "lagos", match: "area" },
    to: { id: "2", name: "Abuja", city: "abuja", match: "exact" },
    departure: "2026-10-16 06:00",
    vehicle: "Bus",
    fare,
    listFare: null,
    listFareLabel: null,
    fareNote: null,
    seatsAvailable: 10,
    seatsTotal: 14,
    soldOut: false,
    via: [],
    passesThrough: false,
    busFinalDestination: null,
    notes: [],
    approximate: false,
    matchNotes: [],
    fetchedAt: "",
    stale: false,
    ...extra,
  }) as ComparedTrip;

describe("groupByOperator", () => {
  it("makes one group per operator, cheapest operator first", () => {
    const groups = groupByOperator([
      trip("guo", 54_880),
      trip("chisco", 35_150, {
        from: { id: "a", name: "Okota", city: "lagos", match: "area" },
      }),
      trip("chisco", 35_150, {
        from: { id: "b", name: "Maza-Maza", city: "lagos", match: "area" },
      }),
      trip("chisco", 47_500),
    ]);
    expect(groups.map(g => g.operator)).toEqual(["chisco", "guo"]);
    expect(groups[0].best?.fare).toBe(35_150);
    expect(groups[0].trips).toHaveLength(3);
    expect(groups[0].boardingPoints).toEqual(["Okota", "Maza-Maza", "Jibowu"]);
  });

  it("never headlines a sold-out trip, and prefers exact city matches", () => {
    const [g] = groupByOperator([
      trip("pmt", 30_000, { soldOut: true }),
      trip("pmt", 40_000, { approximate: true }),
      trip("pmt", 45_000),
    ]);
    expect(g.best?.fare).toBe(45_000);
    expect(g.bestIsApproximate).toBe(false);
  });

  it("flags a headline that is only reachable approximately, and ranks it after exact ones", () => {
    const groups = groupByOperator([
      trip("pmt", 40_000, { approximate: true }),
      trip("abc", 51_000),
    ]);
    expect(groups.map(g => g.operator)).toEqual(["abc", "pmt"]);
    expect(groups[1].bestIsApproximate).toBe(true);
  });

  it("puts fully sold-out operators last", () => {
    const groups = groupByOperator([
      trip("abc", 20_000, { soldOut: true }),
      trip("guo", 60_000),
    ]);
    expect(groups.map(g => g.operator)).toEqual(["guo", "abc"]);
    expect(groups[1].best).toBeNull();
  });

  it("lifts notes every departure shares onto the card", () => {
    const note = "LUGGAGE ALLOWED PER PAX (0 -10kg)";
    const [g] = groupByOperator([
      trip("chisco", 1, { notes: [note] }),
      trip("chisco", 2, { notes: [note, "x"] }),
    ]);
    expect(g.sharedNotes).toEqual([note]);
  });
});
