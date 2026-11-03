import { describe, expect, it } from "vitest";
import { pinPath, readPin } from "./pins";

describe("pin links", () => {
  it("round-trip a pin through its link", () => {
    const path = pinPath({
      lat: 6.447512,
      lon: 3.472844,
      name: "Ade's house",
      note: "Blue gate, opposite the church",
      expires: 1_800_000_000_000,
    });
    const pin = readPin(path.split("?")[1]);
    expect(pin).toEqual({
      lat: 6.44751,
      lon: 3.47284,
      name: "Ade's house",
      address: undefined,
      note: "Blue gate, opposite the church",
      expires: 1_800_000_000_000 - (1_800_000_000_000 % 60_000),
    });
  });
  it("rejects links without a point", () => {
    expect(readPin("n=Home")).toBeNull();
    expect(readPin("ll=abc,def")).toBeNull();
  });
});
