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
  schoolName: string;
  gradeYear: "Grade 11" | "Grade 12" | "";
  financialNeed: "yes" | "no" | "";
  guardianName: string;
  guardianPhone: string;
  guardianWhatsapp: string;
  guardianRelationship: string;
  guardianEmail: string;
};

type AccountSubject = {
  subjectName: string;
  mark: number;
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
  schoolName: "",
  gradeYear: "",
  financialNeed: "",
  guardianName: "",
  guardianPhone: "",
  guardianWhatsapp: "",
  guardianRelationship: "",
  guardianEmail: "",
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

const RELATIONSHIPS = new Set(["Parent", "Guardian", "Grandparent", "Sibling", "Other"]);

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
  const gradeYear = clampString(candidate.gradeYear, 20);
  const financialNeed = clampString(candidate.financialNeed, 8).toLowerCase();
  const guardianRelationship = clampString(candidate.guardianRelationship, 30);

  return {
    fullName: clampString(candidate.fullName, 120),
    phone: clampString(candidate.phone, 20),
    province: PROVINCES.has(province) ? province : "",
    fieldOfInterest: clampString(candidate.fieldOfInterest, 80),
    schoolName: clampString(candidate.schoolName, 120),
    gradeYear: gradeYear === "Grade 11" || gradeYear === "Grade 12" ? gradeYear : "",
    financialNeed: financialNeed === "yes" || financialNeed === "no" ? financialNeed : "",
    guardianName: clampString(candidate.guardianName, 120),
    guardianPhone: clampString(candidate.guardianPhone, 20),
    guardianWhatsapp: clampString(candidate.guardianWhatsapp, 20),
    guardianRelationship: RELATIONSHIPS.has(guardianRelationship) ? guardianRelationship : "",
    guardianEmail: clampString(candidate.guardianEmail, 120),
  };
}

function toUiAccount(value: {
  full_name?: unknown;
  phone?: unknown;
  province?: unknown;
  field_of_interest?: unknown;
  school_name?: unknown;
  grade_year?: unknown;
  financial_need?: unknown;
  guardian_name?: unknown;
  guardian_phone?: unknown;
  guardian_whatsapp_number?: unknown;
  guardian_relationship?: unknown;
  guardian_email?: unknown;
} | null): AccountSettings {
  const grade = typeof value?.grade_year === "string" ? value.grade_year : "";
  const need = typeof value?.financial_need === "string" ? value.financial_need.toLowerCase() : "";
  return {
    fullName: typeof value?.full_name === "string" ? value.full_name : DEFAULT_ACCOUNT_SETTINGS.fullName,
    phone: typeof value?.phone === "string" ? value.phone : DEFAULT_ACCOUNT_SETTINGS.phone,
    province: typeof value?.province === "string" ? value.province : DEFAULT_ACCOUNT_SETTINGS.province,
    fieldOfInterest:
      typeof value?.field_of_interest === "string"
        ? value.field_of_interest
        : DEFAULT_ACCOUNT_SETTINGS.fieldOfInterest,
    schoolName: typeof value?.school_name === "string" ? value.school_name : DEFAULT_ACCOUNT_SETTINGS.schoolName,
    gradeYear: grade === "Grade 11" || grade === "Grade 12" ? grade : "",
    financialNeed: need === "yes" || need === "no" ? need : "",
    guardianName: typeof value?.guardian_name === "string" ? value.guardian_name : DEFAULT_ACCOUNT_SETTINGS.guardianName,
    guardianPhone: typeof value?.guardian_phone === "string" ? value.guardian_phone : DEFAULT_ACCOUNT_SETTINGS.guardianPhone,
    guardianWhatsapp:
      typeof value?.guardian_whatsapp_number === "string"
        ? value.guardian_whatsapp_number
        : DEFAULT_ACCOUNT_SETTINGS.guardianWhatsapp,
    guardianRelationship:
      typeof value?.guardian_relationship === "string"
        ? value.guardian_relationship
        : DEFAULT_ACCOUNT_SETTINGS.guardianRelationship,
    guardianEmail:
      typeof value?.guardian_email === "string" ? value.guardian_email : DEFAULT_ACCOUNT_SETTINGS.guardianEmail,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const [profileRes, subjectsRes] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "tier, notification_prefs, preferences, full_name, phone, province, field_of_interest, school_name, grade_year, financial_need, guardian_name, guardian_phone, guardian_whatsapp_number, guardian_relationship, guardian_email"
      )
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("student_subjects")
      .select("subject_name, mark")
      .eq("profile_id", user.id)
      .order("mark", { ascending: false }),
  ]);

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 500 });

  const data = profileRes.data;

  const fromNotificationPrefs = normalizeNotificationPrefs((data as { notification_prefs?: unknown } | null)?.notification_prefs);
  const fromLegacyPrefs = normalizePreferences((data as { preferences?: unknown } | null)?.preferences);

  const preferences: Preferences = (data as { notification_prefs?: unknown } | null)?.notification_prefs
    ? toUiPreferences(fromNotificationPrefs)
    : fromLegacyPrefs;

  const account = toUiAccount(data);

  const subjects: AccountSubject[] = (subjectsRes.data ?? []).map((row) => ({
    subjectName: typeof row.subject_name === "string" ? row.subject_name : "",
    mark: typeof row.mark === "number" ? row.mark : 0,
  }));

  return NextResponse.json({
    preferences,
    account,
    subjects,
    tier: typeof (data as { tier?: unknown } | null)?.tier === "string" ? (data as { tier?: string }).tier : "free",
  });
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
    updatePayload.school_name = account.schoolName || null;
    updatePayload.grade_year = account.gradeYear || null;
    updatePayload.financial_need = account.financialNeed || null;
    updatePayload.guardian_name = account.guardianName || null;
    updatePayload.guardian_phone = account.guardianPhone || null;
    updatePayload.guardian_whatsapp_number = account.guardianWhatsapp || null;
    updatePayload.guardian_relationship = account.guardianRelationship || null;
    updatePayload.guardian_email = account.guardianEmail || null;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, preferences, account });
}
