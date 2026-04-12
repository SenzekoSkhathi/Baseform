"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const auth_js_1 = require("../middleware/auth.js");
const supabase_js_1 = require("../lib/supabase.js");
const discover = new hono_1.Hono();
discover.use("*", auth_js_1.requireAuth);
/**
 * GET /discover/programmes
 * Returns programmes the student qualifies for, filtered by their APS + field of interest.
 * Query params:
 *   - aps: number (required)
 *   - field: string (optional) — matches field_of_study
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 */
discover.get("/programmes", async (ctx) => {
    const aps = Number(ctx.req.query("aps") ?? 0);
    const field = ctx.req.query("field");
    const limit = Math.min(Number(ctx.req.query("limit") ?? 50), 100);
    const offset = Number(ctx.req.query("offset") ?? 0);
    if (!aps || aps < 0 || aps > 42) {
        return ctx.json({ error: "Invalid aps value (0–42 expected)" }, 400);
    }
    let query = supabase_js_1.supabaseAdmin
        .from("faculties")
        .select(`id, name, aps_minimum, scoring_system, native_score_minimum,
       field_of_study, duration_years, qualification_type, nqf_level,
       places_available, additional_requirements,
       universities!inner(id, name, short_name, logo_url, city, province, application_fee, closing_date, website_url)`, { count: "exact" })
        .lte("aps_minimum", aps)
        .order("aps_minimum", { ascending: false });
    if (field && field !== "Not sure yet") {
        query = query.eq("field_of_study", field);
    }
    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) {
        return ctx.json({ error: error.message }, 500);
    }
    return ctx.json({ programmes: data, total: count ?? 0, limit, offset });
});
/**
 * GET /discover/bursaries
 * Returns bursaries the student qualifies for.
 * Query params:
 *   - aps: number (required)
 *   - province: string (optional)
 *   - field: string (optional)
 */
discover.get("/bursaries", async (ctx) => {
    const aps = Number(ctx.req.query("aps") ?? 0);
    const province = ctx.req.query("province");
    const limit = Math.min(Number(ctx.req.query("limit") ?? 50), 100);
    const offset = Number(ctx.req.query("offset") ?? 0);
    if (!aps) {
        return ctx.json({ error: "aps query param required" }, 400);
    }
    let query = supabase_js_1.supabaseAdmin
        .from("bursaries")
        .select("*", { count: "exact" })
        .lte("minimum_aps", aps)
        .eq("is_active", true)
        .order("amount_per_year", { ascending: false });
    if (province) {
        query = query.or(`provinces_eligible.cs.{"${province}"},provinces_eligible.cs.{"All"}`);
    }
    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) {
        return ctx.json({ error: error.message }, 500);
    }
    return ctx.json({ bursaries: data, total: count ?? 0, limit, offset });
});
/**
 * GET /discover/universities
 * Returns all active universities.
 */
discover.get("/universities", async (ctx) => {
    const { data, error } = await supabase_js_1.supabaseAdmin
        .from("universities")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
    if (error) {
        return ctx.json({ error: error.message }, 500);
    }
    return ctx.json({ universities: data });
});
exports.default = discover;
