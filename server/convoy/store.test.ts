import { beforeEach, describe, expect, it } from "vitest";
import {
  _reset,
  createConvoy,
  getConvoy,
  joinConvoy,
  leave,
  LIMITS,
  publicView,
  reportPosition,
} from "./store";

beforeEach(() => _reset());

describe("convoys", () => {
  it("lets the leader and followers report positions; others see names, not keys", () => {
    const { convoy, member: lead } = createConvoy(
      "To the wedding",
      "Chidi",
      1000
    );
    const f = joinConvoy(convoy.id, "Tunde", 2000);
    reportPosition(convoy.id, lead.id, lead.key, { lat: 6.5, lon: 3.4 }, 5000);
    reportPosition(
      convoy.id,
      f.id,
      f.key,
      { lat: 6.49, lon: 3.39, accuracy: 12.4 },
      6000
    );
    const v = publicView(getConvoy(convoy.id, 7000), 7000);
    expect(v.title).toBe("To the wedding");
    expect(v.members.map(m => [m.name, m.role, m.position?.lat])).toEqual([
      ["Chidi", "leader", 6.5],
      ["Tunde", "follower", 6.49],
    ]);
    expect(JSON.stringify(v)).not.toContain(lead.key);
  });
  it("refuses positions without the right key", () => {
    const { convoy, member } = createConvoy("", "Chidi");
    expect(() =>
      reportPosition(convoy.id, member.id, "wrong", { lat: 6, lon: 3 })
    ).toThrow(/Not allowed/);
  });
  it("ends when the leader ends it, or goes quiet", () => {
    const a = createConvoy("", "A");
    expect(leave(a.convoy.id, a.member.id, a.member.key)).toBe("ended");
    expect(() => getConvoy(a.convoy.id)).toThrow(/ended/);
    const b = createConvoy("", "B", 0);
    expect(() => getConvoy(b.convoy.id, LIMITS.leaderQuietMs + 1)).toThrow(
      /ended/
    );
  });
  it("ignores positions sent faster than every few seconds", () => {
    const { convoy, member } = createConvoy("", "A", 0);
    reportPosition(
      convoy.id,
      member.id,
      member.key,
      { lat: 6, lon: 3 },
      10_000
    );
    reportPosition(
      convoy.id,
      member.id,
      member.key,
      { lat: 7, lon: 3 },
      11_000
    );
    expect(getConvoy(convoy.id, 11_000).members[0].position?.lat).toBe(6);
  });
});
