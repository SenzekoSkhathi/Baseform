import type { SupabaseClient } from "@supabase/supabase-js";

export type RangePreset = "7" | "30" | "90" | "custom";

export type MetricAlert = {
  key: "token_cost_spike" | "storage_growth_spike" | "email_scan_failures";
  severity: "warning" | "critical";
  title: string;
  message: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  occurredOn: string;
};

type TopUser = {
  userId: string;
  label: string;
  value: number;
};

export type MetricDaily = {
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

export type UsageMetricsResult = {
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
      topUsersByTokens: TopUser[];
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
      topUsersByReceivedEmails: TopUser[];
      topUsersBySentEmails: TopUser[];
    };
    storage: {
      totalBytes: number;
      totalFiles: number;
      usersWithFiles: number;
      averageBytesPerUser: number;
      uploadedBytesInRange: number;
      topUsersByStorageBytes: TopUser[];
      topUsersByFileCount: TopUser[];
    };
    engagement: {
      basebotThreads: number;
      basebotMessages: number;
      topUsersByThreads: TopUser[];
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
    preset: RangePreset;
    from: string;
    to: string;
    label: string;
  };
};

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function buildTopUsers(
  valueByUser: Map<string, number>,
  profileById: Map<string, { fullName: string; email: string }>,
  limit = 5
): TopUser[] {
  return Array.from(valueByUser.entries())
    .filter(([userId, value]) => Boolean(userId) && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, value]) => {
      const profile = profileById.get(userId);
      const label = profile?.fullName || profile?.email || `${userId.slice(0, 8)}...`;
      return { userId, label, value };
    });
}

function formatDateInput(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseRange(searchParams: URLSearchParams) {
  const now = new Date();
  const presetRaw = searchParams.get("range");
  const preset: RangePreset =
    presetRaw === "7" || presetRaw === "30" || presetRaw === "90" || presetRaw === "custom"
      ? presetRaw
      : "30";

  let from: Date;
  let to: Date;

  if (preset === "custom") {
    const fromRaw = searchParams.get("from") ?? "";
    const toRaw = searchParams.get("to") ?? "";
    const parsedFrom = fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : null;
    const parsedTo = toRaw ? new Date(`${toRaw}T23:59:59.999Z`) : null;

    if (parsedFrom && parsedTo && !Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime()) && parsedFrom <= parsedTo) {
      from = parsedFrom;
      to = parsedTo;
    } else {
      const fallback = new Date(now);
      fallback.setUTCDate(fallback.getUTCDate() - 29);
      from = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate(), 0, 0, 0, 0));
      to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    }
  } else {
    const days = Number(preset);
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    from = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0));
    to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  }

  const fromIso = formatDateInput(from);
  const toIso = formatDateInput(to);
  const label = preset === "custom" ? `${fromIso} to ${toIso}` : `Last ${preset} days`;

  return { preset, from, to, fromIso, toIso, label };
}

function isInRange(iso: string | null, from: Date, to: Date): boolean {
  if (!iso) return false;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return false;
  return value >= from && value <= to;
}

function isFailedScanAction(action: string): boolean {
  const normalized = action.toLowerCase();
  return (
    normalized.includes("error")
    || normalized.includes("fail")
    || normalized === "scan_failed"
  );
}

function getPeakEntry(map: Map<string, number>): { day: string; value: number } | null {
  let best: { day: string; value: number } | null = null;
  for (const [day, value] of map.entries()) {
    if (!best || value > best.value || (value === best.value && day < best.day)) {
      best = { day, value };
    }
  }
  return best;
}

