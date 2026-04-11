"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const auth_js_1 = require("../middleware/auth.js");
const supabase_js_1 = require("../lib/supabase.js");
const emailScanner_js_1 = require("../services/emailScanner.js");
const email = new hono_1.Hono();
email.use("*", auth_js_1.requireAuth);
/** GET /email/status — returns the user's Gmail connection info */
email.get("/status", async (ctx) => {
    const user = ctx.var.user;
    const { data, error } = await supabase_js_1.supabaseAdmin
        .from("email_connections")
        .select("email_address, is_active, last_scanned_at, created_at")
        .eq("user_id", user.id)
        .single();
    if (error || !data) {
        return ctx.json({ connected: false });
    }
    return ctx.json({
        connected: data.is_active,
        email_address: data.email_address,
        last_scanned_at: data.last_scanned_at,
        connected_since: data.created_at,
    });
});
/** POST /email/scan — trigger an immediate scan for the current user */
email.post("/scan", async (ctx) => {
    const user = ctx.var.user;
    // Fire scan in background — don't make the caller wait
    (0, emailScanner_js_1.scanUserEmails)(user.id).catch((err) => console.error("[email/scan] scan error:", err));
    return ctx.json({ message: "Scan started" });
});
/** DELETE /email/disconnect — remove Gmail connection */
email.delete("/disconnect", async (ctx) => {
    const user = ctx.var.user;
    const { error } = await supabase_js_1.supabaseAdmin
        .from("email_connections")
        .delete()
        .eq("user_id", user.id);
    if (error)
        return ctx.json({ error: error.message }, 500);
    return ctx.json({ disconnected: true });
});
exports.default = email;
