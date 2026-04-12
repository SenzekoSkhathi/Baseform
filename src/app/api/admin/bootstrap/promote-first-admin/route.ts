import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated. Please log in first." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: existingAdmins, error: adminCheckError } = await admin
    .from("profiles")
    .select("id")
    .eq("tier", "admin")
    .limit(1);

  if (adminCheckError) {
    return NextResponse.json({ error: adminCheckError.message }, { status: 500 });
  }

  if ((existingAdmins?.length ?? 0) > 0) {
    return NextResponse.json(
      { error: "Admin already exists. Use the admin console to promote other users." },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("profiles")
    .update({ tier: "admin" })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "✅ You're now an admin! Log out and back in to access /admin",
    userId: user.id,
    newTier: "admin",
  });
}
