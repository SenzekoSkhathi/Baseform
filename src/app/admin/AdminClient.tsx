"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type MetricDaily = { day: string; signups: number; applications: number; tokens: number };
type MetricsResponse = {
  totals: { users: number; applications: number; tokens: number; waitlist: number; bursaryTracking: number };
  daily: MetricDaily[];
  statusBreakdown: Record<string, number>;
  provinceDistribution: { province: string; count: number }[];
  funnel: { signups: number; createdApplications: number; submittedApplications: number };
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  tier: string | null;
  created_at: string | null;
};

type University = {
  id: string;
  name: string;
  abbreviation: string | null;
  province: string | null;
  city: string | null;
  application_fee: number | null;
  closing_date: string | null;
  website_url: string | null;
  application_url: string | null;
  is_active: boolean;
};

type Programme = {
  id: string;
  name: string;
  university_id: string;
  aps_minimum: number;
  field_of_study: string | null;
  qualification_type: string | null;
  duration_years: number | null;
  additional_requirements: string | null;
};

type Bursary = {
  id: string;
  name: string;
  sponsor: string | null;
  minimum_aps: number | null;
  amount_min: number | null;
  amount_max: number | null;
  closing_date: string | null;
  website: string | null;
  provinces_eligible: string[] | null;
  fields_of_study: string | null;
  is_active: boolean;
};

type ToastState = { type: "success" | "error"; message: string } | null;
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

