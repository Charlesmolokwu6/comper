import { describe, expect, it } from "vitest";
import type { ComparedTrip } from "./api";
import { prettyVehicle, vehicleKind, vehicleOptions } from "./vehicles";

const t = (vehicle: string, fare: number, extra: Partial<ComparedTrip> = {}) =>
  ({
    vehicle,
    fare,
    soldOut: false,
    vehicleImage: null,
    ...extra,
  }) as ComparedTrip;

describe("vehicles", () => {
  it("tidies operator class names", () => {
    expect(prettyVehicle("HIACE ULTRA")).toBe("Hiace Ultra");
    expect(prettyVehicle("KINGLONG  BUS · Standard")).toBe(
      "Kinglong Bus · Standard"
    );
    expect(prettyVehicle("Super Executive")).toBe("Super Executive");
    expect(prettyVehicle("53-seat bus")).toBe("53-seat bus");
  });

  it("only names a vehicle type when the class name says so", () => {
    expect(vehicleKind("SIENNA")).toBe("car");
    expect(vehicleKind("HIACE ULTRA")).toBe("minibus");
    expect(vehicleKind("Sprinter Service")).toBe("minibus");
    expect(vehicleKind("14-seat bus")).toBe("minibus");
    expect(vehicleKind("53-seat bus")).toBe("coach");
    expect(vehicleKind("LUXURY")).toBe("coach");
    expect(vehicleKind("Super Executive")).toBeNull();
  });

  it("lists each class once with its cheapest bookable fare", () => {
    const opts = vehicleOptions([
      t("SIENNA", 90_000),
      t("HIACE", 50_000),
      t("HIACE", 45_000, { soldOut: true }),
      t("LUXURY", 70_000, { soldOut: true }),
      t("Sprinter Service", 60_000, { vehicleImage: "https://x/y.jpg" }),
    ]);
    expect(opts.map(o => [o.name, o.best?.fare ?? null, o.trips])).toEqual([
      ["Hiace", 50_000, 2],
      ["Sprinter Service", 60_000, 1],
      ["Sienna", 90_000, 1],
      ["Luxury", null, 1],
    ]);
    expect(opts[1].image).toBe("https://x/y.jpg");
  });
});
