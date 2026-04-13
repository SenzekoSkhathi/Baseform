import type { AdminPlan, NewPlanDraft } from "../types";

type PlanManagementSectionProps = {
  saving: string | null;
  planQuery: string;
  onPlanQueryChange: (value: string) => void;
  newPlan: NewPlanDraft;
  onNewPlanFieldChange: <K extends keyof NewPlanDraft>(field: K, value: NewPlanDraft[K]) => void;
  onAddPlan: () => void;
  onExportCsv: () => void;
  onImportCsv: (file: File | null | undefined) => void;
  plans: AdminPlan[];
  onPlanFieldChange: <K extends keyof AdminPlan>(planId: string, field: K, value: AdminPlan[K]) => void;
  onPlanFeaturesChange: (planId: string, featuresText: string) => void;
  onSavePlan: (plan: AdminPlan) => void;
  onDeletePlan: (id: string, name: string) => void;
};

export function PlanManagementSection(props: PlanManagementSectionProps) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">Plan Management</h2>
      <p className="mt-1 text-xs text-gray-500">Control pricing plans shown on the frontend: add, edit, reorder, and delete.</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">Export the current plan table or import a CSV snapshot to bulk replace/update rows.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={props.onExportCsv} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Export CSV</button>
          <label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => props.onImportCsv(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-5">
        <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Slug (e.g. essential)" value={props.newPlan.slug} onChange={(e) => props.onNewPlanFieldChange("slug", e.target.value)} />
        <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Name" value={props.newPlan.name} onChange={(e) => props.onNewPlanFieldChange("name", e.target.value)} />
        <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Price (e.g. R89.99)" value={props.newPlan.price} onChange={(e) => props.onNewPlanFieldChange("price", e.target.value)} />
        <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Tagline" value={props.newPlan.tagline} onChange={(e) => props.onNewPlanFieldChange("tagline", e.target.value)} />
        <button type="button" onClick={props.onAddPlan} disabled={props.saving === "new-plan" || !props.newPlan.slug.trim() || !props.newPlan.name.trim() || !props.newPlan.price.trim()} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add plan</button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_100px_120px_120px]">
        <input className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Search plans" value={props.planQuery} onChange={(e) => props.onPlanQueryChange(e.target.value)} />
        <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Period" value={props.newPlan.period} onChange={(e) => props.onNewPlanFieldChange("period", e.target.value)} />
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700">
          <input type="checkbox" checked={props.newPlan.available} onChange={(e) => props.onNewPlanFieldChange("available", e.target.checked)} />
          Available
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700">
          <input type="checkbox" checked={props.newPlan.recommended} onChange={(e) => props.onNewPlanFieldChange("recommended", e.target.checked)} />
          Recommended
        </label>
      </div>

      <div className="mt-3 space-y-3">
        {props.plans.map((plan) => (
          <div key={plan.id} className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="grid gap-2 md:grid-cols-[120px_1fr_120px_100px_120px_140px]">
              <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.slug} onChange={(e) => props.onPlanFieldChange(plan.id, "slug", e.target.value)} />
              <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.name} onChange={(e) => props.onPlanFieldChange(plan.id, "name", e.target.value)} />
              <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.price} onChange={(e) => props.onPlanFieldChange(plan.id, "price", e.target.value)} />
              <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.period} onChange={(e) => props.onPlanFieldChange(plan.id, "period", e.target.value)} />
              <input type="number" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.sort_order} onChange={(e) => props.onPlanFieldChange(plan.id, "sort_order", Number(e.target.value))} />
              <div className="flex gap-1">
                <button type="button" onClick={() => props.onSavePlan(plan)} disabled={props.saving === `plan-${plan.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                <button type="button" onClick={() => props.onDeletePlan(plan.id, plan.name)} disabled={props.saving === `plan-del-${plan.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Delete</button>
              </div>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.tagline} onChange={(e) => props.onPlanFieldChange(plan.id, "tagline", e.target.value)} />
              <div className="flex items-center gap-4 text-xs text-gray-700">
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={plan.available} onChange={(e) => props.onPlanFieldChange(plan.id, "available", e.target.checked)} />
                  Available
                </label>
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={plan.recommended} onChange={(e) => props.onPlanFieldChange(plan.id, "recommended", e.target.checked)} />
                  Recommended
                </label>
              </div>
            </div>

            <textarea
              className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400"
              rows={4}
              value={plan.features.join("\n")}
              onChange={(e) => props.onPlanFeaturesChange(plan.id, e.target.value)}
              placeholder="One feature per line"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
