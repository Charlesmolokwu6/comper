import { describe, expect, it } from "vitest";
import { resolveCity } from "./cities";

const city = (label: string, state?: string) => resolveCity(label, state);

describe("resolveCity", () => {
  it("maps every operator's spelling of a Lagos terminal to Lagos", () => {
    for (const label of [
      "Lagos (Jibowu--am)", // Chisco
      "LAGOS - JIBOWU", // GUO destination
      "JIBOWU", // GUO terminal
      "Lagos Jibowu", // ABC
      "Lagos - Jibowu Terminal", // PMT
      "Jibowu", // Okeyson
      "Mazamaza/First Gate",
      "Lagos (Maza-Maza Int'l---am)",
      "OKOTA (CELE)",
    ])
      expect(city(label)?.city, label).toBe("lagos");
  });

  it("maps Port Harcourt variants", () => {
    for (const label of [
      "PH-Portharcourt Terminal",
      "Port-Harcourt",
      "Rivers (Mile 1-----am)",
      "PH Rumuodumaya",
      "Choba",
    ])
      expect(city(label)?.city, label).toBe("port-harcourt");
  });

  it("flags Mararaba as an approximate Abuja match, even when the label says Abuja", () => {
    for (const label of [
      "Abuja-Mararaba Terminal",
      "ABUJA - MARARABA",
      "Abuja (Maraba)",
      "MARARABA",
    ]) {
      const m = city(label)!;
      expect(m.city).toBe("abuja");
      expect(m.match, label).toBe("approximate");
      expect(m.note).toMatch(/Nasarawa/);
    }
    expect(city("Abuja (Utako----am)")?.match).toBe("exact");
  });

  it("does not merge different towns that share a word", () => {
    expect(city("AWKA-ETITI")?.city).toBe("awka-etiti");
    expect(city("Benin Republic-Cotonou----am")?.city).toBe("cotonou");
    expect(city("BENIN BYPASS")?.city).toBe("benin");
    expect(city("Abakaliki Terminal")?.city).toBe("abakaliki"); // not "aba"
  });

  it("uses the place in parentheses and flags conflicting labels", () => {
    const m = city("Abuja (Lokoja)")!;
    expect(m.city).toBe("lokoja");
    expect(m.match).toBe("approximate");
    // "Enugu" here is the state: no conflict to flag.
    expect(city("Enugu (Awka----Am)")).toMatchObject({
      city: "awka",
      match: "exact",
    });
  });

  it("falls back to the state only for Lagos/FCT districts", () => {
    expect(city("Anthony", "Lagos")?.city).toBe("lagos");
    expect(city("Epe Jnc", "Lagos")?.match).toBe("approximate");
    expect(city("Awgu", "Enugu")).toMatchObject({
      city: "awgu",
      match: "unlisted",
    });
  });

  it("ranks the bare city name above districts and approximate areas", () => {
    const r = (l: string) => city(l)!.rank;
    expect(r("ABUJA")).toBeLessThan(r("ABUJA - UTAKO"));
    expect(r("ABUJA - UTAKO")).toBeLessThan(r("ABUJA - KUBWA"));
    expect(r("ABUJA - KUBWA")).toBeLessThan(r("ABUJA - MARARABA"));
  });

  it("skips non-places", () => {
    expect(city("RESCHEDULE MY TRIP")).toBeNull();
    expect(city("")).toBeNull();
  });

  it("records which district a stop is in, for locating it", () => {
    expect(city("Lagos (Jibowu--am)")?.area).toBe("jibowu");
    expect(city("LAGOS - CELE/OKOTA")?.area).toBeDefined();
    expect(city("Lagos Ajah")?.area).toBe("ajah");
    expect(city("ABUJA")?.area).toBeUndefined();
  });
});
