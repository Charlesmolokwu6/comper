import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveFlightCity } from "./airports";
import { parseCraneResults } from "./crane";
import { cabinOf } from "./types";
import { parseValueJetSearch } from "./valuejet";
import { parseVidecomResults, videcomDate } from "./videcom";

const fixture = (f: string) =>
  fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

describe("Videcom (United Nigeria, Max Air, Rano Air)", () => {
  it("reads every flight with its bookable fare classes, skipping sold-out ones", () => {
    const flights = parseVidecomResults(
      fixture("videcom-unitednigeria-LOS-ABV.html"),
      "LOS",
      "ABV",
      "2026-10-24"
    );
    expect(flights).toHaveLength(5);
    expect(flights[0]).toMatchObject({
      flightNumber: "UN0504",
      departure: "2026-10-24 07:00",
      arrival: "2026-10-24 08:15",
      duration: "1h 15m",
      stops: 0,
    });
    // Economy Promo and Business Class are sold out on this flight.
    expect(flights[0].fares).toEqual([
      { name: "Economy Saver", cabin: "economy", price: 115500 },
      { name: "Economy Flex", cabin: "economy", price: 231000 },
      { name: "Premium Economy", cabin: "premium", price: 295500 },
    ]);
  });

  it("keeps the airline's own terminal label (Rano Air flies from MMA2)", () => {
    const [f] = parseVidecomResults(
      fixture("videcom-ranoair-LOS-ABV.html"),
      "LOS",
      "ABV",
      "2026-10-24"
    );
    expect(f.fromName).toBe("LAGOS (MMA2)");
    expect(f.fares).toEqual([
      { name: "Economy", cabin: "economy", price: 115000 },
    ]);
  });

  it("refuses a page for a different day", () => {
    expect(() =>
      parseVidecomResults(
        fixture("videcom-maxair-LOS-ABV.html"),
        "LOS",
        "ABV",
        "2026-10-25"
      )
    ).toThrow(/instead of/);
  });

  it("reads a day with no flights as empty, not as an error", () => {
    expect(
      parseVidecomResults(
        fixture("videcom-maxair-LOS-PHC-none.html"),
        "LOS",
        "PHC",
        "2026-10-17"
      )
    ).toEqual([]);
  });

  it("formats dates the way Videcom links expect", () => {
    expect(videcomDate("2026-10-04")).toBe("4oct2026");
  });
});

describe("ValueJet", () => {
  const json = JSON.parse(fixture("valuejet-LOS-ABV.json"));

  it("groups fare classes per flight with totals including taxes", () => {
    const flights = parseValueJetSearch(json, "2026-10-24");
    expect(flights.map(f => f.flightNumber)).toEqual(["206", "214"]);
    expect(flights[1].fares[0]).toEqual({
      name: "ValueLite",
      cabin: "economy",
      price: 110500,
    });
    expect(flights[1].fares.at(-1)).toEqual({
      name: "ValuePremium",
      cabin: "premium",
      price: 240500,
    });
  });

  it("drops a fare class with no seats left", () => {
    const [f206] = parseValueJetSearch(json, "2026-10-24");
    expect(f206.fares.some(f => f.name === "ValueLite")).toBe(false);
  });
});

describe("Crane (Umza)", () => {
  it("reads the flight and its fare families", () => {
    const [f] = parseCraneResults(
      fixture("crane-umza-ABV-KAN.html"),
      "ABV",
      "KAN",
      "2026-10-24"
    );
    expect(f).toMatchObject({
      flightNumber: "UY-425",
      departure: "2026-10-24 09:50",
      arrival: "2026-10-24 10:50",
      stops: 0,
    });
    expect(f.fares).toEqual([
      { name: "FLEX ECONOMY", cabin: "economy", price: 134000 },
      { name: "FULL ECONOMY", cabin: "economy", price: 144000 },
    ]);
  });

  it("converts 12-hour times", () => {
    const [f] = parseCraneResults(
      fixture("crane-umza-ABV-MIU.html"),
      "ABV",
      "MIU",
      "2026-10-24"
    );
    expect(f.departure).toBe("2026-10-24 16:45");
  });
});

describe("helpers", () => {
  it("puts premium and business fares in their own cabin", () => {
    expect(cabinOf("Premium Economy")).toBe("premium");
    expect(cabinOf("Business")).toBe("premium");
    expect(cabinOf("ValueXtra")).toBe("economy");
  });

  it("resolves cities by name or airport code", () => {
    expect(resolveFlightCity("LOS")).toBe("lagos");
    expect(resolveFlightCity("Port Harcourt")).toBe("port-harcourt");
    expect(resolveFlightCity("Atlantis")).toBeNull();
  });
});
