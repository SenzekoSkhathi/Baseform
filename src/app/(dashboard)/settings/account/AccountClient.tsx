"use client";

import { useEffect, useMemo, useState } from "react";

type AccountSettings = {
  fullName: string;
  phone: string;
  province: string;
  fieldOfInterest: string;
  schoolName: string;
  gradeYear: "Grade 11" | "Grade 12" | "";
  financialNeed: "yes" | "no" | "";
  guardianName: string;
  guardianPhone: string;
  guardianWhatsapp: string;
  guardianRelationship: string;
  guardianEmail: string;
};

type Subject = {
  subjectName: string;
  mark: number;
};

const PROVINCES = [
  "Gauteng", "Western Cape", "Eastern Cape", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape",
];

const FIELDS = [
  "Engineering & Technology",
  "Health Sciences & Medicine",
  "Business & Commerce",
  "Law",
  "Education & Teaching",
  "Arts, Design & Humanities",
  "Natural Sciences",
  "Social Sciences",
  "Agriculture & Environmental",
  "IT & Computer Science",
  "Not sure yet",
];

const RELATIONSHIPS = ["Parent", "Guardian", "Grandparent", "Sibling", "Other"];
const GRADES: Array<"Grade 11" | "Grade 12"> = ["Grade 11", "Grade 12"];

const DEFAULT_ACCOUNT: AccountSettings = {
  fullName: "",
  phone: "",
  province: "",
  fieldOfInterest: "",
  schoolName: "",
  gradeYear: "",
  financialNeed: "",
  guardianName: "",
  guardianPhone: "",
  guardianWhatsapp: "",
  guardianRelationship: "",
  guardianEmail: "",
};

type SettingsResponse = {
  account?: Partial<AccountSettings>;
  subjects?: Subject[];
};

