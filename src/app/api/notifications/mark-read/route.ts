import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/notifications/mark-read
// Records now() as the user's notifications_last_read_at. Any notification
// whose timestamp is <= this value is considered read, across all devices.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ notifications_last_read_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
