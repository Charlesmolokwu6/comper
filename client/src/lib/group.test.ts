import { describe, expect, it } from "vitest";
import type { ComparedTrip } from "./api";
import { groupByOperator } from "./group";

const JIBOWU = {
  id: "1",
  name: "Jibowu",
  city: "lagos",
  match: "area" as const,
  lat: 6.5143,
  lon: 3.3696,
};
const AJAH = {
  id: "9",
  name: "Ajah",
  city: "lagos",
  match: "area" as const,
  lat: 6.4672,
  lon: 3.5718,
};
const NOWHERE = {
  id: "8",
  name: "Empire",
  city: "lagos",
  match: "area" as const,
  lat: null,
  lon: null,
};

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
    from: JIBOWU,
    to: {
      id: "2",
      name: "Abuja",
      city: "abuja",
      match: "exact",
      lat: null,
      lon: null,
    },
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
        from: {
          id: "a",
          name: "Okota",
          city: "lagos",
          match: "area",
          lat: null,
          lon: null,
        },
      }),
      trip("chisco", 35_150, {
        from: {
          id: "b",
          name: "Maza-Maza",
          city: "lagos",
          match: "area",
          lat: null,
          lon: null,
        },
      }),
      trip("chisco", 47_500),
    ]);
    expect(groups.map(g => g.operator)).toEqual(["chisco", "guo"]);
    expect(groups[0].best?.fare).toBe(35_150);
    expect(groups[0].trips).toHaveLength(3);
    expect(groups[0].points.map(p => p.name).sort()).toEqual([
      "Jibowu",
      "Maza-Maza",
      "Okota",
    ]);
    expect(groups[0].nearest).toBeNull();
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

  describe("with the traveller's location", () => {
    const lekki = { lat: 6.4474, lon: 3.4723 }; // nearer Ajah than Jibowu
    const yaba = { lat: 6.5095, lon: 3.3711 }; // next to Jibowu

    it("headlines the nearest terminal's price, not the operator's cheapest anywhere", () => {
      const list = [
        trip("guo", 50_000, { from: JIBOWU }),
        trip("guo", 58_000, { from: AJAH }),
      ];
      const [atYaba] = groupByOperator(list, yaba);
      expect(atYaba.nearest?.name).toBe("Jibowu");
      expect(atYaba.best?.fare).toBe(50_000);
      expect(atYaba.nearest!.distanceKm!).toBeLessThan(1);

      const [atLekki] = groupByOperator(list, lekki);
      expect(atLekki.nearest?.name).toBe("Ajah");
      expect(atLekki.best?.fare).toBe(58_000);
      expect(atLekki.points.map(p => p.name)).toEqual(["Ajah", "Jibowu"]);
    });

    it("ranks operators by their nearest-terminal price", () => {
      const groups = groupByOperator(
        [
          trip("guo", 40_000, { from: JIBOWU }),
          trip("guo", 60_000, { from: AJAH }),
          trip("abc", 50_000, { from: AJAH }),
        ],
        lekki
      );
      expect(groups.map(g => [g.operator, g.best?.fare])).toEqual([
        ["abc", 50_000],
        ["guo", 60_000],
      ]);
    });

    it("skips a nearest terminal that is sold out", () => {
      const [g] = groupByOperator(
        [
          trip("guo", 50_000, { from: AJAH, soldOut: true }),
          trip("guo", 55_000, { from: JIBOWU }),
        ],
        lekki
      );
      expect(g.nearest?.name).toBe("Jibowu");
      expect(g.best?.fare).toBe(55_000);
    });

    it("falls back to the operator's cheapest when no terminal location is known", () => {
      const [g] = groupByOperator(
        [
          trip("chisco", 30_000, { from: NOWHERE }),
          trip("chisco", 35_000, { from: NOWHERE }),
        ],
        lekki
      );
      expect(g.nearest).toBeNull();
      expect(g.best?.fare).toBe(30_000);
      expect(g.points[0].distanceKm).toBeNull();
    });
  });
});
