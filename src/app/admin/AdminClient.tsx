"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isProtectedSiteSettingKey } from "@/lib/admin/contentAdmin";

type MetricDaily = {
  day: string;
  signups: number;
  applications: number;
  tokens: number;
  aiCalls: number;
  emailsSent: number;
  emailsReceived: number;
  emailScanFailures: number;
  filesUploaded: number;
  storageUploadedBytes: number;
};

type DateRangePreset = "7" | "30" | "90" | "custom";

type MetricAlert = {
  key: "token_cost_spike" | "storage_growth_spike" | "email_scan_failures";
  severity: "warning" | "critical";
  title: string;
  message: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  occurredOn: string;
};

type AlertHistoryEntry = {
  alert_key: string;
  occurred_on: string;
  severity: "warning" | "critical";
  title: string;
  message: string;
  current_value: number;
  threshold_value: number;
  unit: string;
  range_label: string;
  detected_at: string;
};

type ContentAuditEntry = {
  entity_type: string;
  entity_key: string;
  action: string;
  before_data: unknown;
  after_data: unknown;
  admin_user_id: string;
  admin_email: string | null;
  created_at: string;
};

type RankedUser = {
  userId: string;
  label: string;
  value: number;
};

type MetricsResponse = {
  totals: {
    users: number;
    applications: number;
    tokens: number;
    waitlist: number;
    bursaryTracking: number;
    aiCalls: number;
    emailsSent: number;
    emailsReceived: number;
    activeEmailConnections: number;
    storageBytes: number;
    storageFiles: number;
    basebotThreads: number;
    basebotMessages: number;
  };
  daily: MetricDaily[];
  statusBreakdown: Record<string, number>;
  provinceDistribution: { province: string; count: number }[];
  funnel: { signups: number; createdApplications: number; submittedApplications: number };
  usage: {
    ai: {
      totalTokens: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalCalls: number;
      last7dTokens: number;
      last30dTokens: number;
      estimatedCostZar: number;
      topUsersByTokens: RankedUser[];
    };
    email: {
      sentTotal: number;
      receivedTotal: number;
      failedScansTotal: number;
      failedScanRatePercent: number;
      statusChangesDetected: number;
      connectedMailboxes: number;
      activeConnectedMailboxes: number;
      sentByType: Record<string, number>;
      actionsBreakdown: Record<string, number>;
      topUsersByReceivedEmails: RankedUser[];
      topUsersBySentEmails: RankedUser[];
    };
    storage: {
      totalBytes: number;
      totalFiles: number;
      usersWithFiles: number;
      averageBytesPerUser: number;
      uploadedBytesInRange: number;
      topUsersByStorageBytes: RankedUser[];
      topUsersByFileCount: RankedUser[];
    };
    engagement: {
      basebotThreads: number;
      basebotMessages: number;
      topUsersByThreads: RankedUser[];
    };
  };
  alerts: MetricAlert[];
  alertThresholds: {
    tokenCostSpikeZarPerDay: number;
    storageGrowthBytesPerDay: number;
    failedEmailScanRatePercent: number;
    failedEmailScanMinVolume: number;
    aiCostPer1kTokensZar: number;
  };
  range: {
    preset: DateRangePreset;
    from: string;
    to: string;
    label: string;
  };
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

type AdminPlan = {
  id: string;
  slug: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  available: boolean;
  recommended: boolean;
  sort_order: number;
  updated_at: string | null;
};

type SiteSetting = {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string | null;
};

type AlertThresholdDraft = {
  tokenCostSpikeZarPerDay: string;
  storageGrowthBytesPerDayMb: string;
  failedEmailScanRatePercent: string;
  failedEmailScanMinVolume: string;
  aiCostPer1kTokensZar: string;
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
      const [mRes, uRes, uniRes, pRes, bRes, plansRes, settingsRes, historyRes] = await Promise.all([
        fetch(`/api/admin/metrics?${metricParams.toString()}`),
        fetch("/api/admin/users"),
        fetch("/api/admin/content/universities"),
        fetch("/api/admin/content/programmes"),
        fetch("/api/admin/content/bursaries"),
        fetch("/api/admin/content/plans"),
        fetch("/api/admin/content/site-settings"),
        fetch(`/api/admin/alerts/history?${buildAlertHistoryQueryParams().toString()}`),
      ]);
      const auditRes = await fetch(`/api/admin/content/audit?${buildContentAuditQueryParams().toString()}`);

      setMetrics((await readJsonSafe(mRes)) as MetricsResponse);
      setUsers((await readJsonSafe(uRes)) as AdminUser[]);
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

  const maxTokenDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.tokens) ?? [])), [metrics]);
  const maxSignupDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.signups) ?? [])), [metrics]);
  const maxApplicationDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.applications) ?? [])), [metrics]);
  const maxEmailsSentDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.emailsSent) ?? [])), [metrics]);
  const maxEmailsReceivedDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.emailsReceived) ?? [])), [metrics]);
  const maxFilesUploadedDay = useMemo(() => Math.max(1, ...(metrics?.daily.map((d) => d.filesUploaded) ?? [])), [metrics]);

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
            <div className="flex items-center gap-2">
              <button type="button" onClick={exportUsageCsv} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Export CSV</button>
              <Link href="/dashboard" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Back to app</Link>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
            <div className="grid gap-2 md:grid-cols-[140px_1fr_1fr_100px]">
              <select value={rangePreset} onChange={(e) => setRangePreset(e.target.value as DateRangePreset)} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900">
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="custom">Custom</option>
              </select>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} disabled={rangePreset !== "custom"} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 disabled:bg-gray-100 disabled:text-gray-400" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} disabled={rangePreset !== "custom"} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 disabled:bg-gray-100 disabled:text-gray-400" />
              <button type="button" onClick={applyCustomRange} disabled={rangePreset !== "custom"} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Apply</button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Showing metrics for: {metrics?.range.label ?? "Loading range..."}</p>
          </div>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Operational alerts</p>
              <p className="text-xs text-gray-500">Threshold-based spikes and failures</p>
            </div>
            {metrics?.alerts.length ? (
              <div className="mt-3 space-y-2">
                {metrics.alerts.map((alert) => (
                  <div key={alert.key} className={`rounded-xl border px-3 py-2 text-xs ${alert.severity === "critical" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    <p className="font-bold">{alert.title}</p>
                    <p className="mt-1">{alert.message}</p>
                    <p className="mt-1 text-[11px] opacity-80">Current: {alert.currentValue} {alert.unit} · Threshold: {alert.thresholdValue} {alert.unit}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">No alert thresholds breached in this range.</p>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">Alert thresholds</p>
                <p className="text-xs text-gray-500">Tune the values used by spike detection and failure alerts.</p>
              </div>
              <button type="button" onClick={saveAlertThresholds} disabled={saving === "alert-thresholds"} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save thresholds</button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">AI token cost spike (ZAR/day)</span>
                <input type="number" min="0" step="0.01" value={thresholdDraft.tokenCostSpikeZarPerDay} onChange={(e) => setThresholdDraft((prev) => ({ ...prev, tokenCostSpikeZarPerDay: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
              </label>
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">Storage growth spike (MB/day)</span>
                <input type="number" min="0" step="1" value={thresholdDraft.storageGrowthBytesPerDayMb} onChange={(e) => setThresholdDraft((prev) => ({ ...prev, storageGrowthBytesPerDayMb: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
              </label>
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">Failed scan rate (%)</span>
                <input type="number" min="0" step="0.1" value={thresholdDraft.failedEmailScanRatePercent} onChange={(e) => setThresholdDraft((prev) => ({ ...prev, failedEmailScanRatePercent: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
              </label>
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">Failed scan minimum volume</span>
                <input type="number" min="0" step="1" value={thresholdDraft.failedEmailScanMinVolume} onChange={(e) => setThresholdDraft((prev) => ({ ...prev, failedEmailScanMinVolume: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
              </label>
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">AI cost per 1k tokens (ZAR)</span>
                <input type="number" min="0" step="0.01" value={thresholdDraft.aiCostPer1kTokensZar} onChange={(e) => setThresholdDraft((prev) => ({ ...prev, aiCostPer1kTokensZar: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
              </label>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">Alert history</p>
                <p className="text-xs text-gray-500">Last recorded threshold breaches for auditing and trend review.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <p>{alertHistory.length} recent items</p>
                <button type="button" onClick={exportAlertHistoryCsv} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50">Export CSV</button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">Severity</span>
                <select value={alertHistorySeverity} onChange={(e) => setAlertHistorySeverity(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900">
                  <option value="all">All severities</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">Alert type</span>
                <select value={alertHistoryKey} onChange={(e) => setAlertHistoryKey(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900">
                  <option value="all">All alerts</option>
                  {Array.from(new Set(alertHistory.map((entry) => entry.alert_key))).map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">From</span>
                <input type="date" value={alertHistoryFrom} onChange={(e) => setAlertHistoryFrom(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
              </label>
              <label className="space-y-1 text-xs text-gray-600">
                <span className="block font-semibold text-gray-700">To</span>
                <input type="date" value={alertHistoryTo} onChange={(e) => setAlertHistoryTo(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
              </label>
            </div>

            {alertHistory.length > 0 ? (
              <div className="mt-3 space-y-2">
                {alertHistory.map((entry) => (
                  <div key={`${entry.alert_key}-${entry.occurred_on}`} className={`rounded-xl border px-3 py-2 text-xs ${entry.severity === "critical" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">{entry.title}</p>
                      <p className="text-[11px] opacity-80">{entry.occurred_on} · {entry.range_label}</p>
                    </div>
                    <p className="mt-1">{entry.message}</p>
                    <p className="mt-1 text-[11px] opacity-80">Current: {entry.current_value} {entry.unit} · Threshold: {entry.threshold_value} {entry.unit}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">No historical alert records yet.</p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
            <StatCard label="Total users" value={String(metrics?.totals.users ?? 0)} />
            <StatCard label="Applications" value={String(metrics?.totals.applications ?? 0)} />
            <StatCard label="BaseBot tokens" value={(metrics?.totals.tokens ?? 0).toLocaleString("en-ZA")} />
            <StatCard label="AI calls" value={String(metrics?.totals.aiCalls ?? 0)} />
            <StatCard label="Emails sent" value={String(metrics?.totals.emailsSent ?? 0)} />
            <StatCard label="Emails received" value={String(metrics?.totals.emailsReceived ?? 0)} />
            <StatCard label="Storage used" value={formatBytes(metrics?.totals.storageBytes ?? 0)} />
            <StatCard label="Waitlist" value={String(metrics?.totals.waitlist ?? 0)} />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Bursary tracks" value={String(metrics?.totals.bursaryTracking ?? 0)} />
            <StatCard label="Connected inboxes" value={`${metrics?.totals.activeEmailConnections ?? 0}`} />
            <StatCard label="Vault files" value={String(metrics?.totals.storageFiles ?? 0)} />
            <StatCard label="BaseBot threads" value={String(metrics?.totals.basebotThreads ?? 0)} />
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

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Emails sent per day" color="bg-sky-500" max={maxEmailsSentDay} points={(metrics?.daily ?? []).slice(-14).map((p) => ({ key: `sent-${p.day}`, label: p.day.slice(5), value: p.emailsSent }))} />
            <ChartCard title="Emails received per day" color="bg-cyan-500" max={maxEmailsReceivedDay} points={(metrics?.daily ?? []).slice(-14).map((p) => ({ key: `received-${p.day}`, label: p.day.slice(5), value: p.emailsReceived }))} />
            <ChartCard title="Files uploaded per day" color="bg-amber-500" max={maxFilesUploadedDay} points={(metrics?.daily ?? []).slice(-14).map((p) => ({ key: `files-${p.day}`, label: p.day.slice(5), value: p.filesUploaded }))} />
          </div>

          {metrics?.usage && (
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-sm font-bold text-gray-900">AI usage</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <MiniStat label="Input tokens" value={metrics.usage.ai.totalInputTokens.toLocaleString("en-ZA")} />
                  <MiniStat label="Output tokens" value={metrics.usage.ai.totalOutputTokens.toLocaleString("en-ZA")} />
                  <MiniStat label="Last 7 days" value={metrics.usage.ai.last7dTokens.toLocaleString("en-ZA")} />
                  <MiniStat label="Last 30 days" value={metrics.usage.ai.last30dTokens.toLocaleString("en-ZA")} />
                  <MiniStat label="Est. AI cost" value={`R${metrics.usage.ai.estimatedCostZar.toFixed(2)}`} />
                </div>
                <TopUsersList title="Top token users" entries={metrics.usage.ai.topUsersByTokens} suffix="tokens" />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-sm font-bold text-gray-900">Email operations</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <MiniStat label="Connected" value={String(metrics.usage.email.connectedMailboxes)} />
                  <MiniStat label="Active" value={String(metrics.usage.email.activeConnectedMailboxes)} />
                  <MiniStat label="Status changes" value={String(metrics.usage.email.statusChangesDetected)} />
                  <MiniStat label="Sent total" value={String(metrics.usage.email.sentTotal)} />
                  <MiniStat label="Failed scans" value={String(metrics.usage.email.failedScansTotal)} />
                  <MiniStat label="Failed scan rate" value={`${metrics.usage.email.failedScanRatePercent.toFixed(2)}%`} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <KeyValueList title="Sent by type" values={metrics.usage.email.sentByType} />
                  <KeyValueList title="Scan actions" values={metrics.usage.email.actionsBreakdown} />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-sm font-bold text-gray-900">Storage usage</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <MiniStat label="Total size" value={formatBytes(metrics.usage.storage.totalBytes)} />
                  <MiniStat label="Files" value={String(metrics.usage.storage.totalFiles)} />
                  <MiniStat label="Users with files" value={String(metrics.usage.storage.usersWithFiles)} />
                  <MiniStat label="Avg per user" value={formatBytes(metrics.usage.storage.averageBytesPerUser)} />
                  <MiniStat label="Uploaded in range" value={formatBytes(metrics.usage.storage.uploadedBytesInRange)} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <TopUsersList title="Top by storage" entries={metrics.usage.storage.topUsersByStorageBytes} suffix="bytes" formatter={formatBytes} />
                  <TopUsersList title="Top by files" entries={metrics.usage.storage.topUsersByFileCount} suffix="files" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-sm font-bold text-gray-900">Engagement</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <MiniStat label="BaseBot threads" value={String(metrics.usage.engagement.basebotThreads)} />
                  <MiniStat label="BaseBot messages" value={String(metrics.usage.engagement.basebotMessages)} />
                </div>
                <TopUsersList title="Top users by threads" entries={metrics.usage.engagement.topUsersByThreads} suffix="threads" />
              </div>
            </div>
          )}
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

        <SectionCard title="Plan Management" subtitle="Control pricing plans shown on the frontend: add, edit, reorder, and delete.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">Export the current plan table or import a CSV snapshot to bulk replace/update rows.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportPlansCsv} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Export CSV</button>
              <label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                Import CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void importPlansCsv(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-5">
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Slug (e.g. essential)" value={newPlan.slug} onChange={(e) => setNewPlan((prev) => ({ ...prev, slug: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Name" value={newPlan.name} onChange={(e) => setNewPlan((prev) => ({ ...prev, name: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Price (e.g. R59)" value={newPlan.price} onChange={(e) => setNewPlan((prev) => ({ ...prev, price: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Tagline" value={newPlan.tagline} onChange={(e) => setNewPlan((prev) => ({ ...prev, tagline: e.target.value }))} />
            <button type="button" onClick={addPlan} disabled={saving === "new-plan" || !newPlan.slug.trim() || !newPlan.name.trim() || !newPlan.price.trim()} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add plan</button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_100px_120px_120px]">
            <input className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Search plans" value={planQuery} onChange={(e) => setPlanQuery(e.target.value)} />
            <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Period" value={newPlan.period} onChange={(e) => setNewPlan((prev) => ({ ...prev, period: e.target.value }))} />
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700">
              <input type="checkbox" checked={newPlan.available} onChange={(e) => setNewPlan((prev) => ({ ...prev, available: e.target.checked }))} />
              Available
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700">
              <input type="checkbox" checked={newPlan.recommended} onChange={(e) => setNewPlan((prev) => ({ ...prev, recommended: e.target.checked }))} />
              Recommended
            </label>
          </div>

          <div className="mt-3 space-y-3">
            {filteredPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-gray-100 bg-white p-3">
                <div className="grid gap-2 md:grid-cols-[120px_1fr_120px_100px_120px_140px]">
                  <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.slug} onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, slug: e.target.value } : item))} />
                  <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.name} onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, name: e.target.value } : item))} />
                  <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.price} onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, price: e.target.value } : item))} />
                  <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.period} onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, period: e.target.value } : item))} />
                  <input type="number" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.sort_order} onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, sort_order: Number(e.target.value) } : item))} />
                  <div className="flex gap-1">
                    <button type="button" onClick={() => savePlan(plan)} disabled={saving === `plan-${plan.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                    <button type="button" onClick={() => deletePlan(plan.id, plan.name)} disabled={saving === `plan-del-${plan.id}`} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Delete</button>
                  </div>
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={plan.tagline} onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, tagline: e.target.value } : item))} />
                  <div className="flex items-center gap-4 text-xs text-gray-700">
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={plan.available} onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, available: e.target.checked } : item))} />
                      Available
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={plan.recommended} onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, recommended: e.target.checked } : item))} />
                      Recommended
                    </label>
                  </div>
                </div>

                <textarea
                  className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400"
                  rows={4}
                  value={plan.features.join("\n")}
                  onChange={(e) => setPlans((prev) => prev.map((item) => item.id === plan.id ? { ...item, features: parseMultilineFeatures(e.target.value) } : item))}
                  placeholder="One feature per line"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Frontend Site Settings" subtitle="Edit key frontend content values as JSON. Add new keys or remove old keys.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">Protected homepage keys cannot be deleted, but they can still be updated or restored from CSV.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportSiteSettingsCsv} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Export CSV</button>
              <label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                Import CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void importSiteSettingsCsv(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-[180px_1fr_140px]">
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Key (e.g. home_features)" value={newSetting.key} onChange={(e) => setNewSetting((prev) => ({ ...prev, key: e.target.value }))} />
            <input className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Description" value={newSetting.description} onChange={(e) => setNewSetting((prev) => ({ ...prev, description: e.target.value }))} />
            <button type="button" onClick={addSiteSetting} disabled={saving === "new-setting" || !newSetting.key.trim()} className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add setting</button>
            <textarea className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 md:col-span-3" rows={4} placeholder='JSON value, e.g. ["a", "b"] or {"x":1}' value={newSetting.value} onChange={(e) => setNewSetting((prev) => ({ ...prev, value: e.target.value }))} />
          </div>

          <div className="mt-3">
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400" placeholder="Search setting key or description" value={settingsQuery} onChange={(e) => setSettingsQuery(e.target.value)} />
          </div>

          <div className="mt-3 space-y-3">
            {filteredSettings.map((setting) => (
              <div key={setting.key} className="rounded-xl border border-gray-100 bg-white p-3">
                <div className="grid gap-2 md:grid-cols-[220px_1fr_160px]">
                  <div className="flex items-center gap-2">
                    <input className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={setting.key} readOnly />
                    {isProtectedSiteSettingKey(setting.key) ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Protected</span> : null}
                  </div>
                  <input className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900" value={setting.description ?? ""} onChange={(e) => setSiteSettings((prev) => prev.map((item) => item.key === setting.key ? { ...item, description: e.target.value } : item))} />
                  <div className="flex gap-1">
                    <button type="button" onClick={() => saveSiteSetting(setting)} disabled={saving === `setting-${setting.key}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
                    <button type="button" onClick={() => deleteSiteSetting(setting.key)} disabled={saving === `setting-del-${setting.key}` || isProtectedSiteSettingKey(setting.key)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Delete</button>
                  </div>
                </div>

                <textarea
                  className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 font-mono text-xs text-gray-900 placeholder:text-gray-400"
                  rows={6}
                  value={typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value, null, 2)}
                  onChange={(e) => setSiteSettings((prev) => prev.map((item) => item.key === setting.key ? { ...item, value: e.target.value } : item))}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Content Edit History" subtitle="Recent plan and site-setting changes, including imports and deletions.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">This log captures the last admin action for each content edit so you can review before/after values when something changes unexpectedly.</p>
            <button type="button" onClick={exportContentAuditCsv} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Export CSV</button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-xs text-gray-600">
              <span className="block font-semibold text-gray-700">Entity type</span>
              <select value={contentAuditEntityType} onChange={(e) => setContentAuditEntityType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900">
                <option value="all">All types</option>
                <option value="plan">Plans</option>
                <option value="site_setting">Site settings</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-gray-600">
              <span className="block font-semibold text-gray-700">Action</span>
              <select value={contentAuditAction} onChange={(e) => setContentAuditAction(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900">
                <option value="all">All actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="import">Import</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-gray-600">
              <span className="block font-semibold text-gray-700">From</span>
              <input type="date" value={contentAuditFrom} onChange={(e) => setContentAuditFrom(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
            </label>
            <label className="space-y-1 text-xs text-gray-600">
              <span className="block font-semibold text-gray-700">To</span>
              <input type="date" value={contentAuditTo} onChange={(e) => setContentAuditTo(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
            </label>
          </div>

          {contentAudit.length > 0 ? (
            <div className="mt-3 space-y-2">
              {contentAudit.map((entry) => (
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function KeyValueList({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <p className="mt-1 text-xs text-gray-500">No data yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <div className="mt-2 space-y-1.5">
        {entries.slice(0, 6).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-gray-600">{key}</span>
            <span className="font-semibold text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopUsersList({
  title,
  entries,
  suffix,
  formatter,
}: {
  title: string;
  entries: RankedUser[];
  suffix: string;
  formatter?: (value: number) => string;
}) {
  if (entries.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <p className="mt-1 text-xs text-gray-500">No user usage yet</p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2">
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <div className="mt-2 space-y-1.5">
        {entries.slice(0, 5).map((entry) => (
          <div key={entry.userId} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-gray-600">{entry.label}</span>
            <span className="font-semibold text-gray-900">
              {formatter ? formatter(entry.value) : `${entry.value.toLocaleString("en-ZA")} ${suffix}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[index]}`;
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
