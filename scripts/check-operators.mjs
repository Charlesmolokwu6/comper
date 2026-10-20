/**
 * Daily health check of the live site (GitHub Actions: .github/workflows/operator-check.yml).
 * Asks the site for real prices on busy routes and fails, so GitHub emails the owner, when a
 * bus company, the airlines or GIG Logistics stop returning prices. No credentials needed:
 * it only uses the site's own public API.
 *
 *   SITE_URL=https://compare-6ze8.onrender.com node scripts/check-operators.mjs
 */
import { appendFileSync } from "node:fs";

const BASE = (
  process.env.SITE_URL || "https://compare-6ze8.onrender.com"
).replace(/\/+$/, "");
const BUS_ROUTES = [
  ["lagos", "abuja"],
  ["onitsha", "lagos"],
  ["lagos", "enugu"],
];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(path, timeoutMs = 90_000) {
  const r = await fetch(BASE + path, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CompareNG-healthcheck",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(body?.error ?? `HTTP ${r.status} for ${path}`);
  return body;
}

/** The free plan sleeps; give it a few minutes to wake. */
async function wake() {
  for (let i = 0; i < 20; i++) {
    try {
      await get("/api/fares/status", 30_000);
      return;
    } catch {
      await sleep(15_000);
    }
  }
  throw new Error(`${BASE} didn't answer for 5 minutes`);
}

/** A date two days ahead in Lagos, inside every operator's sales window. */
function soon() {
  const d = new Date(Date.now() + 3600_000 + 2 * 86400_000);
  return d.toISOString().slice(0, 10);
}

/** Compare answers early with "pending" operators; ask again until they've all answered. */
async function busCompare(from, to, date) {
  let res;
  for (let i = 0; i < 12; i++) {
    res = await get(`/api/compare?${new URLSearchParams({ from, to, date })}`);
    if (!res.coverage.some(c => c.status === "pending")) break;
    await sleep(20_000);
  }
  return res;
}

const problems = [];
const lines = [`Checked ${BASE} for ${soon()}`, ""];

await wake();
const date = soon();

// Bus: each operator must return fares on at least one route it runs.
const ops = new Map();
for (const [from, to] of BUS_ROUTES) {
  const res = await busCompare(from, to, date);
  lines.push(`Bus ${from} → ${to}: ${res.trips.length} trips`);
  for (const c of res.coverage) {
    const o = ops.get(c.operator) ?? { name: c.operatorName, seen: [] };
    o.seen.push(
      `${from}→${to}: ${c.status}${c.message ? ` (${c.message.slice(0, 120)})` : ""}`
    );
    o.ok ||=
      c.status === "fares" ||
      c.status === "no_trips" ||
      c.status === "not_on_sale";
    o.runs ||= c.status !== "no_route";
    ops.set(c.operator, o);
  }
}
for (const o of ops.values()) {
  if (o.runs && !o.ok)
    problems.push(
      `${o.name}: no prices on any route\n    ${o.seen.join("\n    ")}`
    );
}

// Flights: at least one airline with flights, and none erroring.
const flights = await get(
  `/api/flights/compare?${new URLSearchParams({ from: "lagos", to: "abuja", date })}`
);
lines.push(`Flights lagos → abuja: ${flights.flights.length} flights`);
if (!flights.flights.length)
  problems.push("Flights: no airline returned Lagos → Abuja flights");
for (const c of flights.coverage)
  if (c.status === "error")
    problems.push(`${c.operatorName}: ${c.message ?? "error"}`);

// Delivery: GIG Logistics, Lagos → Abuja, 2 kg.
const delivery = await get(
  "/api/delivery/quote?from=4&to=3&weight=2&value=10000"
);
for (const c of delivery.couriers) {
  lines.push(
    `Delivery ${c.name}: ${c.status === "price" ? `₦${c.price}` : c.status}`
  );
  if (c.status !== "price")
    problems.push(`${c.name}: ${c.message ?? "no price"}`);
}

lines.push(
  "",
  problems.length ? "PROBLEMS:" : "All operators returned prices."
);
lines.push(...problems.map(p => `- ${p}`));
const report = lines.join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, "```\n" + report + "\n```\n");
process.exit(problems.length ? 1 : 0);
