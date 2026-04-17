import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { effectivePlanTier } from "@/lib/access/tiers";
import { vaultLimitForTier, VAULT_MAX_UPLOAD_BYTES } from "@/lib/vault/limits";

const BUCKET = "documents";

const VALID_CATEGORIES = ["id-document", "matric-transcript", "proof-of-address", "motivational-letter", "other"] as const;
type Category = typeof VALID_CATEGORIES[number];

async function currentVaultBytes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  let total = 0;
  for (const category of VALID_CATEGORIES) {
    const { data } = await supabase.storage.from(BUCKET).list(`${userId}/${category}`, { limit: 200 });
    if (!data) continue;
    for (const f of data) {
      if (!f.name || f.name === ".emptyFolderPlaceholder") continue;
      total += (f.metadata?.size as number | undefined) ?? 0;
    }
  }
  return total;
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

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

  if (file.size > VAULT_MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${formatMb(VAULT_MAX_UPLOAD_BYTES)} per-file limit` },
      { status: 400 }
    );
  }

  // Enforce per-tier vault quota. Uses effective tier so a lapsed Pro
  // subscription drops back to the free quota.
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, plan_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  const tier = effectivePlanTier(
    (profile as { tier?: unknown } | null)?.tier,
    (profile as { plan_expires_at?: string | null } | null)?.plan_expires_at
  );
  const quota = vaultLimitForTier(tier);
  const currentUsage = await currentVaultBytes(supabase, user.id);

  if (currentUsage + file.size > quota) {
    return NextResponse.json(
      {
        error: `Vault is full. Your ${tier} plan allows up to ${formatMb(quota)}. Delete a file or upgrade to add more.`,
      },
      { status: 413 }
    );
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
