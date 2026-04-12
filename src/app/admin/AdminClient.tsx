"use client";

import { useEffect, useMemo, useState } from "react";
import { isProtectedSiteSettingKey } from "@/lib/admin/contentAdmin";
import { UserManagementSection } from "./components/UserManagementSection";
import { useAdminUserFilters } from "./hooks/useAdminUserFilters";
import {
  Pagination,
  SectionCard,
  SortHeader,
} from "./components/AdminPrimitives";
import { PlanManagementSection } from "./components/PlanManagementSection";
import { SiteSettingsSection } from "./components/SiteSettingsSection";
import { MetricsOverviewSection } from "./components/MetricsOverviewSection";
import { ContentAuditSection } from "./components/ContentAuditSection";
import { paginate, sortBy } from "./utils";
import type {
  AdminPlan,
  AdminUser,
  AlertHistoryEntry,
  AlertThresholdDraft,
  Bursary,
  ContentAuditEntry,
  DateRangePreset,
  MetricsResponse,
  Programme,
  SiteSetting,
  SortDirection,
  ToastState,
  University,
  UserPageResponse,
} from "./types";

const PAGE_SIZE = 10;

export default function AdminClient() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [bursaries, setBursaries] = useState<Bursary[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [contentAudit, setContentAudit] = useState<ContentAuditEntry[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedCustomFrom, setAppliedCustomFrom] = useState("");
  const [appliedCustomTo, setAppliedCustomTo] = useState("");
  const [alertHistorySeverity, setAlertHistorySeverity] = useState("all");
  const [alertHistoryKey, setAlertHistoryKey] = useState("all");
  const [alertHistoryFrom, setAlertHistoryFrom] = useState("");
  const [alertHistoryTo, setAlertHistoryTo] = useState("");
  const [contentAuditEntityType, setContentAuditEntityType] = useState("all");
  const [contentAuditAction, setContentAuditAction] = useState("all");
  const [contentAuditFrom, setContentAuditFrom] = useState("");
  const [contentAuditTo, setContentAuditTo] = useState("");
  const [thresholdDraft, setThresholdDraft] = useState<AlertThresholdDraft>({
    tokenCostSpikeZarPerDay: "150",
    storageGrowthBytesPerDayMb: "150",
    failedEmailScanRatePercent: "20",
    failedEmailScanMinVolume: "20",
    aiCostPer1kTokensZar: "0.08",
  });

  const {
    userQuery,
    setUserQuery,
    tierFilter,
    setTierFilter,
    userPage,
    userHasMore,
    setUserHasMore,
    buildUserQueryParams,
    goToPreviousUserPage,
    goToNextUserPage,
    resetUserPaging,
  } = useAdminUserFilters(PAGE_SIZE);
  const [userLoading, setUserLoading] = useState(true);
  const [userSort, setUserSort] = useState<{ key: keyof AdminUser; direction: SortDirection }>({ key: "created_at", direction: "desc" });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userOriginalTierById, setUserOriginalTierById] = useState<Record<string, string>>({});

  const [uniQuery, setUniQuery] = useState("");
  const [uniPage, setUniPage] = useState(1);
  const [uniSort, setUniSort] = useState<{ key: keyof University; direction: SortDirection }>({ key: "name", direction: "asc" });
  const [selectedUniIds, setSelectedUniIds] = useState<string[]>([]);

  const [progQuery, setProgQuery] = useState("");
  const [progPage, setProgPage] = useState(1);
  const [progSort, setProgSort] = useState<{ key: keyof Programme; direction: SortDirection }>({ key: "name", direction: "asc" });

  const [bursQuery, setBursQuery] = useState("");
  const [bursPage, setBursPage] = useState(1);
  const [bursSort, setBursSort] = useState<{ key: keyof Bursary; direction: SortDirection }>({ key: "title", direction: "asc" });
  const [selectedBursaryIds, setSelectedBursaryIds] = useState<string[]>([]);

  const [planQuery, setPlanQuery] = useState("");
  const [newPlan, setNewPlan] = useState({
    slug: "",
    name: "",
    price: "",
    period: "/month",
    tagline: "",
    features: "",
    available: true,
    recommended: false,
    sort_order: "0",
  });

  const [settingsQuery, setSettingsQuery] = useState("");
  const [newSetting, setNewSetting] = useState({
    key: "",
    description: "",
    value: "{}",
  });

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
    title: "",
    provider: "",
    minimum_aps: "",
    amount_per_year: "",
    closing_date: "",
    application_url: "",
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

  function buildMetricsQueryParams() {
    const params = new URLSearchParams();
    params.set("range", rangePreset);

    if (rangePreset === "custom") {
      if (appliedCustomFrom) params.set("from", appliedCustomFrom);
      if (appliedCustomTo) params.set("to", appliedCustomTo);
    }

    return params;
  }

  function buildAlertHistoryQueryParams() {
    const params = new URLSearchParams();
    params.set("limit", "12");
    params.set("range", rangePreset);

    if (rangePreset === "custom") {
      if (appliedCustomFrom) params.set("from", appliedCustomFrom);
      if (appliedCustomTo) params.set("to", appliedCustomTo);
    }

    if (alertHistorySeverity !== "all") params.set("severity", alertHistorySeverity);
    if (alertHistoryKey !== "all") params.set("alert_key", alertHistoryKey);
    if (alertHistoryFrom) params.set("from", alertHistoryFrom);
    if (alertHistoryTo) params.set("to", alertHistoryTo);

    return params;
  }

  function buildContentAuditQueryParams() {
    const params = new URLSearchParams();
    params.set("limit", "20");

    if (contentAuditEntityType !== "all") params.set("entity_type", contentAuditEntityType);
    if (contentAuditAction !== "all") params.set("action", contentAuditAction);
    if (contentAuditFrom) params.set("from", contentAuditFrom);
    if (contentAuditTo) params.set("to", contentAuditTo);

    return params;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const metricParams = buildMetricsQueryParams();
      const [mRes, uniRes, pRes, bRes, plansRes, settingsRes, historyRes] = await Promise.all([
        fetch(`/api/admin/metrics?${metricParams.toString()}`),
        fetch("/api/admin/content/universities"),
        fetch("/api/admin/content/programmes"),
        fetch("/api/admin/content/bursaries"),
        fetch("/api/admin/content/plans"),
        fetch("/api/admin/content/site-settings"),
        fetch(`/api/admin/alerts/history?${buildAlertHistoryQueryParams().toString()}`),
      ]);
      const auditRes = await fetch(`/api/admin/content/audit?${buildContentAuditQueryParams().toString()}`);

      setMetrics((await readJsonSafe(mRes)) as MetricsResponse);
      setUniversities((await readJsonSafe(uniRes)) as University[]);
      setProgrammes((await readJsonSafe(pRes)) as Programme[]);
      setBursaries((await readJsonSafe(bRes)) as Bursary[]);
      setPlans((await readJsonSafe(plansRes)) as AdminPlan[]);
      setSiteSettings((await readJsonSafe(settingsRes)) as SiteSetting[]);
      setAlertHistory((await readJsonSafe(historyRes)) as AlertHistoryEntry[]);
      setContentAudit((await readJsonSafe(auditRes)) as ContentAuditEntry[]);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [rangePreset, appliedCustomFrom, appliedCustomTo, alertHistorySeverity, alertHistoryKey, alertHistoryFrom, alertHistoryTo, contentAuditEntityType, contentAuditAction, contentAuditFrom, contentAuditTo]);

  async function loadUsers() {
    setUserLoading(true);
    try {
      const params = buildUserQueryParams(
        userSort.key as "full_name" | "email" | "tier" | "created_at",
        userSort.direction
      );
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const payload = (await readJsonSafe(res)) as UserPageResponse;
      setUsers(payload.items);
      setUserOriginalTierById((prev) => {
        const next = { ...prev };
        payload.items.forEach((user) => {
          next[user.id] = String(user.tier ?? "free").toLowerCase();
        });
        return next;
      });
      setUserHasMore(payload.hasMore);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not load users");
    } finally {
      setUserLoading(false);
    }
  }

  useEffect(() => {
    resetUserPaging();
    setSelectedUserIds([]);
  }, [userQuery, tierFilter, userSort, resetUserPaging]);

  useEffect(() => {
    void loadUsers();
  }, [userQuery, tierFilter, userPage, userSort]);

  useEffect(() => {
    if (!metrics?.alertThresholds) return;
    setThresholdDraft({
      tokenCostSpikeZarPerDay: String(metrics.alertThresholds.tokenCostSpikeZarPerDay),
      storageGrowthBytesPerDayMb: String(Math.round(metrics.alertThresholds.storageGrowthBytesPerDay / (1024 * 1024))),
      failedEmailScanRatePercent: String(metrics.alertThresholds.failedEmailScanRatePercent),
      failedEmailScanMinVolume: String(metrics.alertThresholds.failedEmailScanMinVolume),
      aiCostPer1kTokensZar: String(metrics.alertThresholds.aiCostPer1kTokensZar),
    });
  }, [metrics?.alertThresholds]);

  async function exportUsageCsv() {
    try {
      const params = buildMetricsQueryParams();
      const res = await fetch(`/api/admin/metrics/export?${params.toString()}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Could not export CSV");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-usage-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      pushToast("success", "Usage CSV exported.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not export CSV");
    }
  }

  async function exportAlertHistoryCsv() {
    try {
      const params = buildAlertHistoryQueryParams();
      const res = await fetch(`/api/admin/alerts/history/export?${params.toString()}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Could not export alert history");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admin-alert-history.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      pushToast("success", "Alert history exported");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not export alert history");
    }
  }

  async function exportCsv(endpoint: string, filename: string) {
    const res = await fetch(endpoint);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || "Could not export CSV");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function uploadCsv(endpoint: string, file: File, successMessage: string) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    await readJsonSafe(res);
    pushToast("success", successMessage);
    await loadAll();
  }

  async function importCsvFile(endpoint: string, file: File | null | undefined, successMessage: string) {
    if (!file) return;
    setSaving(endpoint);
    try {
      await uploadCsv(endpoint, file, successMessage);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not import CSV");
    } finally {
      setSaving(null);
    }
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) {
      pushToast("error", "Select both start and end dates for a custom range.");
      return;
    }
    if (customFrom > customTo) {
      pushToast("error", "Custom range start date must be before end date.");
      return;
    }
    setAppliedCustomFrom(customFrom);
    setAppliedCustomTo(customTo);
  }

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
      return b.title.toLowerCase().includes(q) || (b.provider ?? "").toLowerCase().includes(q);
    });
    return sortBy(base, bursSort.key, bursSort.direction);
  }, [bursaries, bursQuery, bursSort]);

  const filteredPlans = useMemo(() => {
    const q = planQuery.trim().toLowerCase();
    return plans.filter((plan) => {
      if (!q) return true;
      return plan.name.toLowerCase().includes(q) || plan.slug.toLowerCase().includes(q) || plan.price.toLowerCase().includes(q);
    });
  }, [plans, planQuery]);

  const filteredSettings = useMemo(() => {
    const q = settingsQuery.trim().toLowerCase();
    return siteSettings.filter((setting) => {
      if (!q) return true;
      return setting.key.toLowerCase().includes(q) || (setting.description ?? "").toLowerCase().includes(q);
    });
  }, [siteSettings, settingsQuery]);

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

  async function updateUserTier(userId: string, tier: string, originalTier: string) {
    setSaving(`user-${userId}`);
    try {
      const nextTier = String(tier ?? "").trim().toLowerCase();
      const currentTier = String(originalTier ?? "free").trim().toLowerCase();

      let endpoint = "/api/admin/users";
      let payload: Record<string, unknown> = { userId, tier: nextTier };

      if (nextTier === "admin") {
        const reason = window.prompt("Reason for granting admin access:", "")?.trim();
        if (!reason) throw new Error("Admin assignment requires a reason.");
        endpoint = "/api/admin/users/admin-assignment";
        payload = { userId, action: "grant", reason };
      } else if (currentTier === "admin" && nextTier !== "admin") {
        const reason = window.prompt("Reason for revoking admin access:", "")?.trim();
        if (!reason) throw new Error("Admin revocation requires a reason.");
        endpoint = "/api/admin/users/admin-assignment";
        payload = { userId, action: "revoke", reason, revokeToTier: nextTier };
      }

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await readJsonSafe(res);
      if (nextTier === "admin") {
        pushToast("success", "Admin access granted.");
      } else if (currentTier === "admin" && nextTier !== "admin") {
        pushToast("success", "Admin access revoked.");
      } else {
        pushToast("success", "User tier updated.");
      }
      await loadUsers();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not update user");
    } finally {
      setSaving(null);
    }
  }

  async function bulkDisableUsers() {
    if (selectedUserIds.length === 0) return;

    const selectedAdminIds = selectedUserIds.filter((id) => userOriginalTierById[id] === "admin");
    if (selectedAdminIds.length > 0) {
      pushToast("error", "Bulk disable does not support admin users. Revoke admin access individually with a reason first.");
      return;
    }

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
      await loadUsers();
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
    if (!bursary.title.trim()) return pushToast("error", "Bursary title is required.");

    setSaving(`burs-${bursary.id}`);
    try {
      const res = await fetch("/api/admin/content/bursaries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bursary, id: bursary.id, title: bursary.title.trim() }),
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
    if (!newBursary.title.trim()) return pushToast("error", "Bursary title is required.");

    setSaving("new-burs");
    try {
      const res = await fetch("/api/admin/content/bursaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newBursary.title.trim(),
          provider: newBursary.provider || null,
          minimum_aps: newBursary.minimum_aps ? Number(newBursary.minimum_aps) : 0,
          amount_per_year: newBursary.amount_per_year ? Number(newBursary.amount_per_year) : null,
          closing_date: newBursary.closing_date || null,
          application_url: newBursary.application_url || null,
          fields_of_study: newBursary.fields_of_study ? newBursary.fields_of_study.split(',').map(f => f.trim()).filter(Boolean) : [],
          provinces_eligible: ["All"],
          is_active: newBursary.is_active,
        }),
      });
      await readJsonSafe(res);
      setNewBursary({ title: "", provider: "", minimum_aps: "", amount_per_year: "", closing_date: "", application_url: "", fields_of_study: "", is_active: true });
      pushToast("success", "Bursary created.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not create bursary");
    } finally {
      setSaving(null);
    }
  }

  function parseMultilineFeatures(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function parseSettingJson(value: string): unknown {
    return JSON.parse(value);
  }

  async function addPlan() {
    if (!newPlan.slug.trim() || !newPlan.name.trim() || !newPlan.price.trim()) {
      return pushToast("error", "Plan slug, name, and price are required.");
    }

    setSaving("new-plan");
    try {
      const res = await fetch("/api/admin/content/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newPlan.slug,
          name: newPlan.name,
          price: newPlan.price,
          period: newPlan.period,
          tagline: newPlan.tagline,
          features: parseMultilineFeatures(newPlan.features),
          available: newPlan.available,
          recommended: newPlan.recommended,
          sort_order: Number(newPlan.sort_order || "0"),
        }),
      });
      await readJsonSafe(res);
      setNewPlan({ slug: "", name: "", price: "", period: "/month", tagline: "", features: "", available: true, recommended: false, sort_order: "0" });
      pushToast("success", "Plan added.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not add plan");
    } finally {
      setSaving(null);
    }
  }

  async function savePlan(plan: AdminPlan) {
    if (!plan.slug.trim() || !plan.name.trim() || !plan.price.trim()) {
      return pushToast("error", "Plan slug, name, and price are required.");
    }

    setSaving(`plan-${plan.id}`);
    try {
      const res = await fetch("/api/admin/content/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          slug: plan.slug,
          name: plan.name,
          price: plan.price,
          period: plan.period,
          tagline: plan.tagline,
          features: plan.features,
          available: plan.available,
          recommended: plan.recommended,
          sort_order: plan.sort_order,
        }),
      });
      await readJsonSafe(res);
      pushToast("success", "Plan updated.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not update plan");
    } finally {
      setSaving(null);
    }
  }

  async function deletePlan(id: string, name: string) {
    if (!window.confirm(`Delete plan \"${name}\"?`)) return;

    setSaving(`plan-del-${id}`);
    try {
      const res = await fetch("/api/admin/content/plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await readJsonSafe(res);
      pushToast("success", "Plan deleted.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not delete plan");
    } finally {
      setSaving(null);
    }
  }

  async function exportPlansCsv() {
    try {
      await exportCsv("/api/admin/content/plans/export", "admin-plans.csv");
      pushToast("success", "Plans exported.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not export plans");
    }
  }

  async function importPlansCsv(file: File | null | undefined) {
    if (!file) return;

    setSaving("plans-import");
    try {
      await uploadCsv("/api/admin/content/plans/import", file, "Plans imported.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not import plans");
    } finally {
      setSaving(null);
    }
  }

  async function addSiteSetting() {
    if (!newSetting.key.trim()) return pushToast("error", "Setting key is required.");

    let parsedValue: unknown;
    try {
      parsedValue = parseSettingJson(newSetting.value);
    } catch {
      return pushToast("error", "Setting value must be valid JSON.");
    }

    setSaving("new-setting");
    try {
      const res = await fetch("/api/admin/content/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newSetting.key,
          description: newSetting.description || null,
          value: parsedValue,
        }),
      });
      await readJsonSafe(res);
      setNewSetting({ key: "", description: "", value: "{}" });
      pushToast("success", "Setting added.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not add setting");
    } finally {
      setSaving(null);
    }
  }

  async function saveSiteSetting(setting: SiteSetting) {
    let parsedValue: unknown;
    try {
      parsedValue = typeof setting.value === "string"
        ? parseSettingJson(setting.value)
        : setting.value;
    } catch {
      return pushToast("error", `Setting ${setting.key} has invalid JSON.`);
    }

    setSaving(`setting-${setting.key}`);
    try {
      const res = await fetch("/api/admin/content/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: setting.key,
          description: setting.description,
          value: parsedValue,
        }),
      });
      await readJsonSafe(res);
      pushToast("success", "Setting updated.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not update setting");
    } finally {
      setSaving(null);
    }
  }

  async function deleteSiteSetting(key: string) {
    if (isProtectedSiteSettingKey(key)) {
      pushToast("error", "This setting is protected and cannot be deleted.");
      return;
    }

    if (!window.confirm(`Delete setting \"${key}\"?`)) return;

    setSaving(`setting-del-${key}`);
    try {
      const res = await fetch("/api/admin/content/site-settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      await readJsonSafe(res);
      pushToast("success", "Setting deleted.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not delete setting");
    } finally {
      setSaving(null);
    }
  }

  async function exportSiteSettingsCsv() {
    try {
      await exportCsv("/api/admin/content/site-settings/export", "admin-site-settings.csv");
      pushToast("success", "Site settings exported.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not export site settings");
    }
  }

  async function importSiteSettingsCsv(file: File | null | undefined) {
    if (!file) return;

    setSaving("settings-import");
    try {
      await uploadCsv("/api/admin/content/site-settings/import", file, "Site settings imported.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not import site settings");
    } finally {
      setSaving(null);
    }
  }

  async function exportContentAuditCsv() {
    try {
      const params = buildContentAuditQueryParams();
      const res = await fetch(`/api/admin/content/audit/export?${params.toString()}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Could not export content audit");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admin-content-audit.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      pushToast("success", "Content audit exported.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not export content audit");
    }
  }

  async function saveAlertThresholds() {
    const tokenCostSpikeZarPerDay = Number(thresholdDraft.tokenCostSpikeZarPerDay);
    const storageGrowthBytesPerDayMb = Number(thresholdDraft.storageGrowthBytesPerDayMb);
    const failedEmailScanRatePercent = Number(thresholdDraft.failedEmailScanRatePercent);
    const failedEmailScanMinVolume = Number(thresholdDraft.failedEmailScanMinVolume);
    const aiCostPer1kTokensZar = Number(thresholdDraft.aiCostPer1kTokensZar);

    if ([tokenCostSpikeZarPerDay, storageGrowthBytesPerDayMb, failedEmailScanRatePercent, failedEmailScanMinVolume, aiCostPer1kTokensZar].some((value) => Number.isNaN(value) || value < 0)) {
      pushToast("error", "Thresholds must be valid non-negative numbers.");
      return;
    }

    setSaving("alert-thresholds");
    try {
      const res = await fetch("/api/admin/content/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "admin_alert_thresholds",
          value: {
            tokenCostSpikeZarPerDay,
            storageGrowthBytesPerDay: Math.round(storageGrowthBytesPerDayMb * 1024 * 1024),
            failedEmailScanRatePercent,
            failedEmailScanMinVolume,
            aiCostPer1kTokensZar,
          },
        }),
      });
      await readJsonSafe(res);
      pushToast("success", "Alert thresholds saved.");
      await loadAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Could not save thresholds");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#fff9f2] p-8 text-sm text-gray-600">Loading admin dashboard...</div>;

  const uniAllChecked = pagedUniversities.items.length > 0 && pagedUniversities.items.every((u) => selectedUniIds.includes(u.id));
  const bursAllChecked = pagedBursaries.items.length > 0 && pagedBursaries.items.every((b) => selectedBursaryIds.includes(b.id));

  return (
    <div className="min-h-screen bg-[#fff9f2] px-4 pb-10 pt-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {toast && <div className={`rounded-xl border px-3 py-2 text-sm ${toast.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{toast.message}</div>}

        <MetricsOverviewSection
          metrics={metrics}
          rangePreset={rangePreset}
          onRangePresetChange={setRangePreset}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
          onApplyCustomRange={applyCustomRange}
          onExportUsageCsv={exportUsageCsv}
          thresholdDraft={thresholdDraft}
          onThresholdDraftChange={setThresholdDraft}
          onSaveAlertThresholds={saveAlertThresholds}
          savingKey={saving}
          alertHistory={alertHistory}
          onExportAlertHistoryCsv={exportAlertHistoryCsv}
          alertHistorySeverity={alertHistorySeverity}
          onAlertHistorySeverityChange={setAlertHistorySeverity}
          alertHistoryKey={alertHistoryKey}
          onAlertHistoryKeyChange={setAlertHistoryKey}
          alertHistoryFrom={alertHistoryFrom}
          onAlertHistoryFromChange={setAlertHistoryFrom}
          alertHistoryTo={alertHistoryTo}
          onAlertHistoryToChange={setAlertHistoryTo}
        />

        <UserManagementSection
          userQuery={userQuery}
          onUserQueryChange={(value) => {
            setUserQuery(value);
            resetUserPaging();
          }}
          tierFilter={tierFilter}
          onTierFilterChange={(value) => {
            setTierFilter(value);
            resetUserPaging();
          }}
          userLoading={userLoading}
          users={users}
          userPage={userPage}
          onPreviousPage={() => {
            goToPreviousUserPage();
            setSelectedUserIds([]);
          }}
          onNextPage={() => {
            goToNextUserPage();
            setSelectedUserIds([]);
          }}
          canGoPrevious={userPage > 1 && !userLoading}
          canGoNext={userHasMore && !userLoading}
          selectedUserIds={selectedUserIds}
          onToggleSelectAll={(checked) => setSelectedUserIds(checked ? Array.from(new Set([...selectedUserIds, ...users.map((u) => u.id)])) : selectedUserIds.filter((id) => !users.some((u) => u.id === id)))}
          onToggleSelectOne={(userId, checked) => setSelectedUserIds((prev) => checked ? [...prev, userId] : prev.filter((id) => id !== userId))}
          onBulkDisable={bulkDisableUsers}
          isBulkDisableDisabled={saving === "users-bulk-disable" || selectedUserIds.length === 0}
          userSortKey={userSort.key as "full_name" | "email" | "tier" | "created_at"}
          userSortDirection={userSort.direction}
          onSortByName={() => toggleSort<AdminUser>(setUserSort, userSort, "full_name")}
          onSortByEmail={() => toggleSort<AdminUser>(setUserSort, userSort, "email")}
          onSortByTier={() => toggleSort<AdminUser>(setUserSort, userSort, "tier")}
          onDraftTierChange={(userId, tier) => setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tier } : u)))}
          onSaveTier={(userId, tier) => updateUserTier(userId, tier, userOriginalTierById[userId] ?? (users.find((u) => u.id === userId)?.tier ?? "free"))}
          onDisableUser={(userId) => updateUserTier(userId, "disabled", userOriginalTierById[userId] ?? (users.find((u) => u.id === userId)?.tier ?? "free"))}
          isSavingUser={(userId) => saving === `user-${userId}`}
        />

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
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Title" value={newBursary.title} onChange={(e) => setNewBursary((p) => ({ ...p, title: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Provider" value={newBursary.provider} onChange={(e) => setNewBursary((p) => ({ ...p, provider: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Min APS" value={newBursary.minimum_aps} onChange={(e) => setNewBursary((p) => ({ ...p, minimum_aps: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Amount/Year" value={newBursary.amount_per_year} onChange={(e) => setNewBursary((p) => ({ ...p, amount_per_year: e.target.value }))} />
            <button type="button" onClick={addBursary} disabled={saving === "new-burs" || !newBursary.title.trim()} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add bursary</button>
          </div>

          <div className="mt-3"><input value={bursQuery} onChange={(e) => { setBursQuery(e.target.value); setBursPage(1); }} placeholder="Search bursaries" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" /></div>
          <div className="mb-2 mt-2 flex items-center justify-end">
            <button type="button" onClick={archiveSelectedBursaries} disabled={saving === "burs-bulk-archive" || selectedBursaryIds.length === 0} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Archive selected ({selectedBursaryIds.length})</button>
          </div>

          <div className="mt-3 space-y-2">
            {pagedBursaries.items.map((bursary) => (
              <div key={bursary.id} className="grid items-center gap-2 rounded-xl border border-gray-100 bg-white p-2 md:grid-cols-[24px_1fr_90px_160px]">
                <input type="checkbox" checked={selectedBursaryIds.includes(bursary.id)} onChange={(e) => setSelectedBursaryIds((prev) => e.target.checked ? [...prev, bursary.id] : prev.filter((id) => id !== bursary.id))} />
                <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={bursary.title} onChange={(e) => setBursaries((prev) => prev.map((b) => (b.id === bursary.id ? { ...b, title: e.target.value } : b)))} />
                <input type="number" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" value={bursary.minimum_aps ?? 0} onChange={(e) => setBursaries((prev) => prev.map((b) => (b.id === bursary.id ? { ...b, minimum_aps: Number(e.target.value) } : b)))} />
                <div className="flex gap-1">
                  <button type="button" onClick={() => saveBursary(bursary)} disabled={saving === `burs-${bursary.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => deleteBursary(bursary.id, bursary.title)} disabled={saving === `burs-del-${bursary.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <SortHeader label="Sort by title" active={bursSort.key === "title"} direction={bursSort.direction} onClick={() => toggleSort<Bursary>(setBursSort, bursSort, "title")} />
            <SortHeader label="Sort by APS" active={bursSort.key === "minimum_aps"} direction={bursSort.direction} onClick={() => toggleSort<Bursary>(setBursSort, bursSort, "minimum_aps")} />
          </div>

          <Pagination page={bursPage} totalPages={pagedBursaries.totalPages} onPageChange={setBursPage} />
        </SectionCard>

        <PlanManagementSection
          saving={saving}
          planQuery={planQuery}
          onPlanQueryChange={setPlanQuery}
          newPlan={newPlan}
          onNewPlanFieldChange={(field, value) => setNewPlan((prev) => ({ ...prev, [field]: value }))}
          onAddPlan={addPlan}
          onExportCsv={exportPlansCsv}
          onImportCsv={importPlansCsv}
          plans={filteredPlans}
          onPlanFieldChange={(planId, field, value) => setPlans((prev) => prev.map((item) => (item.id === planId ? { ...item, [field]: value } : item)))}
          onPlanFeaturesChange={(planId, featuresText) => setPlans((prev) => prev.map((item) => (item.id === planId ? { ...item, features: parseMultilineFeatures(featuresText) } : item)))}
          onSavePlan={savePlan}
          onDeletePlan={deletePlan}
        />

        <SiteSettingsSection
          saving={saving}
          newSetting={newSetting}
          onNewSettingFieldChange={(field, value) => setNewSetting((prev) => ({ ...prev, [field]: value }))}
          onAddSetting={addSiteSetting}
          settingsQuery={settingsQuery}
          onSettingsQueryChange={setSettingsQuery}
          settings={filteredSettings}
          onSettingDescriptionChange={(key, description) => setSiteSettings((prev) => prev.map((item) => (item.key === key ? { ...item, description } : item)))}
          onSettingValueChange={(key, value) => setSiteSettings((prev) => prev.map((item) => (item.key === key ? { ...item, value } : item)))}
          onSaveSetting={saveSiteSetting}
          onDeleteSetting={deleteSiteSetting}
          onExportCsv={exportSiteSettingsCsv}
          onImportCsv={importSiteSettingsCsv}
        />

        <ContentAuditSection
          contentAudit={contentAudit}
          contentAuditEntityType={contentAuditEntityType}
          onContentAuditEntityTypeChange={setContentAuditEntityType}
          contentAuditAction={contentAuditAction}
          onContentAuditActionChange={setContentAuditAction}
          contentAuditFrom={contentAuditFrom}
          onContentAuditFromChange={setContentAuditFrom}
          contentAuditTo={contentAuditTo}
          onContentAuditToChange={setContentAuditTo}
          onExportContentAuditCsv={exportContentAuditCsv}
        />
      </div>
    </div>
  );
}

