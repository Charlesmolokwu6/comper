import { Router } from "express";
import { getFares, getRoutes, lagosDate, status } from "./fareStore";
import { nearestTerminals, terminals } from "./terminals";

export const guoRouter = Router();

/** GET /api/guo/routes — bookable departure terminals and the destinations each serves. */
guoRouter.get("/routes", async (_req, res) => {
  try {
    res.json({ routes: await getRoutes() });
  } catch (err: any) {
    res.status(502).json({ error: `GUO unavailable: ${err.message}` });
  }
});

/**
 * GET /api/guo/fares?from=84&to=3&date=2026-10-20
 * `from` = terminal (loading office) ID, `to` = destination ID. Live GUO prices, served from cache.
 */
guoRouter.get("/fares", async (req, res) => {
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  const date = String(req.query.date ?? lagosDate(1));
  if (!/^\d+$/.test(from) || !/^\d+$/.test(to)) {
    return res
      .status(400)
      .json({
        error: "from and to must be numeric GUO IDs (see /api/guo/routes)",
      });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < lagosDate()) {
    return res
      .status(400)
      .json({ error: "date must be YYYY-MM-DD, today or later" });
  }
  try {
    // Reject unknown pairs up front: GUO answers them with an HTTP 500.
    const route = (await getRoutes()).find(r => r.terminalId === from);
    if (!route?.destinations.some(d => d.id === to)) {
      return res.status(404).json({ error: "GUO does not run that route" });
    }
    res.json({
      provider: "GUO Transport",
      source: "live",
      currency: "NGN",
      ...(await getFares(from, to, date)),
    });
  } catch (err: any) {
    res.status(502).json({ error: `GUO unavailable: ${err.message}` });
  }
});

/** GET /api/guo/terminals — all GUO terminals in Nigeria with addresses and coordinates. */
guoRouter.get("/terminals", (_req, res) => {
  res.json({ terminals });
});

/** GET /api/guo/terminals/nearest?lat=6.52&lon=3.37&limit=5 */
guoRouter.get("/terminals/nearest", (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return res.status(400).json({ error: "lat and lon are required numbers" });
  }
  res.json({
    terminals: nearestTerminals(lat, lon, limit, req.query.all === "1"),
  });
});

/** GET /api/guo/status — cache size and last scrape result, for monitoring. */
guoRouter.get("/status", (_req, res) => {
  res.json(status());
});
