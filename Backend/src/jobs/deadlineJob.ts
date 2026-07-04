/**
 * Daily deadline reminder job — triggered at 08:00 UTC by Cloud Scheduler
 * via POST /jobs/deadlines (see routes/jobs.ts).
 *
 * Previously self-scheduled with setTimeout/setInterval; on Cloud Run
 * instances scale to zero, so in-process timers are unreliable.
 */

export { runDeadlineNotifier } from "../services/deadlineNotifier.js";
