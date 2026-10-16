import { describe, expect, it } from "vitest";
import { uberLink } from "./cab";

describe("uberLink", () => {
  const drop = {
    name: "Murtala Muhammed Airport",
    address: "Ikeja, Lagos",
    lat: 6.577,
    lon: 3.321,
  };

  it("sets pickup and drop-off as Uber's location objects", () => {
    const url = new URL(
      uberLink({ name: "Yaba", lat: 6.509, lon: 3.371 }, drop)
    );
    expect(url.origin + url.pathname).toBe("https://m.uber.com/looking");
    expect(JSON.parse(url.searchParams.get("pickup")!)).toEqual({
      latitude: 6.509,
      longitude: 3.371,
      addressLine1: "Yaba",
      addressLine2: "",
    });
    expect(JSON.parse(url.searchParams.get("drop[0]")!).addressLine1).toBe(
      "Murtala Muhammed Airport"
    );
  });

  it("lets Uber use the rider's own location when pickup is GPS", () => {
    const url = new URL(
      uberLink({ name: "Your location", lat: 6.5, lon: 3.3, gps: true }, drop)
    );
    expect(url.searchParams.has("pickup")).toBe(false);
  });
});
