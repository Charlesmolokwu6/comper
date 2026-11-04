/**
 * Live convoys ("follow the leader"). Only each car's latest position is kept, in memory:
 * nothing is written to disk, a convoy is deleted when the leader ends it, after an hour
 * with no news from the leader, or 12 hours after it started. A restart of the server
 * ends every convoy.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";

export const LIMITS = {
  convoys: 500,
  members: 20,
  /** A convoy ends this long after it starts. */
  lifeMs: 12 * 3600_000,
  /** …or this long after the leader last sent a position. */
  leaderQuietMs: 3600_000,
  /** Positions closer together than this are ignored (phones send many). */
  minGapMs: 3_000,
};

export interface Position {
  lat: number;
  lon: number;
  /** Metres. */
  accuracy: number | null;
  at: number;
}

export interface Member {
  id: string;
  name: string;
  role: "leader" | "follower";
  key: string;
  joinedAt: number;
  position: Position | null;
}

export interface Convoy {
  id: string;
  title: string;
  createdAt: number;
  members: Member[];
}

const convoys = new Map<string, Convoy>();

const token = (bytes: number) => randomBytes(bytes).toString("base64url");
const clean = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, max);

export class ConvoyError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function sweep(now = Date.now()) {
  for (const [id, c] of Array.from(convoys)) if (ended(c, now)) convoys.delete(id);
}

function ended(c: Convoy, now = Date.now()) {
  if (now - c.createdAt > LIMITS.lifeMs) return true;
  const leader = c.members.find(m => m.role === "leader");
  const last = leader?.position?.at ?? c.createdAt;
  return now - last > LIMITS.leaderQuietMs;
}

export function createConvoy(
  title: unknown,
  leaderName: unknown,
  now = Date.now()
) {
  sweep(now);
  if (convoys.size >= LIMITS.convoys)
    throw new ConvoyError(503, "Too many convoys right now; try again later");
  const name = clean(leaderName, 40) || "Leader";
  const leader: Member = {
    id: token(6),
    name,
    role: "leader",
    key: token(18),
    joinedAt: now,
    position: null,
  };
  const c: Convoy = {
    id: token(8),
    title: clean(title, 60) || `${name}'s convoy`,
    createdAt: now,
    members: [leader],
  };
  convoys.set(c.id, c);
  return { convoy: c, member: leader };
}

export function getConvoy(id: string, now = Date.now()) {
  const c = convoys.get(id);
  if (!c || ended(c, now)) {
    if (c) convoys.delete(id);
    throw new ConvoyError(404, "This convoy has ended");
  }
  return c;
}

export function joinConvoy(id: string, name: unknown, now = Date.now()) {
  const c = getConvoy(id, now);
  if (c.members.length >= LIMITS.members)
    throw new ConvoyError(
      409,
      `A convoy can have up to ${LIMITS.members} cars`
    );
  const m: Member = {
    id: token(6),
    name: clean(name, 40) || `Car ${c.members.length + 1}`,
    role: "follower",
    key: token(18),
    joinedAt: now,
    position: null,
  };
  c.members.push(m);
  return m;
}

function member(c: Convoy, memberId: string, key: unknown) {
  const m = c.members.find(x => x.id === memberId);
  const k = Buffer.from(String(key ?? ""));
  const want = Buffer.from(m?.key ?? "");
  if (!m || k.length !== want.length || !timingSafeEqual(k, want))
    throw new ConvoyError(403, "Not allowed");
  return m;
}

export function reportPosition(
  id: string,
  memberId: string,
  key: unknown,
  p: { lat: unknown; lon: unknown; accuracy?: unknown },
  now = Date.now()
) {
  const c = getConvoy(id, now);
  const m = member(c, memberId, key);
  const lat = Number(p.lat);
  const lon = Number(p.lon);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new ConvoyError(400, "lat and lon must be a point");
  if (m.position && now - m.position.at < LIMITS.minGapMs) return m.position;
  const acc = Number(p.accuracy);
  m.position = {
    lat: Math.round(lat * 1e5) / 1e5,
    lon: Math.round(lon * 1e5) / 1e5,
    accuracy: Number.isFinite(acc) ? Math.round(acc) : null,
    at: now,
  };
  return m.position;
}

/** Leave (a follower) or end the convoy (the leader). */
export function leave(id: string, memberId: string, key: unknown) {
  const c = getConvoy(id);
  const m = member(c, memberId, key);
  if (m.role === "leader") convoys.delete(id);
  else c.members = c.members.filter(x => x.id !== m.id);
  return m.role === "leader" ? "ended" : "left";
}

/** What anyone with the link may see: names and latest positions, never keys. */
export function publicView(c: Convoy, now = Date.now()) {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    endsAt: Math.min(
      c.createdAt + LIMITS.lifeMs,
      (c.members.find(m => m.role === "leader")?.position?.at ?? c.createdAt) +
        LIMITS.leaderQuietMs
    ),
    now,
    members: c.members.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      position: m.position,
    })),
  };
}

/** For tests. */
export const _reset = () => convoys.clear();
