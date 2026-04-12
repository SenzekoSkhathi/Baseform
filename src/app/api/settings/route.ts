import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Preferences = {
  deadlineAlerts: boolean;
  statusUpdates: boolean;
  weeklySummary: boolean;
};

type AccountSettings = {
  fullName: string;
  phone: string;
  province: string;
  fieldOfInterest: string;
};

type NotificationPrefsRow = {
  deadline_alerts: boolean;
  status_updates: boolean;
  weekly_summary: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  deadlineAlerts: true,
  statusUpdates: true,
  weeklySummary: false,
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefsRow = {
  deadline_alerts: true,
  status_updates: true,
  weekly_summary: false,
};

const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  fullName: "",
  phone: "",
  province: "",
  fieldOfInterest: "",
};

const PROVINCES = new Set([
  "Gauteng",
  "Western Cape",
  "Eastern Cape",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "Northern Cape",
]);

function normalizePreferences(value: unknown): Preferences {
  const candidate = typeof value === "object" && value !== null ? (value as Partial<Preferences>) : {};
  return {
    deadlineAlerts: typeof candidate.deadlineAlerts === "boolean" ? candidate.deadlineAlerts : DEFAULT_PREFERENCES.deadlineAlerts,
    statusUpdates: typeof candidate.statusUpdates === "boolean" ? candidate.statusUpdates : DEFAULT_PREFERENCES.statusUpdates,
    weeklySummary: typeof candidate.weeklySummary === "boolean" ? candidate.weeklySummary : DEFAULT_PREFERENCES.weeklySummary,
  };
}

function normalizeNotificationPrefs(value: unknown): NotificationPrefsRow {
  const candidate = typeof value === "object" && value !== null ? (value as Partial<NotificationPrefsRow>) : {};
  return {
    deadline_alerts: typeof candidate.deadline_alerts === "boolean" ? candidate.deadline_alerts : DEFAULT_NOTIFICATION_PREFS.deadline_alerts,
    status_updates: typeof candidate.status_updates === "boolean" ? candidate.status_updates : DEFAULT_NOTIFICATION_PREFS.status_updates,
    weekly_summary: typeof candidate.weekly_summary === "boolean" ? candidate.weekly_summary : DEFAULT_NOTIFICATION_PREFS.weekly_summary,
  };
}

function toUiPreferences(row: NotificationPrefsRow): Preferences {
  return {
    deadlineAlerts: row.deadline_alerts,
    statusUpdates: row.status_updates,
    weeklySummary: row.weekly_summary,
  };
}

function toDbPreferences(ui: Preferences): NotificationPrefsRow {
  return {
    deadline_alerts: ui.deadlineAlerts,
    status_updates: ui.statusUpdates,
    weekly_summary: ui.weeklySummary,
  };
}

function clampString(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function normalizeAccount(value: unknown): AccountSettings {
  const candidate = typeof value === "object" && value !== null ? (value as Partial<AccountSettings>) : {};
  const province = clampString(candidate.province, 40);

  return {
    fullName: clampString(candidate.fullName, 120),
    phone: clampString(candidate.phone, 20),
    province: PROVINCES.has(province) ? province : "",
    fieldOfInterest: clampString(candidate.fieldOfInterest, 80),
  };
}

function toUiAccount(value: {
  full_name?: unknown;
  phone?: unknown;
  province?: unknown;
  field_of_interest?: unknown;
} | null): AccountSettings {
  return {
    fullName: typeof value?.full_name === "string" ? value.full_name : DEFAULT_ACCOUNT_SETTINGS.fullName,
    phone: typeof value?.phone === "string" ? value.phone : DEFAULT_ACCOUNT_SETTINGS.phone,
    province: typeof value?.province === "string" ? value.province : DEFAULT_ACCOUNT_SETTINGS.province,
    fieldOfInterest:
      typeof value?.field_of_interest === "string"
        ? value.field_of_interest
        : DEFAULT_ACCOUNT_SETTINGS.fieldOfInterest,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("notification_prefs, preferences, full_name, phone, province, field_of_interest")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const fromNotificationPrefs = normalizeNotificationPrefs((data as { notification_prefs?: unknown } | null)?.notification_prefs);
  const fromLegacyPrefs = normalizePreferences((data as { preferences?: unknown } | null)?.preferences);

  const preferences: Preferences = (data as { notification_prefs?: unknown } | null)?.notification_prefs
    ? toUiPreferences(fromNotificationPrefs)
    : fromLegacyPrefs;

  const account = toUiAccount(data as {
    full_name?: unknown;
    phone?: unknown;
    province?: unknown;
    field_of_interest?: unknown;
  } | null);

  return NextResponse.json({ preferences, account });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const hasPreferences = typeof body?.preferences === "object" && body.preferences !== null;
  const hasAccount = typeof body?.account === "object" && body.account !== null;

  if (!hasPreferences && !hasAccount) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  let preferences: Preferences | null = null;
  let account: AccountSettings | null = null;

  if (hasPreferences) {
    preferences = normalizePreferences(body.preferences);
    updatePayload.notification_prefs = toDbPreferences(preferences);
  }

  if (hasAccount) {
    account = normalizeAccount(body.account);
    updatePayload.full_name = account.fullName || null;
    updatePayload.phone = account.phone || null;
    updatePayload.province = account.province || null;
    updatePayload.field_of_interest = account.fieldOfInterest || null;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, preferences, account });
}