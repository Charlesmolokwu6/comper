import { abc } from "./abc";
import { chisco } from "./chisco";
import { guo } from "./guo";
import { okeyson } from "./okeyson";
import { pmt } from "./pmt";
import type { Operator, UnavailableOperator } from "./types";

/** Operators with verified live fares over plain HTTP. */
export const operators: Operator[] = [guo, abc, chisco, pmt, okeyson];

export const getOperator = (id: string) => operators.find(o => o.id === id);

/** Investigated but excluded; they never appear in fare results. */
export const unavailableOperators: UnavailableOperator[] = [
  {
    id: "libra",
    name: "Libra Motors (LIBMOT)",
    website: "https://www.libmot.com",
    reason:
      "Fare search (api.libmot.com/api/booking/searchdetails) requires a bearer token obtained by logging in to api/Token with a username/password embedded in libmot.com's JavaScript. Not used without the operator's permission.",
  },
  {
    id: "gigm",
    name: "GIGM (GIG Mobility)",
    website: "https://gigm.com",
    reason:
      "Fare search (booking.gigmobility2.com/apiV2/Booking/availabletripdetails) returns 401 without a bearer token; the site obtains one with service-account credentials embedded in its JavaScript (and AES-encrypts login payloads). Not used without the operator's permission.",
  },
];

export type { Operator, Stop, Trip } from "./types";
export { NotOnSaleError } from "./types";
