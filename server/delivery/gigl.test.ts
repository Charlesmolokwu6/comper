import { describe, expect, it } from "vitest";
import { parseQuote, parseStations } from "./gigl";

describe("gigl", () => {
  it("keeps Nigerian states only, once each, with readable names", () => {
    const list = parseStations({
      Object: [
        { StationId: 4, StationName: "LAGOS" },
        { StationId: 3, StationName: "FEDERAL CAPITAL TERRITORY" },
        { StationId: 60, StationName: "GREATER ACCRA REGION" },
        { StationId: 30, StationName: "AKWA IBOM" },
        { StationId: 99, StationName: "LAGOS" },
      ],
    });
    expect(list).toEqual([
      { id: 3, name: "Abuja (FCT)" },
      { id: 30, name: "Akwa Ibom" },
      { id: 4, name: "Lagos" },
    ]);
  });

  it("reads the delivery price and refuses a missing one", () => {
    expect(
      parseQuote({ Code: "200", Object: { DeliveryPrice: 12306.0 } })
    ).toBe(12306);
    expect(
      parseQuote({ Code: "200", Object: { DeliveryPrice: 0 } })
    ).toBeNull();
    expect(parseQuote({ Code: "404", Object: null })).toBeNull();
  });
});
