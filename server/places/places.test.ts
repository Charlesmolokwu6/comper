import { describe, expect, it } from "vitest";
import { knownMatches, toPlaces } from "./router";

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
