import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("basebot_memory")
    .select("key, value, category, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  return Response.json(data ?? []);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return Response.json({ error: "key required" }, { status: 400 });

  await supabase
    .from("basebot_memory")
    .delete()
    .eq("user_id", session.user.id)
    .eq("key", key);

  return Response.json({ ok: true });
}
