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
    .from("admin_pricing_plans")
    .select("slug,name,price,period,tagline,features,available,recommended,sort_order,updated_at")
    .order("sort_order", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = [
    ["slug", "name", "price", "period", "tagline", "features", "available", "recommended", "sort_order", "updated_at"],
    ...((data ?? []).map((plan) => [
      plan.slug,
      plan.name,
      plan.price,
      plan.period,
      plan.tagline,
      Array.isArray(plan.features) ? plan.features.join("\n") : "",
      plan.available,
      plan.recommended,
      plan.sort_order,
      plan.updated_at ?? "",
    ])),
  ];

  return new Response(buildCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=admin-plans-${new Date().toISOString().slice(0, 10)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
