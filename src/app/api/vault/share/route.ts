import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paths, title } = await req.json();
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: "No paths provided" }, { status: 400 });
  }

  // Ensure all paths belong to the user
  for (const p of paths) {
    if (!p.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Generate a random 16-character token
  const token = crypto.randomBytes(8).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const bundleData = {
    userId: user.id,
    title: title || "Document Bundle",
    paths,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  // Upload to a 'bundles' folder inside the user's storage directory
  const { error } = await supabase.storage
    .from("documents")
    .upload(`${user.id}/bundles/${token}.json`, JSON.stringify(bundleData), {
      contentType: "application/json",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 });
  }

  // Return the shareable URL
  return NextResponse.json({
    url: `/share/bundle/${token}?u=${user.id}`,
    expiresAt,
  });
}
