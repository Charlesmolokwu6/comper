/**
 * Fare API, one shape for every operator.
 *
 *   GET /api/compare?from=Lagos&to=Abuja&date=YYYY-MM-DD   all live operators side by side
 *   GET /api/network                                        cities with live routes, for the pickers
 *   GET /api/cities                                         canonical city names
 *   GET /api/operators                                      live + excluded operators
 *   GET /api/operators/:op/origins
 *   GET /api/operators/:op/origins/:originId/destinations
 *   GET /api/operators/:op/fares?from=<originId>&to=<destinationId>&date=YYYY-MM-DD
 *   GET /api/fares/status                                   cache + last scrape
 */
import { Router } from "express";
import { getOperator, operators, unavailableOperators } from "../operators";
import { knownCities, resolveCity } from "./cities";
import { compare } from "./compare";
import { buildNetwork } from "./network";
import { lastScrape } from "./scheduler";
import {
  cacheStats,
  cachedNetwork,
  warmNetwork,
  daysFromToday,
  getDestinations,
  getFares,
  getOrigins,
  lagosDate,
} from "./store";

export const faresRouter = Router();

const COMPARE_WAIT_MS = Number(process.env.COMPARE_WAIT_MS || 8000);

function parseDate(raw: unknown): string | null {
  const date = String(raw ?? lagosDate(1));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
    return null;
  const days = daysFromToday(date);
  return days >= 0 && days <= 90 ? date : null;
}

const withCity = <T extends { name: string; state?: string }>(s: T) => ({
  ...s,
  ...resolveCity(s.name, s.state),
});

faresRouter.get("/compare", async (req, res) => {
  const from = resolveCity(String(req.query.from ?? ""));
  const to = resolveCity(String(req.query.to ?? ""));
  const date = parseDate(req.query.date);
  if (!from || !to)
    return res.status(400).json({
      error: "from and to are required city names, e.g. Lagos, Abuja",
    });
  if (from.city === to.city)
    return res.status(400).json({ error: "from and to are the same city" });
  if (!date)
    return res
      .status(400)
      .json({ error: "date must be YYYY-MM-DD, today to 90 days ahead" });
  const result = await compare(from.city, to.city, date, COMPARE_WAIT_MS);
  res.json({
    from: { query: req.query.from, city: from.city, name: from.cityName },
    to: { query: req.query.to, city: to.city, name: to.cityName },
    ...result,
  });
});

faresRouter.get("/network", (_req, res) => {
  const { complete, byOperator } = cachedNetwork();
  // Anything the snapshot/cache lacks is fetched in the background; clients re-poll.
  if (!complete) warmNetwork().catch(() => {});
  res.json({ complete, cities: buildNetwork(byOperator) });
});

faresRouter.get("/cities", (_req, res) => {
  res.json({ cities: knownCities });
});

faresRouter.get("/operators", (_req, res) => {
  res.json({
    operators: operators.map(o => ({
      id: o.id,
      name: o.name,
      website: o.website,
      maxDaysAhead: o.maxDaysAhead,
    })),
    unavailableOperators,
  });
});

faresRouter.get("/operators/:op/origins", async (req, res) => {
  if (!getOperator(req.params.op))
    return res.status(404).json({ error: "Unknown operator" });
  try {
    res.json({ origins: (await getOrigins(req.params.op)).map(withCity) });
  } catch (err: any) {
    res.status(502).json({ error: `Operator unavailable: ${err.message}` });
  }
});

faresRouter.get(
  "/operators/:op/origins/:originId/destinations",
  async (req, res) => {
    if (!getOperator(req.params.op))
      return res.status(404).json({ error: "Unknown operator" });
    try {
      const origins = await getOrigins(req.params.op);
      if (!origins.some(o => o.id === req.params.originId))
        return res.status(404).json({ error: "Unknown origin" });
      res.json({
        destinations: (
          await getDestinations(req.params.op, req.params.originId)
        ).map(withCity),
      });
    } catch (err: any) {
      res.status(502).json({ error: `Operator unavailable: ${err.message}` });
    }
  }
);

faresRouter.get("/operators/:op/fares", async (req, res) => {
  const op = getOperator(req.params.op);
  if (!op) return res.status(404).json({ error: "Unknown operator" });
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  const date = parseDate(req.query.date);
  if (!from || !to)
    return res.status(400).json({
      error: "from and to are required (IDs from /origins and /destinations)",
    });
  if (!date)
    return res
      .status(400)
      .json({ error: "date must be YYYY-MM-DD, today to 90 days ahead" });
  if (daysFromToday(date) > op.maxDaysAhead)
    return res.status(422).json({
      error: `${op.name} sells tickets up to ${op.maxDaysAhead} days ahead`,
    });
  try {
    // Only search pairs the operator actually lists (GUO answers unknown IDs with HTTP 500).
    const origin = (await getOrigins(op.id)).find(o => o.id === from);
    const dest =
      origin && (await getDestinations(op.id, from)).find(d => d.id === to);
    if (!origin || !dest)
      return res
        .status(404)
        .json({ error: `${op.name} does not run that route` });
    res.json({
      operatorName: op.name,
      currency: "NGN",
      from: withCity(origin),
      to: withCity(dest),
      ...(await getFares(op.id, from, to, date)),
    });
  } catch (err: any) {
    res.status(502).json({ error: `${op.name} unavailable: ${err.message}` });
  }
});

faresRouter.get("/fares/status", (_req, res) => {
  res.json({ ...cacheStats(), lastScrape: lastScrape() });
});
