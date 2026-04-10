import "dotenv/config";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

import profile from "./routes/profile.js";
import discover from "./routes/discover.js";
import applications from "./routes/applications.js";
import ai from "./routes/ai.js";
import email from "./routes/email.js";
import { startScanJob } from "./jobs/scanJob.js";
import { startDeadlineJob } from "./jobs/deadlineJob.js";
import { rateLimitDefault, rateLimitAi } from "./middleware/rateLimit.js";
import { log } from "./lib/logger.js";

const app = new Hono();

const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

// ── Middleware ──────────────────────────────────────────────────────────────

app.use("*", logger());
app.use("*", rateLimitDefault);

app.use(
  "*",
  cors({
    origin: [FRONTEND_URL],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Health check ────────────────────────────────────────────────────────────

app.get("/health", (ctx) => ctx.json({ status: "ok", ts: new Date().toISOString() }));

// ── Routes ──────────────────────────────────────────────────────────────────

app.route("/profile", profile);
app.route("/discover", discover);
app.route("/applications", applications);
// AI routes get a tighter per-IP limit (15 req/min) on top of the global one.
ai.use("*", rateLimitAi);
app.route("/ai", ai);
app.route("/email", email);

// ── 404 ─────────────────────────────────────────────────────────────────────

app.notFound((ctx) => ctx.json({ error: "Route not found" }, 404));

// ── Start ────────────────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: PORT }, () => {
  log.info(`Baseform backend running on http://localhost:${PORT}`);
  startScanJob();
  startDeadlineJob();
});

export default app;
