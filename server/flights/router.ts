/**
 * Flight API.
 *   GET /api/flights/compare?from=lagos&to=abuja&date=YYYY-MM-DD
 *   GET /api/flights/network
 */
import { Router } from "express";
import { daysFromToday } from "../fares/store";
import { unavailableAirlines } from "./airlines";
import { resolveFlightCity } from "./airports";
import { compareFlights, flightNetwork } from "./compare";

export const flightsRouter = Router();

const WAIT_MS = Number(process.env.FLIGHT_COMPARE_WAIT_MS || 8000);
const MAX_DAYS = 180;

flightsRouter.get("/compare", async (req, res) => {
  const from = resolveFlightCity(String(req.query.from ?? ""));
  const to = resolveFlightCity(String(req.query.to ?? ""));
  const date = String(req.query.date ?? "");
  if (!from || !to)
    return res.status(400).json({
      error: "from and to must be cities with an airport, e.g. lagos, abuja",
    });
  if (from === to)
    return res.status(400).json({ error: "from and to are the same city" });
  const days = /^\d{4}-\d{2}-\d{2}$/.test(date) ? daysFromToday(date) : NaN;
  if (!(days >= 0 && days <= MAX_DAYS))
    return res.status(400).json({
      error: `date must be YYYY-MM-DD, today to ${MAX_DAYS} days ahead`,
    });
  try {
    const result = await compareFlights(from, to, date, WAIT_MS);
    res.json({ ...result, unavailableOperators: unavailableAirlines });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

flightsRouter.get("/network", async (_req, res) => {
  try {
    res.json({ complete: true, cities: await flightNetwork() });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});
