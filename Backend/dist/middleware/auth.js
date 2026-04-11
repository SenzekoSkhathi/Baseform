"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const supabase_js_1 = require("../lib/supabase.js");
/**
 * Verifies the Bearer JWT from the Authorization header using Supabase.
 * Attaches the decoded user to ctx.var.user.
 */
async function requireAuth(ctx, next) {
    const authHeader = ctx.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return ctx.json({ error: "Missing or invalid Authorization header" }, 401);
    }
    const token = authHeader.slice(7);
    const { data, error } = await supabase_js_1.supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
        return ctx.json({ error: "Invalid or expired token" }, 401);
    }
    ctx.set("user", {
        id: data.user.id,
        email: data.user.email ?? "",
    });
    await next();
}
