import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/targets/[id] — remove a saved target
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!id) return Response.json({ error: "Invalid id" }, { status: 400 });

  const { error } = await supabase
    .from("targets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // row-level ownership check

  if (error) return Response.json({ error: "Failed to delete target" }, { status: 500 });

  return Response.json({ deleted: 1 });
}
