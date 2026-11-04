/**
 * Follow the leader:
 *   POST /api/convoy                         {title, name}          → start (you lead)
 *   GET  /api/convoy/:id                                            → names + latest positions
 *   POST /api/convoy/:id/join                {name}                 → join as a follower
 *   POST /api/convoy/:id/position            {member, key, lat, lon, accuracy}
 *   POST /api/convoy/:id/leave               {member, key}          → leave / end (leader)
 * Keys are only returned to the phone that started or joined, and never shown to others.
 */
import express, { Router } from "express";
import {
  ConvoyError,
  createConvoy,
  getConvoy,
  joinConvoy,
  leave,
  publicView,
  reportPosition,
} from "./store";

export const convoyRouter = Router();
convoyRouter.use(express.json({ limit: "2kb" }));
// Live data: never cached by the browser or anything in between.
convoyRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const handle =
  (fn: (req: express.Request) => unknown) =>
  (req: express.Request, res: express.Response) => {
    try {
      res.json(fn(req));
    } catch (err: any) {
      res
        .status(err instanceof ConvoyError ? err.status : 500)
        .json({ error: err.message ?? "Something went wrong" });
    }
  };

convoyRouter.post(
  "/",
  handle(req => {
    const { convoy, member } = createConvoy(req.body?.title, req.body?.name);
    return { convoy: publicView(convoy), member: member.id, key: member.key };
  })
);

convoyRouter.get(
  "/:id",
  handle(req => publicView(getConvoy(req.params.id)))
);

convoyRouter.post(
  "/:id/join",
  handle(req => {
    const m = joinConvoy(req.params.id, req.body?.name);
    return { member: m.id, key: m.key };
  })
);

convoyRouter.post(
  "/:id/position",
  handle(req => {
    reportPosition(
      req.params.id,
      String(req.body?.member ?? ""),
      req.body?.key,
      req.body ?? {}
    );
    return publicView(getConvoy(req.params.id));
  })
);

convoyRouter.post(
  "/:id/leave",
  handle(req => ({
    result: leave(req.params.id, String(req.body?.member ?? ""), req.body?.key),
  }))
);
