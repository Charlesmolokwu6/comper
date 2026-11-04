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
import { convoyRouter } from "./convoy/router";
import { startScheduler } from "./fares/scheduler";
import { rateLimit, securityHeaders } from "./security";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const production = process.env.NODE_ENV === "production";

  // Render puts one proxy in front of us; trust it for the visitor's real IP.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(securityHeaders(production));

  // Per-visitor limits. Generous, because many mobile users share one IP.
  const MIN = 60_000;
  app.use("/api", rateLimit({ name: "api", windowMs: MIN, max: 300 }));
  app.use("/api/places", rateLimit({ name: "places", windowMs: MIN, max: 60 }));
  app.use(
    "/api/delivery",
    rateLimit({ name: "delivery", windowMs: MIN, max: 30 })
  );
  app.use(
    "/api/convoy",
    rateLimit({
      name: "convoy-start",
      windowMs: 10 * MIN,
      max: 10,
      when: req => req.method === "POST" && req.path === "/",
    })
  );
  app.use(
    "/api/convoy",
    rateLimit({
      name: "convoy-join",
      windowMs: 10 * MIN,
      max: 30,
      when: req => req.method === "POST" && req.path.endsWith("/join"),
    })
  );

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
      res.setHeader("Access-Control-Allow-Methods", "GET, POST");
      res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use("/api/guo", guoRouter);
  app.use("/api/flights", flightsRouter);
  app.use("/api/delivery", deliveryRouter);
  app.use("/api/convoy", convoyRouter);
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
