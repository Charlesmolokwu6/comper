import { describe, expect, it } from "vitest";
import { parseRates } from "./shipbubble";

describe("parseRates", () => {
  it("lists couriers cheapest first and drops ones without a price", () => {
    const json = {
      status: "success",
      data: {
        all_couriers: [
          {
            courier_name: "Dellyman",
            service_code: "dellyman",
            rate_card_amount: 3421,
            service_type: "pickup",
            delivery_eta: "Within 2 - 3 working days",
          },
          {
            courier_name: "Fez (Self Pick-up)",
            service_code: "fez_dropoff",
            rate_card_amount: 2003,
            service_type: "dropoff",
            delivery_eta: "24 Hours after logistics pickup",
          },
          { courier_name: "Broken", rate_card_amount: null },
        ],
      },
    };
    expect(parseRates(json)).toEqual([
      {
        id: "fez_dropoff",
        name: "Fez (Self Pick-up)",
        price: 2003,
        deliveryEta: "24 Hours after logistics pickup",
        pickup: false,
      },
      {
        id: "dellyman",
        name: "Dellyman",
        price: 3421,
        deliveryEta: "Within 2 - 3 working days",
        pickup: true,
      },
    ]);
  });
  it("is empty for an error response", () => {
    expect(parseRates({ status: "failed" })).toEqual([]);
  });
});
