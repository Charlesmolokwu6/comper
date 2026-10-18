/**
 * Delivery tab:
 *   GET /api/delivery/stations                                   → states GIGL serves
 *   GET /api/delivery/quote?from=4&to=3&weight=2&value=10000     → live price per courier
 *
 * Only GIG Logistics publishes prices we can fetch without a login today. Couriers that
 * need a login or sit behind a robot check are listed as unavailable with the reason.
 */
import { Router } from "express";
import { getQuote, getStations } from "./gigl";

export const deliveryRouter = Router();

export const unavailableCouriers = [
  {
    name: "Kwik, Red Star Express",
    reason: "Their sites block automated requests with a robot check.",
  },
  {
    name: "Fez Delivery",
    reason: "Its price check logs in with an account built into the page.",
  },
];

deliveryRouter.get("/stations", async (_req, res) => {
  try {
    res.json({ stations: await getStations() });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Couldn't load states" });
  }
});

deliveryRouter.get("/quote", async (req, res) => {
  const from = Number(req.query.from);
  const to = Number(req.query.to);
  const weight = Math.round(Number(req.query.weight) * 10) / 10;
  const value = Math.round(Number(req.query.value ?? 0));
  if (!Number.isInteger(from) || !Number.isInteger(to))
    return res.status(400).json({ error: "from and to must be station ids" });
  if (!(weight >= 0.1 && weight <= 100))
    return res.status(400).json({ error: "weight must be 0.1 to 100 kg" });
  if (!(value >= 0 && value <= 10_000_000))
    return res.status(400).json({ error: "value must be ₦0 to ₦10,000,000" });

  const list = await getStations().catch(() => [] as { id: number }[]);
  if (
    list.length &&
    (!list.some(s => s.id === from) || !list.some(s => s.id === to))
  )
    return res.status(400).json({ error: "Unknown state" });

  const couriers = [];
  try {
    const q = await getQuote(from, to, weight, value);
    couriers.push({
      id: "gigl",
      name: "GIG Logistics",
      status: "price" as const,
      price: q.price,
      fetchedAt: q.fetchedAt,
      bookingUrl: "https://giglogistics.com/",
      note: "Regular parcel, from GIGL's own price calculator. Drop off or book pickup in the GIGL app.",
    });
  } catch (err: any) {
    couriers.push({
      id: "gigl",
      name: "GIG Logistics",
      status: "error" as const,
      message: err.message ?? "Couldn't get a price",
      bookingUrl: "https://giglogistics.com/",
    });
  }
  res.json({ couriers, unavailable: unavailableCouriers });
});
