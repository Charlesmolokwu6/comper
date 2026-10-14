import { Router } from "express";
import { nearestTerminals, terminals } from "./terminals";

export const guoRouter = Router();

/** Kept for compatibility: GUO fares now come from the shared /api/operators/guo/fares. */
guoRouter.get("/fares", (req, res) => {
  const qs = new URLSearchParams(
    req.query as Record<string, string>
  ).toString();
  res.redirect(307, `/api/operators/guo/fares${qs ? `?${qs}` : ""}`);
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