export default function AdminClient() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [bursaries, setBursaries] = useState<Bursary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [userQuery, setUserQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [userSort, setUserSort] = useState<{ key: keyof AdminUser; direction: SortDirection }>({ key: "created_at", direction: "desc" });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [uniQuery, setUniQuery] = useState("");
  const [uniPage, setUniPage] = useState(1);
  const [uniSort, setUniSort] = useState<{ key: keyof University; direction: SortDirection }>({ key: "name", direction: "asc" });
  const [selectedUniIds, setSelectedUniIds] = useState<string[]>([]);

  const [progQuery, setProgQuery] = useState("");
  const [progPage, setProgPage] = useState(1);
  const [progSort, setProgSort] = useState<{ key: keyof Programme; direction: SortDirection }>({ key: "name", direction: "asc" });

  const [bursQuery, setBursQuery] = useState("");
  const [bursPage, setBursPage] = useState(1);
  const [bursSort, setBursSort] = useState<{ key: keyof Bursary; direction: SortDirection }>({ key: "name", direction: "asc" });
  const [selectedBursaryIds, setSelectedBursaryIds] = useState<string[]>([]);

  const [newUniversity, setNewUniversity] = useState({
    name: "",
    abbreviation: "",
    province: "",
    city: "",
    application_fee: "",
    website_url: "",
    application_url: "",
    is_active: true,
  });

  const [newProgramme, setNewProgramme] = useState({
    name: "",
    university_id: "",
    aps_minimum: "",
    field_of_study: "",
    qualification_type: "",
    duration_years: "",
  });

  const [newBursary, setNewBursary] = useState({
    name: "",
    sponsor: "",
    minimum_aps: "",
    amount_min: "",
    amount_max: "",
    closing_date: "",
    website: "",
    fields_of_study: "",
    is_active: true,
  });

  function pushToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2600);
  }

  async function readJsonSafe(res: Response) {
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || "Request failed");
    return payload;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [mRes, uRes, uniRes, pRes, bRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/users"),
        fetch("/api/admin/content/universities"),
        fetch("/api/admin/content/programmes"),
        fetch("/api/admin/content/bursaries"),
      ]);

      setMetrics((await readJsonSafe(mRes)) as MetricsResponse);
      setUsers((await readJsonSafe(uRes)) as AdminUser[]);
      setUniversities((await readJsonSafe(uniRes)) as University[]);
      setProgrammes((await readJsonSafe(pRes)) as Programme[]);
      setBursaries((await readJsonSafe(bRes)) as Bursary[]);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const maxTokenDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.tokens) ?? [])), [metrics]);
  const maxSignupDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.signups) ?? [])), [metrics]);
  const maxApplicationDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.applications) ?? [])), [metrics]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const base = users.filter((u) => {
      const matchesTier = tierFilter === "all" || (u.tier ?? "free") === tierFilter;
      if (!matchesTier) return false;
      if (!q) return true;
      return (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
    });
    return sortBy(base, userSort.key, userSort.direction);
  }, [users, userQuery, tierFilter, userSort]);

  const filteredUniversities = useMemo(() => {
    const q = uniQuery.trim().toLowerCase();
    const base = universities.filter((u) => {
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || (u.abbreviation ?? "").toLowerCase().includes(q) || (u.province ?? "").toLowerCase().includes(q);
    });
    return sortBy(base, uniSort.key, uniSort.direction);
  }, [universities, uniQuery, uniSort]);

  const filteredProgrammes = useMemo(() => {
    const q = progQuery.trim().toLowerCase();
    const base = programmes.filter((p) => {
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.field_of_study ?? "").toLowerCase().includes(q);
    });
    return sortBy(base, progSort.key, progSort.direction);
  }, [programmes, progQuery, progSort]);

  const filteredBursaries = useMemo(() => {
    const q = bursQuery.trim().toLowerCase();
    const base = bursaries.filter((b) => {
      if (!q) return true;
      return b.name.toLowerCase().includes(q) || (b.sponsor ?? "").toLowerCase().includes(q);
    });
    return sortBy(base, bursSort.key, bursSort.direction);
  }, [bursaries, bursQuery, bursSort]);

  const pagedUsers = paginate(filteredUsers, userPage, PAGE_SIZE);
  const pagedUniversities = paginate(filteredUniversities, uniPage, PAGE_SIZE);
  const pagedProgrammes = paginate(filteredProgrammes, progPage, PAGE_SIZE);
  const pagedBursaries = paginate(filteredBursaries, bursPage, PAGE_SIZE);

  useEffect(() => setSelectedUserIds([]), [userPage, userQuery, tierFilter]);
  useEffect(() => setSelectedUniIds([]), [uniPage, uniQuery]);
  useEffect(() => setSelectedBursaryIds([]), [bursPage, bursQuery]);

  function toggleSort<T>(setSort: (value: { key: keyof T; direction: SortDirection }) => void, current: { key: keyof T; direction: SortDirection }, key: keyof T) {
    if (current.key === key) {
      setSort({ key, direction: current.direction === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key, direction: "asc" });
    }
  }

  async function updateUserTier(userId: string, tier: string) {
    setSaving(`user-${userId}`);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      await readJsonSafe(res);
      pushToast("success", "User tier updated.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not update user");
    } finally {
      setSaving(null);
    }
  }

  async function bulkDisableUsers() {
    if (selectedUserIds.length === 0) return;
    if (!window.confirm(`Disable ${selectedUserIds.length} selected user(s)?`)) return;

    setSaving("users-bulk-disable");
    try {
      await Promise.all(
        selectedUserIds.map((userId) =>
          fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, tier: "disabled" }),
          }).then(readJsonSafe)
        )
      );
      pushToast("success", "Selected users disabled.");
      await loadAll();
      setSelectedUserIds([]);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not disable selected users");
    } finally {
      setSaving(null);
    }
  }

  async function saveUniversity(uni: University) {
    if (!uni.name.trim()) return pushToast("error", "University name is required.");

    setSaving(`uni-${uni.id}`);
    try {
      const res = await fetch("/api/admin/content/universities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: uni.id,
          name: uni.name.trim(),
          abbreviation: uni.abbreviation,
          province: uni.province,
          city: uni.city,
          application_fee: uni.application_fee,
          website_url: uni.website_url,
          application_url: uni.application_url,
          is_active: uni.is_active,
        }),
      });
      await readJsonSafe(res);
      pushToast("success", "University saved.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not save university");
    } finally {
      setSaving(null);
    }
  }

  async function deleteUniversity(id: string, name: string) {
    if (!window.confirm(`Delete university \"${name}\"? This can affect related records.`)) return;
    setSaving(`uni-del-${id}`);
    try {
      const res = await fetch("/api/admin/content/universities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await readJsonSafe(res);
      pushToast("success", "University deleted.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not delete university");
    } finally {
      setSaving(null);
    }
  }

  async function archiveSelectedUniversities() {
    if (selectedUniIds.length === 0) return;
    if (!window.confirm(`Archive ${selectedUniIds.length} selected university record(s)?`)) return;

    setSaving("uni-bulk-archive");
    try {
      await Promise.all(
        selectedUniIds.map((id) =>
          fetch("/api/admin/content/universities", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, is_active: false }),
          }).then(readJsonSafe)
        )
      );
      pushToast("success", "Selected universities archived.");
      await loadAll();
      setSelectedUniIds([]);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not archive selected universities");
    } finally {
      setSaving(null);
    }
  }

  async function addUniversity() {
    if (!newUniversity.name.trim()) return pushToast("error", "University name is required.");

    setSaving("new-uni");
    try {
      const res = await fetch("/api/admin/content/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUniversity.name.trim(),
          abbreviation: newUniversity.abbreviation || null,
          province: newUniversity.province || null,
          city: newUniversity.city || null,
          application_fee: newUniversity.application_fee ? Number(newUniversity.application_fee) : null,
          website_url: newUniversity.website_url || null,
          application_url: newUniversity.application_url || null,
          is_active: newUniversity.is_active,
        }),
      });
      await readJsonSafe(res);
      setNewUniversity({ name: "", abbreviation: "", province: "", city: "", application_fee: "", website_url: "", application_url: "", is_active: true });
      pushToast("success", "University created.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not create university");
    } finally {
      setSaving(null);
    }
  }

  async function saveProgramme(programme: Programme) {
    if (!programme.name.trim()) return pushToast("error", "Programme name is required.");

    setSaving(`prog-${programme.id}`);
    try {
      const res = await fetch("/api/admin/content/programmes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...programme, id: programme.id, name: programme.name.trim() }),
      });
      await readJsonSafe(res);
      pushToast("success", "Programme saved.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not save programme");
    } finally {
      setSaving(null);
    }
  }

  async function deleteProgramme(id: string, name: string) {
    if (!window.confirm(`Delete programme \"${name}\"?`)) return;
    setSaving(`prog-del-${id}`);
    try {
      const res = await fetch("/api/admin/content/programmes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await readJsonSafe(res);
      pushToast("success", "Programme deleted.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not delete programme");
    } finally {
      setSaving(null);
    }
  }

  async function addProgramme() {
    if (!newProgramme.name.trim()) return pushToast("error", "Programme name is required.");
    if (!newProgramme.university_id) return pushToast("error", "Select a university.");

    setSaving("new-prog");
    try {
      const res = await fetch("/api/admin/content/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProgramme.name.trim(),
          university_id: newProgramme.university_id,
          aps_minimum: newProgramme.aps_minimum ? Number(newProgramme.aps_minimum) : 0,
          field_of_study: newProgramme.field_of_study || null,
          qualification_type: newProgramme.qualification_type || null,
          duration_years: newProgramme.duration_years ? Number(newProgramme.duration_years) : null,
        }),
      });
      await readJsonSafe(res);
      setNewProgramme({ name: "", university_id: "", aps_minimum: "", field_of_study: "", qualification_type: "", duration_years: "" });
      pushToast("success", "Programme created.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not create programme");
    } finally {
      setSaving(null);
    }
  }

  async function saveBursary(bursary: Bursary) {
    if (!bursary.name.trim()) return pushToast("error", "Bursary name is required.");

    setSaving(`burs-${bursary.id}`);
    try {
      const res = await fetch("/api/admin/content/bursaries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bursary, id: bursary.id, name: bursary.name.trim() }),
      });
      await readJsonSafe(res);
      pushToast("success", "Bursary saved.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not save bursary");
    } finally {
      setSaving(null);
    }
  }

  async function deleteBursary(id: string, name: string) {
    if (!window.confirm(`Delete bursary \"${name}\"?`)) return;
    setSaving(`burs-del-${id}`);
    try {
      const res = await fetch("/api/admin/content/bursaries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await readJsonSafe(res);
      pushToast("success", "Bursary deleted.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not delete bursary");
    } finally {
      setSaving(null);
    }
  }

  async function archiveSelectedBursaries() {
    if (selectedBursaryIds.length === 0) return;
    if (!window.confirm(`Archive ${selectedBursaryIds.length} selected bursary record(s)?`)) return;

    setSaving("burs-bulk-archive");
    try {
      await Promise.all(
        selectedBursaryIds.map((id) =>
          fetch("/api/admin/content/bursaries", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, is_active: false }),
          }).then(readJsonSafe)
        )
      );
      pushToast("success", "Selected bursaries archived.");
      await loadAll();
      setSelectedBursaryIds([]);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not archive selected bursaries");
    } finally {
      setSaving(null);
    }
  }

  async function addBursary() {
    if (!newBursary.name.trim()) return pushToast("error", "Bursary name is required.");

    setSaving("new-burs");
    try {
      const res = await fetch("/api/admin/content/bursaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBursary.name.trim(),
          sponsor: newBursary.sponsor || null,
          minimum_aps: newBursary.minimum_aps ? Number(newBursary.minimum_aps) : 0,
          amount_min: newBursary.amount_min ? Number(newBursary.amount_min) : null,
          amount_max: newBursary.amount_max ? Number(newBursary.amount_max) : null,
          closing_date: newBursary.closing_date || null,
          website: newBursary.website || null,
          fields_of_study: newBursary.fields_of_study || null,
          provinces_eligible: ["All"],
          is_active: newBursary.is_active,
        }),
      });
      await readJsonSafe(res);
      setNewBursary({ name: "", sponsor: "", minimum_aps: "", amount_min: "", amount_max: "", closing_date: "", website: "", fields_of_study: "", is_active: true });
      pushToast("success", "Bursary created.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not create bursary");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#fff9f2] p-8 text-sm text-gray-600">Loading admin dashboard...</div>;

  const userAllChecked = pagedUsers.items.length > 0 && pagedUsers.items.every((u) => selectedUserIds.includes(u.id));
  const uniAllChecked = pagedUniversities.items.length > 0 && pagedUniversities.items.every((u) => selectedUniIds.includes(u.id));
  const bursAllChecked = pagedBursaries.items.length > 0 && pagedBursaries.items.every((b) => selectedBursaryIds.includes(b.id));

  return (
    <div className="min-h-screen bg-[#fff9f2] px-4 pb-10 pt-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {toast && <div className={`rounded-xl border px-3 py-2 text-sm ${toast.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{toast.message}</div>}

        <div className="rounded-3xl border border-orange-100 bg-white/95 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Platform operations: users, content, and AI usage.</p>
            </div>
            <Link href="/dashboard" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Back to app</Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total users" value={String(metrics?.totals.users ?? 0)} />
            <StatCard label="Applications" value={String(metrics?.totals.applications ?? 0)} />
            <StatCard label="BaseBot tokens" value={(metrics?.totals.tokens ?? 0).toLocaleString("en-ZA")} />
            <StatCard label="Waitlist" value={String(metrics?.totals.waitlist ?? 0)} />
            <StatCard label="Bursary tracks" value={String(metrics?.totals.bursaryTracking ?? 0)} />
          </div>

          {/* Funnel */}
          {metrics?.funnel && (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
              <p className="mb-3 text-sm font-bold text-gray-900">Conversion funnel</p>
              <div className="flex items-end gap-2">
                {[
                  { label: "Signups", value: metrics.funnel.signups, color: "bg-orange-500" },
                  { label: "Created app", value: metrics.funnel.createdApplications, color: "bg-blue-500" },
                  { label: "Submitted", value: metrics.funnel.submittedApplications, color: "bg-emerald-500" },
                ].map((step, i, arr) => {
                  const pct = arr[0].value > 0 ? Math.round((step.value / arr[0].value) * 100) : 0;
                  return (
                    <div key={step.label} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-gray-700">{step.value}</span>
                      <div className="w-full rounded-lg bg-gray-100" style={{ height: 48 }}>
                        <div className={`w-full rounded-lg ${step.color}`} style={{ height: `${Math.max(4, pct)}%`, minHeight: 4 }} />
                      </div>
                      <span className="text-center text-[10px] text-gray-500">{step.label}</span>
                      <span className="text-[10px] font-bold text-gray-400">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status breakdown + Province distribution side-by-side */}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {metrics?.statusBreakdown && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="mb-3 text-sm font-bold text-gray-900">Application statuses</p>
                <div className="space-y-2">
                  {Object.entries(metrics.statusBreakdown).map(([status, count]) => {
                    const total = Object.values(metrics.statusBreakdown).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const colors: Record<string, string> = {
                      planning: "bg-gray-400", in_progress: "bg-blue-500",
                      submitted: "bg-purple-500", accepted: "bg-emerald-500",
                      rejected: "bg-red-500", waitlisted: "bg-amber-500",
                    };
                    return (
                      <div key={status} className="grid grid-cols-[100px_1fr_40px] items-center gap-2">
                        <p className="text-xs capitalize text-gray-500">{status.replace("_", " ")}</p>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className={`h-2 rounded-full ${colors[status] ?? "bg-gray-400"}`} style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                        <p className="text-right text-xs font-semibold text-gray-700">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {metrics?.provinceDistribution && metrics.provinceDistribution.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="mb-3 text-sm font-bold text-gray-900">Users by province</p>
                <div className="space-y-2">
                  {metrics.provinceDistribution.slice(0, 9).map(({ province, count }) => {
                    const max = metrics.provinceDistribution[0]?.count ?? 1;
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={province} className="grid grid-cols-[120px_1fr_40px] items-center gap-2">
                        <p className="truncate text-xs text-gray-500">{province}</p>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-orange-400" style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                        <p className="text-right text-xs font-semibold text-gray-700">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-sm font-bold text-gray-900">BaseBot token usage by day</p>
            <div className="mt-3 space-y-2">
              {(metrics?.daily ?? []).slice(-14).map((point) => (
                <div key={point.day} className="grid grid-cols-[90px_1fr_70px] items-center gap-2">
                  <p className="text-xs text-gray-500">{point.day.slice(5)}</p>
                  <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.max(2, Math.round((point.tokens / maxTokenDay) * 100))}%` }} /></div>
                  <p className="text-right text-xs font-semibold text-gray-700">{point.tokens}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ChartCard title="Signups per day" color="bg-blue-500" max={maxSignupDay} points={(metrics?.daily ?? []).slice(-14).map((p) => ({ key: `signup-${p.day}`, label: p.day.slice(5), value: p.signups }))} />
            <ChartCard title="Applications created per day" color="bg-emerald-500" max={maxApplicationDay} points={(metrics?.daily ?? []).slice(-14).map((p) => ({ key: `apps-${p.day}`, label: p.day.slice(5), value: p.applications }))} />
          </div>
        </div>

        <SectionCard title="User Management" subtitle="Search, filter, sort, bulk disable, and update tiers.">
          <div className="mb-3 grid gap-2 md:grid-cols-[1fr_160px]">
            <input value={userQuery} onChange={(e) => { setUserQuery(e.target.value); setUserPage(1); }} placeholder="Search by name or email" className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" />
            <select value={tierFilter} onChange={(e) => { setTierFilter(e.target.value); setUserPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900">
              <option value="all">All tiers</option><option value="free">free</option><option value="pro">pro</option><option value="admin">admin</option><option value="disabled">disabled</option>
            </select>
          </div>

          <div className="mb-2 flex items-center justify-end">
            <button type="button" onClick={bulkDisableUsers} disabled={saving === "users-bulk-disable" || selectedUserIds.length === 0} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Disable selected ({selectedUserIds.length})</button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="px-2 py-2"><input type="checkbox" checked={userAllChecked} onChange={(e) => setSelectedUserIds(e.target.checked ? Array.from(new Set([...selectedUserIds, ...pagedUsers.items.map((u) => u.id)])) : selectedUserIds.filter((id) => !pagedUsers.items.some((u) => u.id === id)))} /></th>
                  <th className="px-2 py-2"><SortHeader label="Name" active={userSort.key === "full_name"} direction={userSort.direction} onClick={() => toggleSort<AdminUser>(setUserSort, userSort, "full_name")} /></th>
                  <th className="px-2 py-2"><SortHeader label="Email" active={userSort.key === "email"} direction={userSort.direction} onClick={() => toggleSort<AdminUser>(setUserSort, userSort, "email")} /></th>
                  <th className="px-2 py-2"><SortHeader label="Tier" active={userSort.key === "tier"} direction={userSort.direction} onClick={() => toggleSort<AdminUser>(setUserSort, userSort, "tier")} /></th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.items.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50">
                    <td className="px-2 py-2"><input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={(e) => setSelectedUserIds((prev) => e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id))} /></td>
                    <td className="px-2 py-2 font-medium text-gray-800">{user.full_name || "—"}</td>
                    <td className="px-2 py-2 text-gray-600">{user.email || "—"}</td>
                    <td className="px-2 py-2">
                      <select value={user.tier ?? "free"} onChange={(e) => setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, tier: e.target.value } : u)))} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-900">
                        <option value="free">free</option><option value="pro">pro</option><option value="admin">admin</option><option value="disabled">disabled</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => updateUserTier(user.id, user.tier ?? "free")} disabled={saving === `user-${user.id}`} className="rounded-lg bg-orange-500 px-2 py-1 text-white disabled:opacity-50">Save</button>
                        <button type="button" onClick={() => updateUserTier(user.id, "disabled")} disabled={saving === `user-${user.id}`} className="rounded-lg bg-red-600 px-2 py-1 text-white disabled:opacity-50">Disable</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={userPage} totalPages={pagedUsers.totalPages} onPageChange={setUserPage} />
        </SectionCard>

        <SectionCard title="Universities" subtitle="Add, search, sort, edit, archive, and delete universities.">
          <div className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-4">
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Name" value={newUniversity.name} onChange={(e) => setNewUniversity((p) => ({ ...p, name: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Abbr" value={newUniversity.abbreviation} onChange={(e) => setNewUniversity((p) => ({ ...p, abbreviation: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Province" value={newUniversity.province} onChange={(e) => setNewUniversity((p) => ({ ...p, province: e.target.value }))} />
            <button type="button" onClick={addUniversity} disabled={saving === "new-uni" || !newUniversity.name.trim()} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add university</button>
          </div>

          <div className="mt-3"><input value={uniQuery} onChange={(e) => { setUniQuery(e.target.value); setUniPage(1); }} placeholder="Search universities" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" /></div>
          <div className="mb-2 mt-2 flex items-center justify-end">
            <button type="button" onClick={archiveSelectedUniversities} disabled={saving === "uni-bulk-archive" || selectedUniIds.length === 0} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Archive selected ({selectedUniIds.length})</button>
          </div>

          <div className="mt-3 space-y-2">
            {pagedUniversities.items.map((uni) => (
              <div key={uni.id} className="grid items-center gap-2 rounded-xl border border-gray-100 bg-white p-2 md:grid-cols-[24px_1fr_110px_100px_170px]">
                <input type="checkbox" checked={selectedUniIds.includes(uni.id)} onChange={(e) => setSelectedUniIds((prev) => e.target.checked ? [...prev, uni.id] : prev.filter((id) => id !== uni.id))} />
                <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={uni.name} onChange={(e) => setUniversities((prev) => prev.map((u) => (u.id === uni.id ? { ...u, name: e.target.value } : u)))} />
                <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={uni.abbreviation ?? ""} onChange={(e) => setUniversities((prev) => prev.map((u) => (u.id === uni.id ? { ...u, abbreviation: e.target.value } : u)))} />
                <input type="number" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={uni.application_fee ?? ""} onChange={(e) => setUniversities((prev) => prev.map((u) => (u.id === uni.id ? { ...u, application_fee: e.target.value ? Number(e.target.value) : null } : u)))} />
                <div className="flex gap-1">
                  <button type="button" onClick={() => saveUniversity(uni)} disabled={saving === `uni-${uni.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => deleteUniversity(uni.id, uni.name)} disabled={saving === `uni-del-${uni.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <SortHeader label="Sort by name" active={uniSort.key === "name"} direction={uniSort.direction} onClick={() => toggleSort<University>(setUniSort, uniSort, "name")} />
            <SortHeader label="Sort by fee" active={uniSort.key === "application_fee"} direction={uniSort.direction} onClick={() => toggleSort<University>(setUniSort, uniSort, "application_fee")} />
          </div>

          <Pagination page={uniPage} totalPages={pagedUniversities.totalPages} onPageChange={setUniPage} />
        </SectionCard>

        <SectionCard title="Programmes" subtitle="Add, search, sort, edit, and delete programmes.">
          <div className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-5">
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Name" value={newProgramme.name} onChange={(e) => setNewProgramme((p) => ({ ...p, name: e.target.value }))} />
            <select className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900" value={newProgramme.university_id} onChange={(e) => setNewProgramme((p) => ({ ...p, university_id: e.target.value }))}>
              <option value="">University</option>
              {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="APS" value={newProgramme.aps_minimum} onChange={(e) => setNewProgramme((p) => ({ ...p, aps_minimum: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Field" value={newProgramme.field_of_study} onChange={(e) => setNewProgramme((p) => ({ ...p, field_of_study: e.target.value }))} />
            <button type="button" onClick={addProgramme} disabled={saving === "new-prog" || !newProgramme.name.trim() || !newProgramme.university_id} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add programme</button>
          </div>

          <div className="mt-3"><input value={progQuery} onChange={(e) => { setProgQuery(e.target.value); setProgPage(1); }} placeholder="Search programmes" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" /></div>

          <div className="mt-3 space-y-2">
            {pagedProgrammes.items.map((programme) => (
              <div key={programme.id} className="grid items-center gap-2 rounded-xl border border-gray-100 bg-white p-2 md:grid-cols-[1fr_90px_160px]">
                <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={programme.name} onChange={(e) => setProgrammes((prev) => prev.map((p) => (p.id === programme.id ? { ...p, name: e.target.value } : p)))} />
                <input type="number" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={programme.aps_minimum ?? 0} onChange={(e) => setProgrammes((prev) => prev.map((p) => (p.id === programme.id ? { ...p, aps_minimum: Number(e.target.value) } : p)))} />
                <div className="flex gap-1">
                  <button type="button" onClick={() => saveProgramme(programme)} disabled={saving === `prog-${programme.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => deleteProgramme(programme.id, programme.name)} disabled={saving === `prog-del-${programme.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <SortHeader label="Sort by name" active={progSort.key === "name"} direction={progSort.direction} onClick={() => toggleSort<Programme>(setProgSort, progSort, "name")} />
            <SortHeader label="Sort by APS" active={progSort.key === "aps_minimum"} direction={progSort.direction} onClick={() => toggleSort<Programme>(setProgSort, progSort, "aps_minimum")} />
          </div>

          <Pagination page={progPage} totalPages={pagedProgrammes.totalPages} onPageChange={setProgPage} />
        </SectionCard>

        <SectionCard title="Bursaries" subtitle="Add, search, sort, edit, archive, and delete bursaries.">
          <div className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-5">
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Name" value={newBursary.name} onChange={(e) => setNewBursary((p) => ({ ...p, name: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Sponsor" value={newBursary.sponsor} onChange={(e) => setNewBursary((p) => ({ ...p, sponsor: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Min APS" value={newBursary.minimum_aps} onChange={(e) => setNewBursary((p) => ({ ...p, minimum_aps: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Website" value={newBursary.website} onChange={(e) => setNewBursary((p) => ({ ...p, website: e.target.value }))} />
            <button type="button" onClick={addBursary} disabled={saving === "new-burs" || !newBursary.name.trim()} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add bursary</button>
          </div>

          <div className="mt-3"><input value={bursQuery} onChange={(e) => { setBursQuery(e.target.value); setBursPage(1); }} placeholder="Search bursaries" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" /></div>
          <div className="mb-2 mt-2 flex items-center justify-end">
            <button type="button" onClick={archiveSelectedBursaries} disabled={saving === "burs-bulk-archive" || selectedBursaryIds.length === 0} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Archive selected ({selectedBursaryIds.length})</button>
          </div>

          <div className="mt-3 space-y-2">
            {pagedBursaries.items.map((bursary) => (
              <div key={bursary.id} className="grid items-center gap-2 rounded-xl border border-gray-100 bg-white p-2 md:grid-cols-[24px_1fr_90px_160px]">
                <input type="checkbox" checked={selectedBursaryIds.includes(bursary.id)} onChange={(e) => setSelectedBursaryIds((prev) => e.target.checked ? [...prev, bursary.id] : prev.filter((id) => id !== bursary.id))} />
                <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={bursary.name} onChange={(e) => setBursaries((prev) => prev.map((b) => (b.id === bursary.id ? { ...b, name: e.target.value } : b)))} />
                <input type="number" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={bursary.minimum_aps ?? 0} onChange={(e) => setBursaries((prev) => prev.map((b) => (b.id === bursary.id ? { ...b, minimum_aps: Number(e.target.value) } : b)))} />
                <div className="flex gap-1">
                  <button type="button" onClick={() => saveBursary(bursary)} disabled={saving === `burs-${bursary.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => deleteBursary(bursary.id, bursary.name)} disabled={saving === `burs-del-${bursary.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <SortHeader label="Sort by name" active={bursSort.key === "name"} direction={bursSort.direction} onClick={() => toggleSort<Bursary>(setBursSort, bursSort, "name")} />
            <SortHeader label="Sort by APS" active={bursSort.key === "minimum_aps"} direction={bursSort.direction} onClick={() => toggleSort<Bursary>(setBursSort, bursSort, "minimum_aps")} />
          </div>

          <Pagination page={bursPage} totalPages={pagedBursaries.totalPages} onPageChange={setBursPage} />
        </SectionCard>
      </div>
    </div>
  );
}

function sortBy<T>(items: T[], key: keyof T, direction: SortDirection) {
  const sorted = [...items].sort((a, b) => {
    const av = toComparable((a as Record<string, unknown>)[String(key)]);
    const bv = toComparable((b as Record<string, unknown>)[String(key)]);
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

function toComparable(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value).toLowerCase();
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), totalPages };
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-100">
      {label}
      <span className="text-[10px] text-gray-400">{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  color,
  max,
  points,
}: {
  title: string;
  color: string;
  max: number;
  points: { key: string; label: string; value: number }[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <div className="mt-3 space-y-2">
        {points.map((point) => (
          <div key={point.key} className="grid grid-cols-[90px_1fr_50px] items-center gap-2">
            <p className="text-xs text-gray-500">{point.label}</p>
            <div className="h-2 rounded-full bg-gray-100">
              <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(2, Math.round((point.value / max) * 100))}%` }} />
            </div>
            <p className="text-right text-xs font-semibold text-gray-700">{point.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs">
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg border border-gray-200 bg-white px-2 py-1 disabled:opacity-50">Prev</button>
      <span className="text-gray-600">Page {page} of {totalPages}</span>
      <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-lg border border-gray-200 bg-white px-2 py-1 disabled:opacity-50">Next</button>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
