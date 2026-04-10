/**
 * Daily deadline reminder job.
 * Fires once at the next 08:00 UTC, then every 24 hours.
 */

import { runDeadlineNotifier } from "../services/deadlineNotifier.js";

function msUntilNext8amUTC(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0, 0)
  );
  if (next.getTime() <= now.getTime()) {
    // Already past 8am today — schedule for tomorrow
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function startDeadlineJob() {
  const delay = msUntilNext8amUTC();
  const hoursUntil = (delay / 3_600_000).toFixed(1);

  console.log(`[deadlineJob] First run in ${hoursUntil}h (next 08:00 UTC).`);

  setTimeout(() => {
    runDeadlineNotifier().catch(console.error);

    // Repeat every 24 hours from the first run
    setInterval(() => {
      runDeadlineNotifier().catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }, delay);
}
