import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/itinerary-okota-owerri.json";
import { parseInertiaPage, parseItinerary, parseRoutes } from "./client";
import { nearestTerminals } from "./terminals";

describe("parseItinerary", () => {
  // Real /itinerary response for Okota (Cele) → Owerri, captured 2026-10-14.
  const trips = parseItinerary(fixture, "18");

  it("returns every bus with GUO's fare", () => {
    expect(trips).toHaveLength(5);
    expect(trips.map(t => t.fare)).toEqual([48000, 66000, 48000, 48000, 35000]);
    expect(trips[1]).toMatchObject({
      vehicle: "SIENNA",
      departure: "2026-10-21 06:30",
      busFinalDestination: "OWERRI",
    });
  });

  it("applies the default online coupon like GUO's site (2% off)", () => {
    expect(trips[1].onlineFare).toBe(64680);
  });

  it("counts seats that are not blocked", () => {
    expect(trips[1]).toMatchObject({ seatsAvailable: 5, seatsTotal: 7 });
    expect(trips[4]).toMatchObject({ seatsAvailable: 33, seatsTotal: 33 });
  });

  it("flags buses that pass through the searched destination", () => {
    expect(trips.map(t => t.passesThrough)).toEqual([
      true,
      false,
      false,
      true,
      true,
    ]);
  });

  it("handles an empty schedule", () => {
    expect(parseItinerary({ schedule: { BusList: [] } }, "1")).toEqual([]);
  });
});

describe("parseInertiaPage / parseRoutes", () => {
  it("decodes the data-page attribute and drops placeholder entries", () => {
    const page = {
      component: "Index",
      props: {
        allRoutes: [
          {
            state_terminal: "Select Departure",
            LoadinID: "",
            destinations: [],
          },
          {
            LoadinID: "84",
            Loading_Office: "JIBOWU",
            state_name: "LAGOS",
            destinations: [
              { DestinationID: "", Destination: "Select Destination" },
              {
                DestinationID: "3",
                Destination: "ABUJA",
                MainTerminalID: "0",
                StateID: "9",
              },
            ],
          },
        ],
      },
    };
    const attr = JSON.stringify(page)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    const parsed = parseInertiaPage(`<div id="app" data-page="${attr}"></div>`);
    expect(parseRoutes(parsed.props.allRoutes)).toEqual([
      {
        terminalId: "84",
        terminalName: "JIBOWU",
        stateName: "LAGOS",
        destinations: [
          { id: "3", name: "ABUJA", stateId: "9", mainTerminalId: "0" },
        ],
      },
    ]);
  });
});

describe("nearestTerminals", () => {
  it("finds Jibowu first from Yaba, Lagos", () => {
    const [first] = nearestTerminals(6.5095, 3.3711, 3);
    expect(first.name).toBe("JIBOWU");
    expect(first.distanceKm).toBeLessThan(2);
  });

  it("uses corrected coordinates (Uyo is not placed at Aba)", () => {
    const [first] = nearestTerminals(5.0377, 7.9128, 1);
    expect(first.name).toBe("UYO");
  });
});
