import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Preferences = {
  deadlineAlerts: boolean;
  statusUpdates: boolean;
  weeklySummary: boolean;
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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("notification_prefs, preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const fromNotificationPrefs = normalizeNotificationPrefs((data as { notification_prefs?: unknown } | null)?.notification_prefs);
  const fromLegacyPrefs = normalizePreferences((data as { preferences?: unknown } | null)?.preferences);

  // Prefer new storage column when available; fallback preserves existing saved values.
  const resolved: Preferences = (data as { notification_prefs?: unknown } | null)?.notification_prefs
    ? toUiPreferences(fromNotificationPrefs)
    : fromLegacyPrefs;

  return NextResponse.json({ preferences: resolved });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const preferences = normalizePreferences(body?.preferences);
  const notificationPrefs = toDbPreferences(preferences);

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ notification_prefs: notificationPrefs })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, preferences });
}