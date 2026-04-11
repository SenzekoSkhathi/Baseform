"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const auth_js_1 = require("../middleware/auth.js");
const supabase_js_1 = require("../lib/supabase.js");
const applications = new hono_1.Hono();
applications.use("*", auth_js_1.requireAuth);
/** GET /applications — list all applications for the current user */
applications.get("/", async (ctx) => {
    const user = ctx.var.user;
    const { data, error } = await supabase_js_1.supabaseAdmin
        .from("applications")
        .select(`id, status, applied_at, notes, updated_at,
       faculties(id, name, qualification_type, duration_years),
       universities(id, name, short_name, logo_url, closing_date)`)
        .eq("student_id", user.id)
        .order("applied_at", { ascending: false });
    if (error) {
        return ctx.json({ error: error.message }, 500);
    }
    return ctx.json({ applications: data });
});
/** POST /applications — create a new application tracker entry */
applications.post("/", async (ctx) => {
    const user = ctx.var.user;
    const body = await ctx.req.json();
    const { faculty_id, university_id, notes } = body;
    if (!faculty_id || !university_id) {
        return ctx.json({ error: "faculty_id and university_id are required" }, 400);
    }
    const { data, error } = await supabase_js_1.supabaseAdmin
        .from("applications")
        .insert({
        student_id: user.id,
        faculty_id,
        university_id,
        notes: notes ?? null,
        status: "planning",
    })
        .select()
        .single();
    if (error) {
        if (error.code === "23505") {
            return ctx.json({ error: "Application already tracked" }, 409);
        }
        return ctx.json({ error: error.message }, 500);
    }
    return ctx.json({ application: data }, 201);
});
/** PATCH /applications/:id — update status or notes */
applications.patch("/:id", async (ctx) => {
    const user = ctx.var.user;
    const id = ctx.req.param("id");
    const body = await ctx.req.json();
    const allowed = ["status", "notes"];
    const updates = {};
    for (const key of allowed) {
        if (key in body)
            updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
        return ctx.json({ error: "No valid fields to update" }, 400);
    }
    const VALID_STATUSES = ["planning", "in_progress", "submitted", "accepted", "rejected", "waitlisted"];
    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
        return ctx.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, 400);
    }
    const { data, error } = await supabase_js_1.supabaseAdmin
        .from("applications")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("student_id", user.id) // ensure ownership
        .select()
        .single();
    if (error) {
        return ctx.json({ error: error.message }, 500);
    }
    if (!data) {
        return ctx.json({ error: "Application not found" }, 404);
    }
    return ctx.json({ application: data });
});
/** DELETE /applications/:id — remove a tracked application */
applications.delete("/:id", async (ctx) => {
    const user = ctx.var.user;
    const id = ctx.req.param("id");
    const { error } = await supabase_js_1.supabaseAdmin
        .from("applications")
        .delete()
        .eq("id", id)
        .eq("student_id", user.id);
    if (error) {
        return ctx.json({ error: error.message }, 500);
    }
    return ctx.json({ success: true });
});
exports.default = applications;
