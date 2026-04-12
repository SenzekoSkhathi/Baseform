import type { ContentAuditEntry } from "../types";

type ContentAuditSectionProps = {
  contentAudit: ContentAuditEntry[];
  contentAuditEntityType: string;
  onContentAuditEntityTypeChange: (value: string) => void;
  contentAuditAction: string;
  onContentAuditActionChange: (value: string) => void;
  contentAuditFrom: string;
  onContentAuditFromChange: (value: string) => void;
  contentAuditTo: string;
  onContentAuditToChange: (value: string) => void;
  onExportContentAuditCsv: () => void;
};

export function ContentAuditSection(props: ContentAuditSectionProps) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">Content Edit History</h2>
      <p className="mt-1 text-xs text-gray-500">Recent plan and site-setting changes, including imports and deletions.</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">This log captures the last admin action for each content edit so you can review before/after values when something changes unexpectedly.</p>
        <button type="button" onClick={props.onExportContentAuditCsv} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Export CSV</button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">Entity type</span>
          <select value={props.contentAuditEntityType} onChange={(e) => props.onContentAuditEntityTypeChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900">
            <option value="all">All types</option>
            <option value="plan">Plans</option>
            <option value="site_setting">Site settings</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">Action</span>
          <select value={props.contentAuditAction} onChange={(e) => props.onContentAuditActionChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900">
            <option value="all">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="import">Import</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">From</span>
          <input type="date" value={props.contentAuditFrom} onChange={(e) => props.onContentAuditFromChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
        </label>
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">To</span>
          <input type="date" value={props.contentAuditTo} onChange={(e) => props.onContentAuditToChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
        </label>
      </div>

      {props.contentAudit.length > 0 ? (
        <div className="mt-3 space-y-2">
          {props.contentAudit.map((entry) => (
            <details key={`${entry.entity_type}-${entry.entity_key}-${entry.created_at}`} className="rounded-xl border border-gray-100 bg-white p-3">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-xs text-gray-700">
                <span className="font-semibold text-gray-900">{entry.entity_type} · {entry.entity_key}</span>
                <span>{entry.action} · {entry.created_at}</span>
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Before</p>
                  <pre className="mt-1 overflow-auto rounded-lg bg-gray-50 p-3 text-[11px] text-gray-700">{JSON.stringify(entry.before_data, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">After</p>
                  <pre className="mt-1 overflow-auto rounded-lg bg-gray-50 p-3 text-[11px] text-gray-700">{JSON.stringify(entry.after_data, null, 2)}</pre>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">Edited by {entry.admin_email ?? entry.admin_user_id}</p>
            </details>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">No content edits recorded yet.</p>
      )}
    </section>
  );
}
