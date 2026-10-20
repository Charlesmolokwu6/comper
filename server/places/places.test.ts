import { describe, expect, it } from "vitest";
import { fromPhoton, knownMatches, toPlaces, toReverse } from "./router";

describe("places", () => {
  it("matches airports by any word typed, ignoring filler words", () => {
    expect(
      knownMatches("Murtala Muhammed International Airport")[0].name
    ).toMatch(/Murtala Muhammed International/);
    expect(knownMatches("mma2")[0].name).toBe("MMA2 Domestic Terminal");
    expect(knownMatches("abuja airport")[0].name).toMatch(/Nnamdi Azikiwe/);
  });

  it("matches known neighbourhoods", () => {
    expect(knownMatches("lekki").some(p => /Lekki/.test(p.name))).toBe(true);
  });

  it("reads OpenStreetMap results", () => {
    expect(
      toPlaces([
        {
          name: "Ikeja City Mall",
          display_name:
            "Ikeja City Mall, Obafemi Awolowo Way, Alausa, Ikeja, Lagos",
          lat: "6.61",
          lon: "3.35",
        },
      ])
    ).toEqual([
      {
        name: "Ikeja City Mall",
        address: "Obafemi Awolowo Way, Alausa, Ikeja",
        lat: 6.61,
        lon: 3.35,
      },
    ]);
  });
});

describe("toReverse", () => {
  it("names a GPS point by street, then area, town and state", () => {
    const json = {
      name: "Abiodun Ikomi Street",
      address: {
        road: "Abiodun Ikomi Street",
        suburb: "Chisco",
        town: "Lekki Phase I",
        county: "Eti Osa",
        state: "Lagos State",
      },
    };
    expect(toReverse(json, 6.4475, 3.474)).toEqual({
      name: "Abiodun Ikomi Street",
      area: "Chisco",
      address: "Chisco, Lekki Phase I, Lagos",
      lat: 6.4475,
      lon: 3.474,
    });
  });
  it("gives up when the point has no address", () => {
    expect(toReverse({ address: {} }, 6, 3)).toBeNull();
  });
});

describe("fromPhoton", () => {
  it("names a street result by its street", () => {
    const json = {
      features: [
        {
          properties: {
            type: "street",
            name: "Asa Street",
            district: "Maitama District",
            city: "Abuja",
            state: "Federal Capital Territory",
          },
        },
      ],
    };
    expect(fromPhoton(json, 9.07, 7.49)).toEqual({
      name: "Asa Street",
      area: "Maitama District",
      address: "Maitama District, Abuja, Federal Capital Territory",
      lat: 9.07,
      lon: 7.49,
    });
  });
  it("prefers the street over a shop's name", () => {
    const json = {
      features: [
        {
          properties: {
            type: "house",
            name: "Emirastouch Salon",
            street: "Admiralty Way",
            district: "Chisco",
            city: "Lekki Phase I",
            state: "Lagos",
          },
        },
      ],
    };
    expect(fromPhoton(json, 6.4, 3.4)?.name).toBe("Admiralty Way");
  });
});
