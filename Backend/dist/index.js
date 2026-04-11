"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const logger_1 = require("hono/logger");
const node_server_1 = require("@hono/node-server");
const profile_js_1 = __importDefault(require("./routes/profile.js"));
const discover_js_1 = __importDefault(require("./routes/discover.js"));
const applications_js_1 = __importDefault(require("./routes/applications.js"));
const ai_js_1 = __importDefault(require("./routes/ai.js"));
const email_js_1 = __importDefault(require("./routes/email.js"));
const scanJob_js_1 = require("./jobs/scanJob.js");
const deadlineJob_js_1 = require("./jobs/deadlineJob.js");
const rateLimit_js_1 = require("./middleware/rateLimit.js");
const logger_js_1 = require("./lib/logger.js");
const app = new hono_1.Hono();
const PORT = Number(process.env.PORT ?? 3001);
// Support comma-separated list: FRONTEND_URL=https://baseform.co.za,http://localhost:3000
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
// ── Middleware ──────────────────────────────────────────────────────────────
app.use("*", (0, logger_1.logger)());
app.use("*", rateLimit_js_1.rateLimitDefault);
app.use("*", (0, cors_1.cors)({
    origin: ALLOWED_ORIGINS,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (ctx) => ctx.json({ status: "ok", ts: new Date().toISOString() }));
// ── Routes ──────────────────────────────────────────────────────────────────
app.route("/profile", profile_js_1.default);
app.route("/discover", discover_js_1.default);
app.route("/applications", applications_js_1.default);
// AI routes get a tighter per-IP limit (15 req/min) on top of the global one.
ai_js_1.default.use("*", rateLimit_js_1.rateLimitAi);
app.route("/ai", ai_js_1.default);
app.route("/email", email_js_1.default);
// ── 404 ─────────────────────────────────────────────────────────────────────
app.notFound((ctx) => ctx.json({ error: "Route not found" }, 404));
// ── Start ────────────────────────────────────────────────────────────────────
(0, node_server_1.serve)({ fetch: app.fetch, port: PORT }, () => {
    logger_js_1.log.info(`Baseform backend running on http://localhost:${PORT}`);
    (0, scanJob_js_1.startScanJob)();
    (0, deadlineJob_js_1.startDeadlineJob)();
});
exports.default = app;
