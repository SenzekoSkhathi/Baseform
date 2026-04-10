import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("email_connections")
    .select("email_address, is_active, last_scanned_at, created_at")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ connected: false, inactive: false });
  }

  if (!data.is_active) {
    return NextResponse.json({
      connected: false,
      inactive: true,
      email_address: data.email_address,
      last_scanned_at: data.last_scanned_at,
    });
  }

  return NextResponse.json({
    connected:       true,
    inactive:        false,
    email_address:   data.email_address,
    last_scanned_at: data.last_scanned_at,
    connected_since: data.created_at,
  });
}
