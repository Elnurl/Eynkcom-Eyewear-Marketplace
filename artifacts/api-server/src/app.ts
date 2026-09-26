import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { rateLimit } from "./middlewares/rateLimit";

const app: Express = express();

// One reverse proxy (Render's edge) sits in front; req.ip must be the client.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// The storefront calls the API on the same origin. Cross-origin access is
// opt-in via CORS_ALLOWED_ORIGINS (comma-separated) and is otherwise refused.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ credentials: true, origin: allowedOrigins.length ? allowedOrigins : false }));

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
//
// getClerkProxyHost is shared with clerkProxyMiddleware so that both
// halves of the auth setup agree on which hostname is canonical.
const clerk = clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(
    getClerkProxyHost(req) ?? "",
    process.env.CLERK_PUBLISHABLE_KEY,
  ),
}));
// The health check must not depend on Clerk, and static pages never need it.
app.use("/api", (req, res, next) => (req.path === "/healthz" ? next() : clerk(req, res, next)));

const fifteenMinutes = 15 * 60 * 1000;
app.post("/api/orders", rateLimit({ name: "checkout", limit: 20, windowMs: fifteenMinutes }));
app.post("/api/orders/:orderId/decision", rateLimit({ name: "order-decision", limit: 30, windowMs: fifteenMinutes }));
app.post("/api/seller/applications", rateLimit({ name: "seller-application", limit: 5, windowMs: 60 * 60 * 1000 }));

app.use("/api", router);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Tapılmadı." });
});

// In production the same process serves the built storefront. `__dirname` is
// the bundle directory (artifacts/api-server/dist), set by build.mjs.
const webDir = process.env.WEB_DIST_DIR
  ?? path.resolve(__dirname, "../../eynek-marketplace/dist/public");
if (existsSync(path.join(webDir, "index.html"))) {
  app.use("/assets", express.static(path.join(webDir, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(webDir, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(webDir, "index.html"));
  });
}

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const type = (error as { type?: string }).type;
  if (type === "entity.too.large") {
    res.status(413).json({ error: "Göndərilən məlumat çox böyükdür." });
    return;
  }
  if (type === "entity.parse.failed") {
    res.status(400).json({ error: "Sorğu formatı düzgün deyil." });
    return;
  }
  req.log.error({ err: error }, "Unhandled API error");
  res.status(500).json({ error: "Serverdə xəta baş verdi. Yenidən cəhd edin." });
};
app.use(errorHandler);

export default app;
