import type { UnavailableOperator } from "../operators/types";
import { craneAirline } from "./crane";
import type { Airline } from "./types";
import { valuejet } from "./valuejet";
import { videcomAirline } from "./videcom";

export const airlines: Airline[] = [
  videcomAirline({
    id: "unitednigeria",
    name: "United Nigeria",
    website: "https://flyunitednigeria.com",
    base: "https://booking.flyunitednigeria.com",
    airports: [
      "LOS",
      "ABV",
      "PHC",
      "KAN",
      "ENU",
      "QOW",
      "ABB",
      "BNI",
      "ANA",
      "EKK",
      "ILR",
      "QRW",
      "BIA",
      "SKO",
    ],
  }),
  valuejet,
  videcomAirline({
    id: "maxair",
    name: "Max Air",
    website: "https://www.maxair.com.ng",
    base: "https://customer2.videcom.com/MaxAir",
    airports: ["LOS", "ABV", "PHC", "KAN", "BCU", "DKA", "KEB", "MIU", "YOL"],
  }),
  videcomAirline({
    id: "ranoair",
    name: "Rano Air",
    website: "https://www.ranoair.com",
    base: "https://customer3.videcom.com/RanoAir",
    airports: [
      "LOS",
      "ABV",
      "KAN",
      "BCU",
      "DKA",
      "GMO",
      "KAD",
      "MIU",
      "QRW",
      "SKO",
    ],
  }),
  craneAirline({
    id: "umza",
    name: "Umza Air",
    website: "https://www.umzaair.com",
    base: "https://book-umz.crane.aero",
    airports: ["ABV", "NBK", "GMO", "ILR", "KAN", "MIU", "SKO", "YOL"],
  }),
];

const BLOCKED =
  "Their booking site puts every search behind a captcha. Getting past it would mean " +
  "working around their bot protection, which we don't do without their permission. " +
  "This says nothing about their routes or prices.";

export const unavailableAirlines: UnavailableOperator[] = [
  {
    id: "airpeace",
    name: "Air Peace",
    website: "https://flyairpeace.com",
    reason: BLOCKED,
  },
  {
    id: "ibomair",
    name: "Ibom Air",
    website: "https://www.ibomair.com",
    reason: BLOCKED,
  },
  {
    id: "arik",
    name: "Arik Air",
    website: "https://www.arikair.com",
    reason: BLOCKED,
  },
  {
    id: "overland",
    name: "Overland Airways",
    website: "https://www.overlandairways.com",
    reason: BLOCKED,
  },
];

export const getAirline = (id: string) => airlines.find(a => a.id === id);
