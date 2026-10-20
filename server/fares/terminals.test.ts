import { describe, expect, it } from "vitest";
import { splitPlace, terminalOf } from "./terminals";

describe("terminals", () => {
  it("names terminals the way travellers do, merging operators' spellings", () => {
    expect(terminalOf({ id: "1", name: "Lagos (Alafia 2--am)" }, {})).toEqual({
      key: "alafia2",
      name: "Alafia 2",
    });
    expect(terminalOf({ id: "2", name: "MAZAMAZA" }, {}).name).toBe(
      "Maza Maza"
    );
    expect(terminalOf({ id: "3", name: "x" }, { area: "maza maza" }).key).toBe(
      "mazamaza"
    );
    expect(
      terminalOf({ id: "4", name: "UPPER IWEKA" }, { area: "upper iweka" })
    ).toEqual({ key: "upperiweka", name: "Upper Iweka" });
  });

  it("reads an optional terminal after the city", () => {
    expect(splitPlace("lagos~ajah")).toEqual({
      city: "lagos",
      terminal: "ajah",
    });
    expect(splitPlace("lagos")).toEqual({ city: "lagos", terminal: null });
    expect(splitPlace("lagos~<bad>")).toEqual({
      city: "lagos",
      terminal: null,
    });
  });
});
