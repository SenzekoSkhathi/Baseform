import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "heartbeat",
  "ai_call",
  "application_action",
  "vault_action",
  "email_action",
  "login",
]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { event_type?: string; path?: string; metadata?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const eventType =
    typeof body.event_type === "string" && ALLOWED_EVENT_TYPES.has(body.event_type)
      ? body.event_type
      : "heartbeat";
  const path = typeof body.path === "string" ? body.path.slice(0, 512) : null;
  const metadata =
    body.metadata && typeof body.metadata === "object" ? body.metadata : null;

  const admin = createAdminClient();

  const now = new Date().toISOString();
  await Promise.all([
    admin.from("profiles").update({ last_seen_at: now }).eq("id", user.id),
    admin.from("activity_events").insert({
      user_id: user.id,
      event_type: eventType,
      path,
      metadata,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
