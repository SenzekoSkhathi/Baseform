/**
 * Background scan job — runs every 6 hours.
 * Fetches all active Gmail connections and triggers a scan for each user.
 *
 * Pacing: 600ms between users → ~100 users/minute.
 * This prevents hitting Google's Gmail API quota in bursts when the job fires.
 */

import { supabaseAdmin } from "../lib/supabase.js";
import { scanUserEmails } from "../services/emailScanner.js";

const INTERVAL_MS      = 6 * 60 * 60 * 1000; // 6 hours
const USER_DELAY_MS    = 600;                  // 600ms between users ≈ 100/min

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function runScanForAllUsers() {
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

export function startScanJob() {
  // Run once shortly after startup (30s delay so server is fully up)
  setTimeout(() => {
    runScanForAllUsers().catch(console.error);
  }, 30_000);

  // Then repeat every 6 hours
  setInterval(() => {
    runScanForAllUsers().catch(console.error);
  }, INTERVAL_MS);

  console.log("[scanJob] Email scan job registered — runs every 6 hours.");
}