export async function getAdminUsageMetrics(admin: SupabaseClient, searchParams: URLSearchParams): Promise<UsageMetricsResult> {
  const range = parseRange(searchParams);

  const [
    totalUsersRes,
    totalApplicationsRes,
    profileCreatedRowsRes,
    appRowsRes,
    aiRowsRes,
    provinceRowsRes,
    waitlistCountRes,
    bursaryTrackingCountRes,
    profileIdentityRowsRes,
    emailScanRowsRes,
    emailSentRowsRes,
    emailConnectionsRowsRes,
    storageRowsRes,
    basebotRowsRes,
    alertSettingsRes,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("applications").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("created_at"),
    admin.from("applications").select("created_at, status"),
    admin.from("ai_coach_logs").select("created_at,input_tokens,output_tokens,student_id"),
    admin.from("profiles").select("province,created_at"),
    admin.from("waitlist").select("id", { count: "exact", head: true }),
    admin.from("bursary_applications").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id,full_name,email"),
    admin.from("email_scan_logs").select("created_at,action_taken,user_id"),
    admin.from("notification_sent_log").select("sent_at,notification_type,user_id"),
    admin.from("email_connections").select("user_id,is_active,created_at"),
    admin.schema("storage").from("objects").select("owner,bucket_id,metadata,created_at").eq("bucket_id", "documents"),
    admin.from("basebot_threads").select("user_id,messages,created_at,updated_at"),
    admin.from("admin_site_settings").select("value").eq("key", "admin_alert_thresholds").maybeSingle(),
  ]);

  const totalUsers = totalUsersRes.count ?? 0;
  const totalApplications = totalApplicationsRes.count ?? 0;
  const waitlistCount = waitlistCountRes.count ?? 0;
  const bursaryTrackingCount = bursaryTrackingCountRes.count ?? 0;

  const profileRows = profileCreatedRowsRes.error ? [] : (profileCreatedRowsRes.data ?? []);
  const appRows = appRowsRes.error ? [] : (appRowsRes.data ?? []);
  const aiRows = aiRowsRes.error ? [] : (aiRowsRes.data ?? []);
  const provinceRows = provinceRowsRes.error ? [] : (provinceRowsRes.data ?? []);
  const profileIdentityRows = profileIdentityRowsRes.error ? [] : (profileIdentityRowsRes.data ?? []);
  const emailScanRows = emailScanRowsRes.error ? [] : (emailScanRowsRes.data ?? []);
  const emailSentRows = emailSentRowsRes.error ? [] : (emailSentRowsRes.data ?? []);
  const emailConnectionsRows = emailConnectionsRowsRes.error ? [] : (emailConnectionsRowsRes.data ?? []);
  const storageRows = storageRowsRes.error ? [] : (storageRowsRes.data ?? []);
  const basebotRows = basebotRowsRes.error ? [] : (basebotRowsRes.data ?? []);

  const thresholdsRaw = (alertSettingsRes.data as Record<string, unknown> | null)?.value as Record<string, unknown> | null;
  const alertThresholds = {
    tokenCostSpikeZarPerDay: toNumber(thresholdsRaw?.tokenCostSpikeZarPerDay) || 150,
    storageGrowthBytesPerDay: toNumber(thresholdsRaw?.storageGrowthBytesPerDay) || 150 * 1024 * 1024,
    failedEmailScanRatePercent: toNumber(thresholdsRaw?.failedEmailScanRatePercent) || 20,
    failedEmailScanMinVolume: toNumber(thresholdsRaw?.failedEmailScanMinVolume) || 20,
    aiCostPer1kTokensZar: toNumber(thresholdsRaw?.aiCostPer1kTokensZar) || 0.08,
  };

  const profileById = new Map<string, { fullName: string; email: string }>();
  for (const row of profileIdentityRows) {
    const record = row as Record<string, unknown>;
    const id = toStringValue(record.id);
    if (!id) continue;
    profileById.set(id, {
      fullName: toStringValue(record.full_name),
      email: toStringValue(record.email),
    });
  }

  const signupMap = new Map<string, number>();
  for (const row of profileRows) {
    const createdAt = toStringValue((row as Record<string, unknown>).created_at);
    if (!isInRange(createdAt, range.from, range.to)) continue;
    const key = dateKey(createdAt);
    signupMap.set(key, (signupMap.get(key) ?? 0) + 1);
  }

  const applicationMap = new Map<string, number>();
  // statusBreakdown is the current state of ALL applications (not range-filtered),
  // so the pie chart reflects the overall mix rather than just new apps in range.
  const statusBreakdown: Record<string, number> = {
    planning: 0,
    in_progress: 0,
    submitted: 0,
    accepted: 0,
    rejected: 0,
    waitlisted: 0,
  };
  // statusBreakdownInRange is used internally by the funnel — it counts only
  // apps CREATED inside the selected range so signups → submitted ratios stay honest.
  const statusBreakdownInRange: Record<string, number> = {
    planning: 0,
    in_progress: 0,
    submitted: 0,
    accepted: 0,
    rejected: 0,
    waitlisted: 0,
  };
  for (const row of appRows) {
    const record = row as Record<string, unknown>;
    const createdAt = toStringValue(record.created_at);
    const status = toStringValue(record.status);

    if (status in statusBreakdown) statusBreakdown[status] += 1;

    if (isInRange(createdAt, range.from, range.to)) {
      const key = dateKey(createdAt);
      applicationMap.set(key, (applicationMap.get(key) ?? 0) + 1);
      if (status in statusBreakdownInRange) statusBreakdownInRange[status] += 1;
    }
  }

  const tokenMap = new Map<string, number>();
  const aiCallsMap = new Map<string, number>();
  const aiTokensByUser = new Map<string, number>();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;
  for (const row of aiRows) {
    const record = row as Record<string, unknown>;
    const createdAt = toStringValue(record.created_at);
    if (!isInRange(createdAt, range.from, range.to)) continue;

    const inputTokens = toNumber(record.input_tokens);
    const outputTokens = toNumber(record.output_tokens);
    const studentId = toStringValue(record.student_id);
    const tokens = inputTokens + outputTokens;

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalTokens += tokens;

    const key = dateKey(createdAt);
    tokenMap.set(key, (tokenMap.get(key) ?? 0) + tokens);
    aiCallsMap.set(key, (aiCallsMap.get(key) ?? 0) + 1);

    if (studentId) {
      aiTokensByUser.set(studentId, (aiTokensByUser.get(studentId) ?? 0) + tokens);
    }
  }

  const emailReceivedMap = new Map<string, number>();
  const failedScanMap = new Map<string, number>();
  const emailActionBreakdown: Record<string, number> = {};
  const emailReceivedByUser = new Map<string, number>();
  let emailsReceived = 0;
  let emailsStatusChanged = 0;
  let failedScans = 0;
  for (const row of emailScanRows) {
    const record = row as Record<string, unknown>;
    const createdAt = toStringValue(record.created_at);
    if (!isInRange(createdAt, range.from, range.to)) continue;

    const actionTaken = toStringValue(record.action_taken) || "unknown";
    const userId = toStringValue(record.user_id);
    const key = dateKey(createdAt);

    emailsReceived += 1;
    emailActionBreakdown[actionTaken] = (emailActionBreakdown[actionTaken] ?? 0) + 1;
    emailReceivedMap.set(key, (emailReceivedMap.get(key) ?? 0) + 1);

    if (actionTaken !== "no_change") emailsStatusChanged += 1;
    if (isFailedScanAction(actionTaken)) {
      failedScans += 1;
      failedScanMap.set(key, (failedScanMap.get(key) ?? 0) + 1);
    }

    if (userId) {
      emailReceivedByUser.set(userId, (emailReceivedByUser.get(userId) ?? 0) + 1);
    }
  }

  const emailSentMap = new Map<string, number>();
  const emailSentByType: Record<string, number> = {};
  const emailSentByUser = new Map<string, number>();
  let emailsSent = 0;
  for (const row of emailSentRows) {
    const record = row as Record<string, unknown>;
    const sentAt = toStringValue(record.sent_at);
    if (!isInRange(sentAt, range.from, range.to)) continue;

    const type = toStringValue(record.notification_type) || "unknown";
    const userId = toStringValue(record.user_id);
    const key = dateKey(sentAt);

    emailsSent += 1;
    emailSentByType[type] = (emailSentByType[type] ?? 0) + 1;
    emailSentMap.set(key, (emailSentMap.get(key) ?? 0) + 1);

    if (userId) {
      emailSentByUser.set(userId, (emailSentByUser.get(userId) ?? 0) + 1);
    }
  }

  let emailConnections = 0;
  let activeEmailConnections = 0;
  for (const row of emailConnectionsRows) {
    const record = row as Record<string, unknown>;
    emailConnections += 1;
    if (Boolean(record.is_active)) activeEmailConnections += 1;
  }

  const storageBytesByUser = new Map<string, number>();
  const storageFilesByUser = new Map<string, number>();
  const filesUploadedMap = new Map<string, number>();
  const storageUploadedBytesMap = new Map<string, number>();
  let storageBytes = 0;
  let storageFiles = 0;
  let storageUploadedBytesInRange = 0;
  for (const row of storageRows) {
    const record = row as Record<string, unknown>;
    const owner = toStringValue(record.owner);
    const createdAt = toStringValue(record.created_at);
    const metadata = (record.metadata ?? {}) as Record<string, unknown>;
    const size = toNumber(metadata.size);

    storageFiles += 1;
    storageBytes += size;

    if (owner) {
      storageBytesByUser.set(owner, (storageBytesByUser.get(owner) ?? 0) + size);
      storageFilesByUser.set(owner, (storageFilesByUser.get(owner) ?? 0) + 1);
    }

    if (isInRange(createdAt, range.from, range.to)) {
      const key = dateKey(createdAt);
      filesUploadedMap.set(key, (filesUploadedMap.get(key) ?? 0) + 1);
      storageUploadedBytesMap.set(key, (storageUploadedBytesMap.get(key) ?? 0) + size);
      storageUploadedBytesInRange += size;
    }
  }

  let basebotThreads = 0;
  let basebotMessages = 0;
  const basebotThreadsByUser = new Map<string, number>();
  for (const row of basebotRows) {
    const record = row as Record<string, unknown>;
    const userId = toStringValue(record.user_id);
    const messages = Array.isArray(record.messages) ? record.messages : [];
    basebotThreads += 1;
    basebotMessages += messages.length;
    if (userId) {
      basebotThreadsByUser.set(userId, (basebotThreadsByUser.get(userId) ?? 0) + 1);
    }
  }

  // Province distribution shows where ALL users come from, not just those who
  // signed up inside the range. Range filters belong on growth charts, not on
  // a who-uses-the-app-by-province snapshot.
  const provinceMap = new Map<string, number>();
  for (const row of provinceRows) {
    const record = row as Record<string, unknown>;
    const province = toStringValue(record.province) || "Unknown";
    provinceMap.set(province, (provinceMap.get(province) ?? 0) + 1);
  }
  const provinceDistribution = Array.from(provinceMap.entries())
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count);

  const days = Array.from(
    new Set([
      ...signupMap.keys(),
      ...applicationMap.keys(),
      ...tokenMap.keys(),
      ...emailSentMap.keys(),
      ...emailReceivedMap.keys(),
      ...filesUploadedMap.keys(),
      ...failedScanMap.keys(),
      ...storageUploadedBytesMap.keys(),
    ])
  ).sort();

  const submitted = (statusBreakdownInRange.submitted ?? 0)
    + (statusBreakdownInRange.accepted ?? 0)
    + (statusBreakdownInRange.rejected ?? 0)
    + (statusBreakdownInRange.waitlisted ?? 0);

  const funnel = {
    signups: Array.from(signupMap.values()).reduce((a, b) => a + b, 0),
    createdApplications: Array.from(applicationMap.values()).reduce((a, b) => a + b, 0),
    submittedApplications: submitted,
  };

  // "Last 7/30 days" is anchored to today, not to the end of the selected range,
  // so the number means what the label says regardless of which range you pick.
  // Strict < to give exactly 7 / 30 day windows (day 0..6 / 0..29).
  let last7dTokens = 0;
  let last30dTokens = 0;
  const nowMs = Date.now();
  for (const [day, tokens] of tokenMap.entries()) {
    const value = new Date(`${day}T00:00:00.000Z`);
    const age = Math.floor((nowMs - value.getTime()) / (24 * 60 * 60 * 1000));
    if (age >= 0 && age < 7) last7dTokens += tokens;
    if (age >= 0 && age < 30) last30dTokens += tokens;
  }

  const aiCallsTotal = Array.from(aiCallsMap.values()).reduce((acc, value) => acc + value, 0);
  const estimatedCostZar = Number(((totalTokens / 1000) * alertThresholds.aiCostPer1kTokensZar).toFixed(2));

  const usersWithStorage = storageFilesByUser.size;
  const averageStorageBytesPerUser = usersWithStorage > 0
    ? Math.round(storageBytes / usersWithStorage)
    : 0;

  const failedScanRatePercent = emailsReceived > 0
    ? Number(((failedScans / emailsReceived) * 100).toFixed(2))
    : 0;

  const maxDailyTokenCost = Math.max(
    0,
    ...Array.from(tokenMap.values()).map((tokens) => (tokens / 1000) * alertThresholds.aiCostPer1kTokensZar)
  );
  const maxDailyStorageGrowth = Math.max(0, ...Array.from(storageUploadedBytesMap.values()));
  const peakTokenEntry = getPeakEntry(tokenMap);
  const peakStorageEntry = getPeakEntry(storageUploadedBytesMap);
  const peakFailedScanEntry = getPeakEntry(failedScanMap);

  const alerts: MetricAlert[] = [];

  if (maxDailyTokenCost > alertThresholds.tokenCostSpikeZarPerDay) {
    alerts.push({
      key: "token_cost_spike",
      severity: maxDailyTokenCost > alertThresholds.tokenCostSpikeZarPerDay * 1.5 ? "critical" : "warning",
      title: "AI token cost spike detected",
      message: `Peak daily AI cost is R${maxDailyTokenCost.toFixed(2)}, above threshold R${alertThresholds.tokenCostSpikeZarPerDay.toFixed(2)}.`,
      currentValue: Number(maxDailyTokenCost.toFixed(2)),
      thresholdValue: alertThresholds.tokenCostSpikeZarPerDay,
      unit: "ZAR/day",
      occurredOn: peakTokenEntry?.day ?? range.toIso,
    });
  }

  if (maxDailyStorageGrowth > alertThresholds.storageGrowthBytesPerDay) {
    alerts.push({
      key: "storage_growth_spike",
      severity: maxDailyStorageGrowth > alertThresholds.storageGrowthBytesPerDay * 2 ? "critical" : "warning",
      title: "Storage growth spike detected",
      message: `Peak daily uploads are ${(maxDailyStorageGrowth / (1024 * 1024)).toFixed(2)} MB, above threshold ${(alertThresholds.storageGrowthBytesPerDay / (1024 * 1024)).toFixed(2)} MB.`,
      currentValue: maxDailyStorageGrowth,
      thresholdValue: alertThresholds.storageGrowthBytesPerDay,
      unit: "bytes/day",
      occurredOn: peakStorageEntry?.day ?? range.toIso,
    });
  }

  if (emailsReceived >= alertThresholds.failedEmailScanMinVolume && failedScanRatePercent > alertThresholds.failedEmailScanRatePercent) {
    alerts.push({
      key: "email_scan_failures",
      severity: failedScanRatePercent > alertThresholds.failedEmailScanRatePercent * 1.5 ? "critical" : "warning",
      title: "Email scan failure rate is high",
      message: `Failed scan rate is ${failedScanRatePercent.toFixed(2)}% (${failedScans}/${emailsReceived}) above threshold ${alertThresholds.failedEmailScanRatePercent.toFixed(2)}%.`,
      currentValue: failedScanRatePercent,
      thresholdValue: alertThresholds.failedEmailScanRatePercent,
      unit: "%",
      occurredOn: peakFailedScanEntry?.day ?? range.toIso,
    });
  }

  return {
    totals: {
      users: totalUsers,
      applications: totalApplications,
      tokens: totalTokens,
      waitlist: waitlistCount,
      bursaryTracking: bursaryTrackingCount,
      aiCalls: aiCallsTotal,
      emailsSent,
      emailsReceived,
      activeEmailConnections,
      storageBytes,
      storageFiles,
      basebotThreads,
      basebotMessages,
    },
    daily: days.map((day) => ({
      day,
      signups: signupMap.get(day) ?? 0,
      applications: applicationMap.get(day) ?? 0,
      tokens: tokenMap.get(day) ?? 0,
      aiCalls: aiCallsMap.get(day) ?? 0,
      emailsSent: emailSentMap.get(day) ?? 0,
      emailsReceived: emailReceivedMap.get(day) ?? 0,
      emailScanFailures: failedScanMap.get(day) ?? 0,
      filesUploaded: filesUploadedMap.get(day) ?? 0,
      storageUploadedBytes: storageUploadedBytesMap.get(day) ?? 0,
    })),
    statusBreakdown,
    provinceDistribution,
    funnel,
    usage: {
      ai: {
        totalTokens,
        totalInputTokens,
        totalOutputTokens,
        totalCalls: aiCallsTotal,
        last7dTokens,
        last30dTokens,
        estimatedCostZar,
        topUsersByTokens: buildTopUsers(aiTokensByUser, profileById),
      },
      email: {
        sentTotal: emailsSent,
        receivedTotal: emailsReceived,
        failedScansTotal: failedScans,
        failedScanRatePercent,
        statusChangesDetected: emailsStatusChanged,
        connectedMailboxes: emailConnections,
        activeConnectedMailboxes: activeEmailConnections,
        sentByType: emailSentByType,
        actionsBreakdown: emailActionBreakdown,
        topUsersByReceivedEmails: buildTopUsers(emailReceivedByUser, profileById),
        topUsersBySentEmails: buildTopUsers(emailSentByUser, profileById),
      },
      storage: {
        totalBytes: storageBytes,
        totalFiles: storageFiles,
        usersWithFiles: usersWithStorage,
        averageBytesPerUser: averageStorageBytesPerUser,
        uploadedBytesInRange: storageUploadedBytesInRange,
        topUsersByStorageBytes: buildTopUsers(storageBytesByUser, profileById),
        topUsersByFileCount: buildTopUsers(storageFilesByUser, profileById),
      },
      engagement: {
        basebotThreads,
        basebotMessages,
        topUsersByThreads: buildTopUsers(basebotThreadsByUser, profileById),
      },
    },
    alerts,
    alertThresholds,
    range: {
      preset: range.preset,
      from: range.fromIso,
      to: range.toIso,
      label: range.label,
    },
  };
}
