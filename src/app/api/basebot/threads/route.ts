import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFreePlanTier } from "@/lib/access/tiers";

async function isFreeUser(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .maybeSingle();
  return isFreePlanTier(profile?.tier);
}

// GET /api/basebot/threads — fetch all threads for the logged-in user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isFreeUser(user.id)) {
    return NextResponse.json({ error: "AI Coach is available on paid plans only." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("basebot_threads")
    .select("id, title, preview, messages, updated_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PUT /api/basebot/threads — upsert a single thread
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isFreeUser(user.id)) {
    return NextResponse.json({ error: "AI Coach is available on paid plans only." }, { status: 403 });
  }

  const body = await req.json() as {
    id: string;
    title: string;
    preview: string;
    messages: unknown[];
    updated_at: string;
  };

  if (!body.id) return NextResponse.json({ error: "Thread id required" }, { status: 400 });

  const { error } = await supabase
    .from("basebot_threads")
    .upsert({
      id: body.id,
      user_id: user.id,
      title: body.title ?? "New chat",
      preview: body.preview ?? "",
      messages: body.messages ?? [],
      updated_at: body.updated_at ?? new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/basebot/threads?id=xxx — delete a single thread
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isFreeUser(user.id)) {
    return NextResponse.json({ error: "AI Coach is available on paid plans only." }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thread id required" }, { status: 400 });

  const { error } = await supabase
    .from("basebot_threads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
