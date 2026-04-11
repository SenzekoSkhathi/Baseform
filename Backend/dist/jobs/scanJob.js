"use strict";
/**
 * Background scan job — runs every 6 hours.
 * Fetches all active Gmail connections and triggers a scan for each user.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScanJob = startScanJob;
const supabase_js_1 = require("../lib/supabase.js");
const emailScanner_js_1 = require("../services/emailScanner.js");
const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
async function runScanForAllUsers() {
    console.log("[scanJob] Starting scheduled email scan...");
    const { data: connections, error } = await supabase_js_1.supabaseAdmin
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
    console.log(`[scanJob] Scanning ${connections.length} user(s)...`);
    // Run scans sequentially to avoid hammering Gmail API + Claude
    for (const { user_id } of connections) {
        try {
            await (0, emailScanner_js_1.scanUserEmails)(user_id);
        }
        catch (err) {
            console.error(`[scanJob] Error scanning user ${user_id}:`, err);
        }
    }
    console.log("[scanJob] Scheduled scan complete.");
}
function startScanJob() {
    // Run once shortly after startup (30s delay so server is fully up)
    setTimeout(() => {
        runScanForAllUsers().catch(console.error);
    }, 30_000);
    // Then repeat every 6 hours
    setInterval(() => {
        runScanForAllUsers().catch(console.error);
    }, INTERVAL_MS);
    console.log(`[scanJob] Email scan job registered — runs every 6 hours.`);
}
