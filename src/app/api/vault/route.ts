import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BUCKET = "documents";

const VALID_CATEGORIES = ["id-document", "matric-transcript", "proof-of-address", "motivational-letter", "other"] as const;
type Category = typeof VALID_CATEGORIES[number];

// GET /api/vault
// Lists all files in the current user's folder, across all categories.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const files: {
    path: string;
    name: string;
    category: Category;
    size: number;
    createdAt: string;
    mimeType: string;
  }[] = [];

  for (const category of VALID_CATEGORIES) {
    const prefix = `${user.id}/${category}`;
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error || !data) continue;

    for (const file of data) {
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
      files.push({
        path: `${prefix}/${file.name}`,
        name: file.name,
        category,
        size: file.metadata?.size ?? 0,
        createdAt: file.created_at ?? file.updated_at ?? new Date().toISOString(),
        mimeType: file.metadata?.mimetype ?? "application/octet-stream",
      });
    }
  }

  // Sort newest first across all categories
  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(files);
}

// POST /api/vault
// Expects multipart FormData: { file: File, category: string }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string | null;

  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (!category || !VALID_CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: "valid category required" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  // Prefix filename with timestamp to avoid collisions
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${category}/${timestamp}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path });
}

// DELETE /api/vault
// Body: { path: string }
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = await req.json();
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  // Ensure the path belongs to this user
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
