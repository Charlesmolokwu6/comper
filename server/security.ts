/**
 * Basic protection for a public site with no accounts:
 *  - rateLimit(): requests per visitor (IP) per window, so one client can't flood us or,
 *    through us, the free map/route services we rely on. Kept in memory.
 *  - securityHeaders(): standard browser protections (CSP, framing, HTTPS, sniffing).
 * Limits are generous: many Nigerian mobile users share one IP address (carrier NAT).
 */
import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: {
  name: string;
  windowMs: number;
  max: number;
  /** Only count requests this returns true for (e.g. POST only). */
  when?: (req: Request) => boolean;
}) {
  const buckets = new Map<string, Bucket>();
  // Forget old visitors now and then.
  setInterval(
    () => {
      const now = Date.now();
      for (const [k, b] of Array.from(buckets))
        if (b.resetAt <= now) buckets.delete(k);
    },
    Math.max(60_000, opts.windowMs)
  ).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    if (opts.when && !opts.when(req)) return next();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, b);
    }
    b.count++;
    if (b.count > opts.max) {
      const wait = Math.ceil((b.resetAt - now) / 1000);
      const mins = Math.ceil(wait / 60);
      res.setHeader("Retry-After", String(wait));
      return res.status(429).json({
        error: `Too many requests; please wait ${
          wait < 60
            ? `${wait} seconds`
            : `${mins} minute${mins === 1 ? "" : "s"}`
        } and try again`,
      });
    }
    next();
  };
}

/** The Content-Security-Policy: only the places the site really loads from. */
export function contentSecurityPolicy(extraConnect: string[] = []) {
  return [
    "default-src 'self'",
    "script-src 'self' https://cloud.umami.is",
    // React and the map set inline style attributes.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // Operators' vehicle photos, map icons.
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https://tiles.openfreemap.org https://cloud.umami.is https://gateway.umami.is ${extraConnect.join(" ")}`.trim(),
    // The map draws in web workers.
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    // Shipbubble's calculator opens inside Delivery.
    "frame-src https://shipbubble.com https://www.shipbubble.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
  ].join("; ");
}

export function securityHeaders(production: boolean) {
  const apiBase = (process.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
  const csp =
    contentSecurityPolicy(apiBase ? [new URL(apiBase).origin] : []) +
    (production ? "; upgrade-insecure-requests" : "");
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(self), camera=(), microphone=(), payment=(), usb=()"
    );
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (production)
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=15552000; includeSubDomains"
      );
    next();
  };
}
