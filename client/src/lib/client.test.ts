import { describe, expect, it } from "vitest";
import type { Coverage } from "./api";
import {
  formatAge,
  formatDay,
  formatNaira,
  formatSeats,
  formatTime,
  lagosDate,
} from "./format";
import { POLL_MAX_MS, shouldPoll } from "./polling";

const cov = (status: Coverage["status"]): Coverage => ({
  operator: "x",
  operatorName: "X",
  status,
  routesFound: 0,
  routesSearched: 0,
  routesChecked: 0,
});

describe("shouldPoll", () => {
  it("polls while any operator is pending", () => {
    expect(shouldPoll([cov("fares"), cov("pending")], 0, 10_000)).toBe(true);
  });
  it("stops when nothing is pending", () => {
    expect(
      shouldPoll([cov("fares"), cov("error"), cov("no_route")], 0, 10_000)
    ).toBe(false);
  });
  it("stops after the time limit even if operators are still pending", () => {
    expect(shouldPoll([cov("pending")], 0, POLL_MAX_MS)).toBe(false);
  });
});

describe("format", () => {
  it("formats naira without decimals", () => {
    expect(formatNaira(54880)).toBe("₦54,880");
  });
  it("formats departure time and day", () => {
    expect(formatTime("2026-10-17 06:30")).toBe("6:30am");
    expect(formatTime("2026-10-17 19:05")).toBe("7:05pm");
    expect(formatTime("2026-10-17 00:15")).toBe("12:15am");
    expect(formatTime("2026-10-17 12:00")).toBe("12:00pm");
    expect(formatDay("2026-10-17")).toBe("Sat 17 Oct");
  });
  it("uses Lagos time for today", () => {
    // 23:30 UTC on 16 Oct is 00:30 on 17 Oct in Lagos.
    expect(lagosDate(0, Date.parse("2026-10-16T23:30:00Z"))).toBe("2026-10-17");
  });
  it("formats ages and seat counts", () => {
    expect(
      formatAge("2026-10-17T00:00:00Z", Date.parse("2026-10-17T03:10:00Z"))
    ).toBe("3 h ago");
    expect(formatSeats(1)).toBe("1 seat available");
    expect(formatSeats(null)).toBeNull();
  });
});

import { prettyStop, sentenceCase } from "./format";

describe("prettyStop", () => {
  it("cleans operator terminal labels for display", () => {
    expect(prettyStop("Lagos (Empire--am)")).toBe("Empire");
    expect(prettyStop("Anambra-Onitsha----am")).toBe("Onitsha");
    expect(prettyStop("Lagos (Maza-Maza Local----pm)")).toBe("Maza-Maza Local");
    expect(prettyStop("ABUJA - UTAKO")).toBe("Utako");
    expect(prettyStop("Lagos - Jibowu Terminal")).toBe("Jibowu");
    expect(prettyStop("PH-Portharcourt Terminal")).toBe("Portharcourt");
    expect(prettyStop("JIBOWU")).toBe("Jibowu");
    expect(prettyStop("ABUJA")).toBe("Abuja");
  });
  it("keeps names whose first part is not a state or city prefix", () => {
    expect(prettyStop("OKOTA (CELE)")).toBe("Okota (Cele)");
    expect(prettyStop("IFITE-AWKA")).toBe("Ifite-Awka");
    expect(prettyStop("Mazamaza/First Gate")).toBe("Mazamaza/First Gate");
  });
  it("sentence-cases shouty notes only", () => {
    expect(sentenceCase("LUGGAGE ALLOWED PER PAX (0 -10kg)")).toBe(
      "Luggage allowed per pax (0 -10kg)"
    );
    expect(sentenceCase("LUGGAGE ALLOWED")).toBe("Luggage allowed");
    expect(sentenceCase("Service: X")).toBe("Service: X");
  });
});
