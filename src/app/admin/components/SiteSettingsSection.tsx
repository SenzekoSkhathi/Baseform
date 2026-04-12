import { isProtectedSiteSettingKey } from "@/lib/admin/contentAdmin";
import type { NewSettingDraft, SiteSetting } from "../types";

type SiteSettingsSectionProps = {
  saving: string | null;
  newSetting: NewSettingDraft;
  onNewSettingFieldChange: <K extends keyof NewSettingDraft>(field: K, value: NewSettingDraft[K]) => void;
  onAddSetting: () => void;
  settingsQuery: string;
  onSettingsQueryChange: (value: string) => void;
  settings: SiteSetting[];
  onSettingDescriptionChange: (key: string, description: string) => void;
  onSettingValueChange: (key: string, value: string) => void;
  onSaveSetting: (setting: SiteSetting) => void;
  onDeleteSetting: (key: string) => void;
  onExportCsv: () => void;
  onImportCsv: (file: File | null | undefined) => void;
};

export function SiteSettingsSection(props: SiteSettingsSectionProps) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">Frontend Site Settings</h2>
      <p className="mt-1 text-xs text-gray-500">Edit key frontend content values as JSON. Add new keys or remove old keys.</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">Protected homepage keys cannot be deleted, but they can still be updated or restored from CSV.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={props.onExportCsv} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Export CSV</button>
          <label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => props.onImportCsv(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-[180px_1fr_140px]">
        <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Key (e.g. home_features)" value={props.newSetting.key} onChange={(e) => props.onNewSettingFieldChange("key", e.target.value)} />
        <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Description" value={props.newSetting.description} onChange={(e) => props.onNewSettingFieldChange("description", e.target.value)} />
        <button type="button" onClick={props.onAddSetting} disabled={props.saving === "new-setting" || !props.newSetting.key.trim()} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add setting</button>
        <textarea className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 md:col-span-3" rows={4} placeholder='JSON value, e.g. ["a", "b"] or {"x":1}' value={props.newSetting.value} onChange={(e) => props.onNewSettingFieldChange("value", e.target.value)} />
      </div>

      <div className="mt-3">
        <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Search setting key or description" value={props.settingsQuery} onChange={(e) => props.onSettingsQueryChange(e.target.value)} />
      </div>

      <div className="mt-3 space-y-3">
        {props.settings.map((setting) => (
          <div key={setting.key} className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="grid gap-2 md:grid-cols-[220px_1fr_160px]">
              <div className="flex items-center gap-2">
                <input className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={setting.key} readOnly />
                {isProtectedSiteSettingKey(setting.key) ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Protected</span> : null}
              </div>
              <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={setting.description ?? ""} onChange={(e) => props.onSettingDescriptionChange(setting.key, e.target.value)} />
              <div className="flex gap-1">
                <button type="button" onClick={() => props.onSaveSetting(setting)} disabled={props.saving === `setting-${setting.key}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                <button type="button" onClick={() => props.onDeleteSetting(setting.key)} disabled={props.saving === `setting-del-${setting.key}` || isProtectedSiteSettingKey(setting.key)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Delete</button>
              </div>
            </div>

            <textarea
              className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 font-mono text-xs text-gray-900 placeholder:text-gray-400"
              rows={6}
              value={typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value, null, 2)}
              onChange={(e) => props.onSettingValueChange(setting.key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
