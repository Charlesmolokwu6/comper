import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, rateLimit } from "./security";

const call = (mw: any, ip = "1.2.3.4") => {
  let status = 200;
  let nextCalled = false;
  const res: any = {
    setHeader() {},
    status(s: number) {
      status = s;
      return this;
    },
    json() {
      return this;
    },
  };
  mw({ ip, method: "GET", path: "/" }, res, () => (nextCalled = true));
  return nextCalled ? 200 : status;
};

describe("rateLimit", () => {
  it("lets a visitor through up to the limit, then answers 429", () => {
    const mw = rateLimit({ name: "t", windowMs: 60_000, max: 3 });
    expect([call(mw), call(mw), call(mw), call(mw)]).toEqual([
      200, 200, 200, 429,
    ]);
    // Someone else isn't affected.
    expect(call(mw, "5.6.7.8")).toBe(200);
  });
});

describe("contentSecurityPolicy", () => {
  it("blocks framing and inline scripts, and allows the map and Shipbubble", () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toMatch(/script-src 'self' https:\/\/cloud\.umami\.is(;|$)/);
    expect(csp).toContain("https://tiles.openfreemap.org");
    expect(csp).toContain("frame-src https://shipbubble.com");
  });
});
