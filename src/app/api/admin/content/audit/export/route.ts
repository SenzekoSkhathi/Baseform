import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { buildCsv } from "@/lib/admin/contentAdmin";

export async function GET(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) {
    return new Response(JSON.stringify({ error: guard.error }), {
      status: guard.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200), 1), 1000);
  const entityType = url.searchParams.get("entity_type")?.trim() || "";
  const action = url.searchParams.get("action")?.trim() || "";
  const from = url.searchParams.get("from")?.trim() || "";
  const to = url.searchParams.get("to")?.trim() || "";

  const admin = createAdminClient();
  let query = admin
    .from("admin_content_audit_log")
    .select("entity_type,entity_key,action,before_data,after_data,admin_user_id,admin_email,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entityType) query = query.eq("entity_type", entityType);
  if (action) query = query.eq("action", action);
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = [
    ["created_at", "entity_type", "entity_key", "action", "admin_email", "admin_user_id", "before_data", "after_data"],
    ...((data ?? []).map((row) => [
      row.created_at,
      row.entity_type,
      row.entity_key,
      row.action,
      row.admin_email ?? "",
      row.admin_user_id,
      JSON.stringify(row.before_data ?? null),
      JSON.stringify(row.after_data ?? null),
    ])),
  ];

  return new Response(buildCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=admin-content-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