export default function AccountClient() {
  const [account, setAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [loadedAccount, setLoadedAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadedSubjects, setLoadedSubjects] = useState<Subject[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSubjects, setIsSavingSubjects] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [subjectsSaved, setSubjectsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SettingsResponse) => {
        if (!active) return;
        const merged = { ...DEFAULT_ACCOUNT, ...data.account };
        setAccount(merged);
        setLoadedAccount(merged);
        const s = data.subjects ?? [];
        setSubjects(s);
        setLoadedSubjects(s);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  function update<K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) {
    setAccount((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAccount() {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not save account settings.");
        return;
      }
      const data = (await res.json()) as { account?: Partial<AccountSettings> };
      const next = { ...DEFAULT_ACCOUNT, ...data.account };
      setAccount(next);
      setLoadedAccount(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } catch {
      setError("Could not save account settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSubjects() {
    if (subjects.length === 0) {
      setSubjectsError("Add at least one subject before saving.");
      return;
    }
    if (subjects.some((s) => !s.subjectName.trim())) {
      setSubjectsError("Every subject needs a name.");
      return;
    }
    setIsSavingSubjects(true);
    setSubjectsError(null);
    try {
      const res = await fetch("/api/student-subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: subjects.map((s) => ({ subject_name: s.subjectName.trim(), mark: Number(s.mark) || 0 })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setSubjectsError(body?.error ?? "Could not save subjects.");
        return;
      }
      setLoadedSubjects(subjects);
      setSubjectsSaved(true);
      setTimeout(() => setSubjectsSaved(false), 1400);
    } catch {
      setSubjectsError("Could not save subjects.");
    } finally {
      setIsSavingSubjects(false);
    }
  }

  function addSubject() {
    setSubjects((prev) => [...prev, { subjectName: "", mark: 0 }]);
  }

  function updateSubject(index: number, patch: Partial<Subject>) {
    setSubjects((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSubject(index: number) {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  }

  const hasAccountChanges = useMemo(
    () =>
      (Object.keys(DEFAULT_ACCOUNT) as (keyof AccountSettings)[]).some(
        (k) => account[k] !== loadedAccount[k],
      ),
    [account, loadedAccount],
  );

  const hasSubjectsChanges = useMemo(() => {
    if (subjects.length !== loadedSubjects.length) return true;
    return subjects.some((s, i) => {
      const loaded = loadedSubjects[i];
      return !loaded || s.subjectName !== loaded.subjectName || Number(s.mark) !== Number(loaded.mark);
    });
  }, [subjects, loadedSubjects]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-black text-gray-900">Account</h1>
        <p className="mt-0.5 text-sm text-gray-500">Keep your profile details up to date.</p>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  value={account.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Your full name"
                  className={INPUT}
                />
              </Field>

              <Field label="Phone number">
                <input
                  value={account.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="e.g. 082 000 0000"
                  className={INPUT}
                />
              </Field>

              <Field label="School name">
                <input
                  value={account.schoolName}
                  onChange={(e) => update("schoolName", e.target.value)}
                  placeholder="e.g. Rondebosch Boys' High School"
                  className={INPUT}
                />
              </Field>

              <Field label="Current grade">
                <div className="grid grid-cols-2 gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => update("gradeYear", account.gradeYear === g ? "" : g)}
                      className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                        account.gradeYear === g
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-gray-200 text-gray-600 hover:border-orange-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Province">
                <select
                  value={account.province}
                  onChange={(e) => update("province", e.target.value)}
                  className={INPUT}
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>

              <Field label="Field of interest">
                <select
                  value={account.fieldOfInterest}
                  onChange={(e) => update("fieldOfInterest", e.target.value)}
                  className={INPUT}
                >
                  <option value="">Select field</option>
                  {FIELDS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </Field>

              <Field label="Financial need">
                <div className="grid grid-cols-2 gap-2">
                  {(["yes", "no"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update("financialNeed", account.financialNeed === opt ? "" : opt)}
                      className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                        account.financialNeed === opt
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-gray-200 text-gray-600 hover:border-orange-300"
                      }`}
                    >
                      {opt === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <h2 className="mt-8 text-sm font-bold text-gray-900">Parent / Guardian</h2>
            <p className="mt-0.5 text-xs text-gray-500">We&apos;ll use these details for deadline reminders and status updates.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Guardian full name">
                <input
                  value={account.guardianName}
                  onChange={(e) => update("guardianName", e.target.value)}
                  placeholder="e.g. Nomsa Dlamini"
                  className={INPUT}
                />
              </Field>

              <Field label="Relationship">
                <select
                  value={account.guardianRelationship}
                  onChange={(e) => update("guardianRelationship", e.target.value)}
                  className={INPUT}
                >
                  <option value="">Select</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>

              <Field label="Phone number">
                <input
                  value={account.guardianPhone}
                  onChange={(e) => update("guardianPhone", e.target.value)}
                  placeholder="e.g. 082 555 1234"
                  className={INPUT}
                />
              </Field>

              <Field label="WhatsApp number">
                <input
                  value={account.guardianWhatsapp}
                  onChange={(e) => update("guardianWhatsapp", e.target.value)}
                  placeholder="e.g. 082 555 1234"
                  className={INPUT}
                />
              </Field>

              <Field label="Email (optional)">
                <input
                  type="email"
                  value={account.guardianEmail}
                  onChange={(e) => update("guardianEmail", e.target.value)}
                  placeholder="parent@example.com"
                  className={INPUT}
                />
              </Field>
            </div>
          </>
        )}

        {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
        {saved && <p className="mt-3 text-xs font-semibold text-green-600">Saved successfully</p>}

        {!isLoading && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveAccount}
              disabled={!hasAccountChanges || isSaving}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => { setAccount(loadedAccount); setError(null); }}
              disabled={!hasAccountChanges || isSaving}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-gray-900">Subjects &amp; marks</h2>
            <p className="mt-0.5 text-sm text-gray-500">Your marks drive your APS and bursary matches.</p>
          </div>
          <button
            type="button"
            onClick={addSubject}
            className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            + Add subject
          </button>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-400">Loading…</p>
        ) : subjects.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No subjects yet — add one to start.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {subjects.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={s.subjectName}
                  onChange={(e) => updateSubject(i, { subjectName: e.target.value })}
                  placeholder="Subject name"
                  className={`${INPUT} flex-1`}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={s.mark || ""}
                  onChange={(e) => updateSubject(i, { mark: Number(e.target.value) })}
                  placeholder="%"
                  className={`${INPUT} w-20 text-center`}
                />
                <button
                  type="button"
                  onClick={() => removeSubject(i)}
                  aria-label="Remove subject"
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-500 hover:border-red-200 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {subjectsError && <p className="mt-3 text-xs font-semibold text-red-600">{subjectsError}</p>}
        {subjectsSaved && <p className="mt-3 text-xs font-semibold text-green-600">Subjects updated</p>}

        {!isLoading && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveSubjects}
              disabled={!hasSubjectsChanges || isSavingSubjects}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingSubjects ? "Saving…" : "Save subjects"}
            </button>
            <button
              type="button"
              onClick={() => { setSubjects(loadedSubjects); setSubjectsError(null); }}
              disabled={!hasSubjectsChanges || isSavingSubjects}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 placeholder:text-gray-400 focus:ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      {children}
    </label>
  );
}
