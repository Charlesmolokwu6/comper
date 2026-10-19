import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { guoRouter } from "./guo/router";
import { faresRouter } from "./fares/router";
import { flightsRouter } from "./flights/router";
import { placesRouter } from "./places/router";
import { routeRouter } from "./places/route";
import { deliveryRouter } from "./delivery/router";
import { startScheduler } from "./fares/scheduler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // A site on another domain may call this API when it's listed in ALLOWED_ORIGINS
  // (comma-separated, e.g. https://compare.ng). Read-only GETs, no cookies.
  const allowed = new Set(
    (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map(o => o.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  );
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader("Access-Control-Allow-Headers", "Accept");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use("/api/guo", guoRouter);
  app.use("/api/flights", flightsRouter);
  app.use("/api/delivery", deliveryRouter);
  app.use("/api/places/route", routeRouter);
  app.use("/api/places", placesRouter);
  app.use("/api", faresRouter);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startScheduler();
  });
}

startServer().catch(console.error);
