import { describe, expect, it } from "vitest";
import type { ComparedFlight, FlightFare } from "./api";
import { cheapestInCabin, groupFlights } from "./flights";

const fare = (
  name: string,
  price: number,
  cabin: "economy" | "premium" = "economy"
): FlightFare => ({ name, price, cabin });
const flight = (
  airline: string,
  departure: string,
  fares: FlightFare[]
): ComparedFlight =>
  ({
    airline,
    airlineName: airline.toUpperCase(),
    website: "",
    flightNumber: `${airline}-${departure}`,
    departure: `2026-10-24 ${departure}`,
    arrival: `2026-10-24 ${departure}`,
    fares,
    soldOut: fares.length === 0,
  }) as ComparedFlight;

describe("groupFlights", () => {
  const flights = [
    flight("un", "07:00", [
      fare("Saver", 115_500),
      fare("Premium", 295_500, "premium"),
    ]),
    flight("un", "18:00", [fare("Promo", 105_500)]),
    flight("vj", "11:40", [fare("ValueSaver", 180_500)]),
    flight("max", "09:25", []),
  ];

  it("ranks airlines by their cheapest fare in the cabin", () => {
    const g = groupFlights(flights, "economy");
    expect(g.map(x => [x.airline, x.best?.price ?? null])).toEqual([
      ["un", 105_500],
      ["vj", 180_500],
      ["max", null],
    ]);
    expect(g[0].rows.map(r => r.flight.departure.slice(11))).toEqual([
      "07:00",
      "18:00",
    ]);
  });

  it("shows only the fares of the chosen cabin", () => {
    const g = groupFlights(flights, "premium");
    expect(g.map(x => x.airline)).toEqual(["un"]);
    expect(g[0].rows[0].fares).toEqual([fare("Premium", 295_500, "premium")]);
  });

  it("finds each tab's cheapest fare", () => {
    expect(cheapestInCabin(flights, "economy")).toBe(105_500);
    expect(cheapestInCabin(flights, "premium")).toBe(295_500);
  });
});
