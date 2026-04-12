import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { buildCsv } from "@/lib/admin/contentAdmin";

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) {
    return new Response(JSON.stringify({ error: guard.error }), {
      status: guard.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_site_settings")
    .select("key,value,description,updated_at")
    .order("key", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = [
    ["key", "value", "description", "updated_at"],
    ...((data ?? []).map((setting) => [
      setting.key,
      JSON.stringify(setting.value ?? {}),
      setting.description ?? "",
      setting.updated_at ?? "",
    ])),
  ];

  return new Response(buildCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=admin-site-settings-${new Date().toISOString().slice(0, 10)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
