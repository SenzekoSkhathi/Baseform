import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BUCKET = "documents";

// GET /api/vault/download?path=...
// Returns a short-lived signed URL for the given file path.
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  // Ensure the path belongs to this user
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 900); // valid for 15 minutes

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
