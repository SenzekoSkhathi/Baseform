import type { Context, Next } from "hono";
import { supabaseAdmin } from "../lib/supabase.js";

export type AuthUser = {
  id: string;
  email: string;
};

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

/**
 * Verifies the Bearer JWT from the Authorization header using Supabase.
 * Attaches the decoded user to ctx.var.user.
 */
export async function requireAuth(ctx: Context, next: Next) {
  const authHeader = ctx.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return ctx.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return ctx.json({ error: "Invalid or expired token" }, 401);
  }

  ctx.set("user", {
    id: data.user.id,
    email: data.user.email ?? "",
  });

  await next();
}
