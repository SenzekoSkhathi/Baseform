"use strict";
/**
 * Deadline notifier — sends email reminders 30, 7, and 1 day before a
 * university application closing date.
 *
 * Deduplication: every sent notification is logged in `notification_sent_log`
 * with a UNIQUE(user_id, notification_type, reference_id) constraint, so this
 * can safely be called multiple times per day without sending duplicates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDeadlineNotifier = runDeadlineNotifier;
const supabase_js_1 = require("../lib/supabase.js");
const emailSender_js_1 = require("../lib/emailSender.js");
const THRESHOLDS = [
    { days: 30, type: "deadline_30d" },
    { days: 7, type: "deadline_7d" },
    { days: 1, type: "deadline_1d" },
];
/** Returns 0 if today matches the target date (same calendar day in UTC). */
function daysUntilUTC(iso) {
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const tgt = new Date(iso);
    const target = Date.UTC(tgt.getUTCFullYear(), tgt.getUTCMonth(), tgt.getUTCDate());
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
}
// ── Main export ──────────────────────────────────────────────────────────────
async function runDeadlineNotifier() {
    console.log("[deadlineNotifier] Starting run...");
    // Load all applications with university closing dates and student info
    const { data: applications, error } = await supabase_js_1.supabaseAdmin
        .from("applications")
        .select(`
      id, status, student_id,
      universities ( id, name, closing_date ),
      faculties    ( id, name )
    `)
        .not("universities.closing_date", "is", null);
    if (error) {
        console.error("[deadlineNotifier] Failed to load applications:", error);
        return;
    }
    if (!applications?.length) {
        console.log("[deadlineNotifier] No applications with closing dates found.");
        return;
    }
    const byStudent = new Map();
    for (const app of applications) {
        if (!app.universities?.closing_date)
            continue;
        const list = byStudent.get(app.student_id) ?? [];
        list.push(app);
        byStudent.set(app.student_id, list);
    }
    for (const [studentId, apps] of byStudent) {
        await notifyStudent(studentId, apps);
    }
    console.log("[deadlineNotifier] Run complete.");
}
async function notifyStudent(studentId, apps) {
    // Load student profile (email + name)
    const { data: profile } = await supabase_js_1.supabaseAdmin
        .from("profiles")
        .select("full_name, email, notification_prefs")
        .eq("id", studentId)
        .single();
    if (!profile?.email) {
        console.log(`[deadlineNotifier] No email for student ${studentId}, skipping.`);
        return;
    }
    const prefersDeadlineAlerts = profile.notification_prefs?.deadline_alerts;
    if (typeof prefersDeadlineAlerts === "boolean" && !prefersDeadlineAlerts) {
        console.log(`[deadlineNotifier] Deadline alerts disabled for student ${studentId}, skipping.`);
        return;
    }
    const firstName = (profile.full_name ?? "").split(" ")[0] || "there";
    // Load already-sent log entries for this student (all deadline types)
    const { data: sentLogs } = await supabase_js_1.supabaseAdmin
        .from("notification_sent_log")
        .select("notification_type, reference_id")
        .eq("user_id", studentId)
        .in("notification_type", ["deadline_30d", "deadline_7d", "deadline_1d"]);
    const sentSet = new Set((sentLogs ?? []).map((l) => `${l.notification_type}:${l.reference_id}`));
    const byUni = new Map();
    for (const app of apps) {
        if (!app.universities)
            continue;
        const key = String(app.universities.id);
        if (!byUni.has(key)) {
            byUni.set(key, {
                uniId: app.universities.id,
                uniName: app.universities.name,
                closingDate: app.universities.closing_date,
                programmeCount: 0,
                worstStatus: app.status ?? "planning",
                anyAppId: app.id,
            });
        }
        const group = byUni.get(key);
        group.programmeCount++;
        // Prefer showing "planning" over more advanced statuses in deadline emails
        if ((app.status ?? "planning") === "planning")
            group.worstStatus = "planning";
    }
    for (const [, group] of byUni) {
        const daysLeft = daysUntilUTC(group.closingDate);
        for (const { days, type } of THRESHOLDS) {
            if (daysLeft !== days)
                continue;
            const refId = String(group.anyAppId);
            const logKey = `${type}:${refId}`;
            if (sentSet.has(logKey)) {
                console.log(`[deadlineNotifier] Already sent ${type} for app ${refId}`);
                continue;
            }
            const appUrl = `${process.env.FRONTEND_URL ?? "https://baseform.co.za"}/dashboard/detail/${group.uniId}`;
            const { subject, html } = (0, emailSender_js_1.buildDeadlineEmail)({
                firstName,
                universityName: group.uniName,
                closingDate: group.closingDate,
                daysLeft,
                programmeCount: group.programmeCount,
                appStatus: group.worstStatus,
                appUrl,
            });
            try {
                await (0, emailSender_js_1.sendEmail)({ to: profile.email, subject, html });
                await supabase_js_1.supabaseAdmin.from("notification_sent_log").insert({
                    user_id: studentId,
                    notification_type: type,
                    reference_id: refId,
                    email_address: profile.email,
                });
                console.log(`[deadlineNotifier] Sent ${type} to ${profile.email} for ${group.uniName} (${daysLeft}d left)`);
            }
            catch (err) {
                console.error(`[deadlineNotifier] Failed to send ${type} to ${profile.email}:`, err);
            }
        }
    }
}
