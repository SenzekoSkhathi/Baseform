/**
 * Email scan job — triggered every 6 hours by Cloud Scheduler via
 * POST /jobs/scan (see routes/jobs.ts).
 * Fetches all active Gmail connections and triggers a scan for each user.
 *
 * Pacing: 600ms between users → ~100 users/minute.
 * This prevents hitting Google's Gmail API quota in bursts when the job fires.
 */

import { supabaseAdmin } from "../lib/supabase.js";
import { scanUserEmails } from "../services/emailScanner.js";

const USER_DELAY_MS = 600; // 600ms between users ≈ 100/min

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function runScanForAllUsers() {
  console.log("[scanJob] Starting scheduled email scan...");

  const { data: connections, error } = await supabaseAdmin
    .from("email_connections")
    .select("user_id")
    .eq("is_active", true);

  if (error) {
    console.error("[scanJob] Failed to fetch connections:", error);
    return;
  }

  if (!connections?.length) {
    console.log("[scanJob] No active email connections.");
    return;
  }

  console.log(`[scanJob] Scanning ${connections.length} user(s) at ~100/min...`);

  for (let i = 0; i < connections.length; i++) {
    const { user_id } = connections[i];
    try {
      await scanUserEmails(user_id);
    } catch (err) {
      console.error(`[scanJob] Error scanning user ${user_id}:`, err);
    }

    // Pace: wait 600ms before the next user (skip delay after the last one)
    if (i < connections.length - 1) {
      await sleep(USER_DELAY_MS);
    }
  }

  console.log("[scanJob] Scheduled scan complete.");
}

// NOTE: previously self-scheduled via setInterval every 6h (INTERVAL_MS).
// On Cloud Run instances scale to zero, so scheduling moved to Cloud
// Scheduler → POST /jobs/scan (see routes/jobs.ts).
