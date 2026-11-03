import { describe, expect, it } from "vitest";
import { parkName, toTrip } from "./ysg";

describe("YSG parks", () => {
  it("names parks the way our city matcher reads them", () => {
    expect(
      parkName({ location: "Alaba", city: "Lagos", city_slug: "lagos" })
    ).toBe("Lagos - Alaba");
    expect(parkName({ location: "Aba 1", city: "Aba", city_slug: "aba" })).toBe(
      "Aba"
    );
    expect(
      parkName({
        location: "New Site Terminal",
        city: "Lagos",
        city_slug: "lagos",
      })
    ).toBe("Lagos - Maza Maza (New Site)");
    expect(
      parkName({ location: "Onitsha", city: "Onitsha", city_slug: "onitsha" })
    ).toBe("Onitsha - Upper Iweka");
    expect(
      parkName({ location: "Igoli", city: "ogoja", city_slug: "ogoja" })
    ).toBe("Ogoja - Igoli");
  });
});

describe("YSG trips", () => {
  it("uses the price TripEase sells at, with the park address, and no seat counts", () => {
    const t = toTrip(
      {
        fare_id: 612,
        bus_type: "Luxurious",
        departure_time: "06:00 AM",
        price: 32500,
        net_price: 30500,
        seats_total: 63,
        seats_available: 63,
        departure_route: { terminal: "25,  Ojo Igbede Road,  Ojo Alaba" },
      },
      "2026-11-10"
    );
    expect(t).toMatchObject({
      id: "612",
      departure: "2026-11-10 06:00",
      vehicle: "Luxurious",
      fare: 32500,
      seatsAvailable: null,
      notes: ["Park: 25, Ojo Igbede Road, Ojo Alaba"],
    });
  });
});
