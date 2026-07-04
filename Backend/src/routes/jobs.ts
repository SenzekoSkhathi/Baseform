/**
 * Job trigger endpoints — invoked by Cloud Scheduler, not by users.
 *
 * Auth: Cloud Scheduler sends the shared secret in the X-Jobs-Secret
 * header. Set JOBS_SECRET on both the Cloud Run service and each
 * Scheduler job. Requests without a matching secret get 401.
 *
 */
// Scheduler setup (once per job) — schedules: scan "0 */6 * * *", deadlines "0 8 * * *" UTC:
//   gcloud scheduler jobs create http baseform-scan --schedule="0 */6 * * *" \
//     --uri="$BACKEND_URL/jobs/scan" --http-method=POST --headers="X-Jobs-Secret=$JOBS_SECRET"
//   gcloud scheduler jobs create http baseform-deadlines --schedule="0 8 * * *" --time-zone="UTC" \
//     --uri="$BACKEND_URL/jobs/deadlines" --http-method=POST --headers="X-Jobs-Secret=$JOBS_SECRET"

import { Hono } from "hono";

import { runScanForAllUsers } from "../jobs/scanJob.js";
import { runDeadlineNotifier } from "../jobs/deadlineJob.js";
import { log } from "../lib/logger.js";

const jobs = new Hono();

jobs.use("*", async (ctx, next) => {
  const secret = process.env.JOBS_SECRET;
  if (!secret || ctx.req.header("x-jobs-secret") !== secret) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// Email scan across all connected Gmail accounts (~100 users/min pacing).
// Runs long for many users — respond only when done so Cloud Run keeps
// the CPU allocated for the whole run (Scheduler deadline must cover it).
jobs.post("/scan", async (ctx) => {
  log.info("[jobs] /scan triggered by scheduler");
  await runScanForAllUsers();
  return ctx.json({ ok: true, job: "scan", ts: new Date().toISOString() });
});

// Daily 08:00 UTC deadline reminders.
jobs.post("/deadlines", async (ctx) => {
  log.info("[jobs] /deadlines triggered by scheduler");
  await runDeadlineNotifier();
  return ctx.json({ ok: true, job: "deadlines", ts: new Date().toISOString() });
});

export default jobs;
