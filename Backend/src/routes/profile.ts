import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";

const profile = new Hono();

profile.use("*", requireAuth);

/** GET /profile — fetch the current user's profile */
profile.get("/", async (ctx) => {
  const user = ctx.var.user;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return ctx.json({ error: error.message }, 500);
  }

  return ctx.json({ profile: data });
});

/** PATCH /profile — update profile fields */
profile.patch("/", async (ctx) => {
  const user = ctx.var.user;
  const body = await ctx.req.json();

  // Whitelist updatable fields
  const allowed = [
    "full_name",
    "phone",
    "province",
    "school",
    "grade",
    "field_of_interest",
    "guardian_name",
    "guardian_phone",
    "guardian_relationship",
    "guardian_email",
    "guardian_whatsapp_number",
    "tier",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return ctx.json({ error: "No valid fields to update" }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return ctx.json({ error: error.message }, 500);
  }

  return ctx.json({ profile: data });
});

/** GET /profile/subjects — fetch the student's subjects */
profile.get("/subjects", async (ctx) => {
  const user = ctx.var.user;

  const { data, error } = await supabaseAdmin
    .from("student_subjects")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return ctx.json({ error: error.message }, 500);
  }

  return ctx.json({ subjects: data });
});

export default profile;
