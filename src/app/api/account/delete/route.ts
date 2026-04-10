import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// DELETE /api/account/delete
// Permanently deletes the authenticated user's account and all associated data.
// Cascade deletes handle: profiles, student_subjects, applications, bursary_applications, ai_coach_logs.
// Storage files are deleted explicitly here since storage objects have no FK cascade.
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const userId = user.id;

  // Delete vault storage files for this user
  try {
    const { data: objects } = await admin.storage
      .from("documents")
      .list(userId, { limit: 1000 });

    if (objects && objects.length > 0) {
      const paths = objects
        .filter((o) => o.name && o.name !== ".emptyFolderPlaceholder")
        .map((o) => `${userId}/${o.name}`);

      // Also check sub-folders (categories)
      const categories = ["id-document", "matric-transcript", "proof-of-address", "motivational-letter", "other"];
      const allPaths: string[] = [...paths];

      for (const cat of categories) {
        const { data: catFiles } = await admin.storage
          .from("documents")
          .list(`${userId}/${cat}`, { limit: 1000 });

        if (catFiles) {
          for (const f of catFiles) {
            if (f.name && f.name !== ".emptyFolderPlaceholder") {
              allPaths.push(`${userId}/${cat}/${f.name}`);
            }
          }
        }
      }

      if (allPaths.length > 0) {
        await admin.storage.from("documents").remove(allPaths);
      }
    }
  } catch {
    // Non-fatal — proceed with account deletion even if storage cleanup fails
  }

  // Explicitly delete tables that may not have FK cascade set up
  // These are non-fatal — we proceed even if rows don't exist
  await Promise.allSettled([
    admin.from("applications").delete().eq("student_id", userId),
    admin.from("bursary_applications").delete().eq("student_id", userId),
    admin.from("ai_coach_logs").delete().eq("student_id", userId),
  ]);

  // Sign the user out before deletion so their session is invalid immediately
  await supabase.auth.signOut();

  // Delete the auth user — cascades profiles + student_subjects via FK
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
