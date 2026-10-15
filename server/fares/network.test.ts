import { describe, expect, it } from "vitest";
import { buildNetwork } from "./network";

describe("buildNetwork", () => {
  it("groups operators' terminals into cities", () => {
    const net = buildNetwork([
      {
        operator: "guo",
        origins: [
          { id: "84", name: "JIBOWU" },
          { id: "23", name: "MAZA MAZA" },
        ],
        destinations: {
          "84": [
            { id: "3", name: "ABUJA" },
            { id: "9", name: "ENUGU" },
            { id: "x", name: "RESCHEDULE MY TRIP" },
          ],
          "23": [{ id: "m", name: "ABUJA - MARARABA" }],
        },
      },
      {
        operator: "pmt",
        origins: [{ id: "3", name: "Lagos - Mazamaza Terminal" }],
        destinations: { "3": [{ id: "14", name: "Abuja-Mararaba Terminal" }] },
      },
    ]);
    expect(net).toHaveLength(1);
    const lagos = net[0];
    expect(lagos).toMatchObject({
      city: "lagos",
      name: "Lagos",
      operators: ["guo", "pmt"],
    });
    expect(lagos.places.some(p => p.name === "Yaba")).toBe(true);
    expect(lagos.destinations).toEqual([
      // GUO also reaches Abuja exactly (Jibowu → ABUJA), so the city isn't flagged.
      {
        city: "abuja",
        name: "Abuja",
        operators: ["guo", "pmt"],
        approximate: false,
      },
      { city: "enugu", name: "Enugu", operators: ["guo"], approximate: false },
    ]);
  });

  it("flags a destination reached only via approximate stops", () => {
    const [lagos] = buildNetwork([
      {
        operator: "pmt",
        origins: [{ id: "3", name: "Lagos - Mazamaza Terminal" }],
        destinations: { "3": [{ id: "14", name: "Abuja-Mararaba Terminal" }] },
      },
    ]);
    expect(lagos.destinations[0]).toMatchObject({
      city: "abuja",
      approximate: true,
    });
  });

  it("omits origins whose route list hasn't loaded", () => {
    expect(
      buildNetwork([
        {
          operator: "abc",
          origins: [{ id: "56", name: "Lagos Jibowu" }],
          destinations: {},
        },
      ])
    ).toEqual([]);
  });
});
