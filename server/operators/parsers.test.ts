import { describe, expect, it } from "vitest";
import { to24h } from "./http";
import { findActionIds, parseActionResponse, parseTerminals } from "./okeyson";
import { parsePmtHome } from "./pmt";

describe("to24h", () => {
  it("handles the formats operators use", () => {
    expect(to24h("6:00 AM")).toBe("06:00");
    expect(to24h("06:30 PM")).toBe("18:30");
    expect(to24h("12:15 AM")).toBe("00:15");
    expect(to24h("18:00:00")).toBe("18:00");
  });
});

describe("PMT home page", () => {
  it("extracts the CSRF token, departure terminals and route map", () => {
    const html = `
      <meta name="csrf-token" content="tok123">
      <select name="from" required><option value="">Choose</option>
        <option value="15">Lagos - Jibowu Terminal</option><option value="3">Lagos - Mazamaza Terminal</option></select>
      <script>const destinationsByOrigin = {"3":[{"id":14,"name":"Abuja-Mararaba Terminal"}],"15":[]};</script>`;
    expect(parsePmtHome(html)).toEqual({
      csrf: "tok123",
      origins: [
        { id: "15", name: "Lagos - Jibowu Terminal" },
        { id: "3", name: "Lagos - Mazamaza Terminal" },
      ],
      routes: { "3": [{ id: 14, name: "Abuja-Mararaba Terminal" }], "15": [] },
    });
  });
});

describe("Okeyson", () => {
  it("reads terminals from the RSC payload", () => {
    const rsc = JSON.stringify(
      `6:{"data":{"getTerminals":[{"id":"b452","name":"Jibowu","address":null},{"id":"c52f","name":"Enugu","address":{"state":"Enugu"}}]}}`
    );
    const html = `<script>self.__next_f.push([1,${rsc}])</script>`;
    expect(parseTerminals(html)).toEqual([
      { id: "b452", name: "Jibowu", state: undefined },
      { id: "c52f", name: "Enugu", state: "Enugu" },
    ]);
  });

  it("finds Server Action IDs by name in a JS chunk", () => {
    const js =
      'let a=(0,r.createServerReference)("7f03c9c4cdf7403800f7e39525d5710406e04d6ad4",t.callServer,void 0,t.findSourceMapURL,"getAvailabilityQuery"),' +
      'b=(0,r.createServerReference)("607ea4548e640287a3dac148aa302f43f3774aeb46",m.callServer,void 0,m.findSourceMapURL,"findTerminalQuery"),' +
      'c=(0,r.createServerReference)("00cd775e6f5f157f482f9c27cd509fddd0dee9aba8",t.callServer,void 0,t.findSourceMapURL,"destroyBookingSession")';
    expect(findActionIds(js)).toEqual({
      getAvailabilityQuery: "7f03c9c4cdf7403800f7e39525d5710406e04d6ad4",
      findTerminalQuery: "607ea4548e640287a3dac148aa302f43f3774aeb46",
    });
  });

  it("resolves React's de-duplicated object references", () => {
    const text =
      '0:{"a":"$@1"}\n' +
      '1:{"data":{"s":[{"trip":{"vc":{"name":"Luxurious"}}},{"trip":{"vc":"$1:data:s:0:trip:vc"}}],"label":"$$5 off"},"error":null}\n';
    const { data } = parseActionResponse(text);
    expect(data.s[1].trip.vc).toEqual({ name: "Luxurious" });
    expect(data.label).toBe("$5 off");
  });

  it("picks the result row out of a Server Action response", () => {
    const text = `0:{"a":"$@1","f":"","b":"x"}\n1:{"data":null,"error":"Forbidden resource"}\n`;
    expect(parseActionResponse(text)).toEqual({
      data: null,
      error: "Forbidden resource",
    });
  });
});
