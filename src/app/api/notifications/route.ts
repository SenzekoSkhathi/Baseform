import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserCredits } from "@/lib/credits";

type NotificationItem = {
  id: string;
  type: "deadline" | "status" | "reminder" | "email_detected" | "milestone" | "credits";
  title: string;
  message: string;
  timestamp: string;
  href: string;
};

// Typed shapes for Supabase nested joins
type AppRow = {
  id: string | number;
  status: string | null;
  applied_at: string | null;
  updated_at: string | null;
  faculties:    { id: string | number; name: string } | null;
  universities: { id: string | number; name: string; closing_date: string | null } | null;
};

type EmailLogRow = {
  id: string;
  email_subject: string | null;
  email_from: string | null;
  detected_status: string | null;
  created_at: string;
  applications: {
    universities: { id: string | number; name: string } | null;
  } | null;
};

function daysUntil(dateIso: string) {
  const today = new Date();
  const target = new Date(dateIso);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ── Planning-phase milestones (fire from user actions, no email needed) ───────

function milestonePlanningFirstUni(appliedAt: string): NotificationItem {
  return {
    id: "milestone-planning-first-uni",
    type: "milestone",
    title: "First university added — your journey starts now!",
    message:
      "You've officially put your first university on the list. That takes courage. Keep building — every application is a door you're opening for yourself.",
    timestamp: appliedAt,
    href: "/dashboard/detail",
  };
}

function milestonePlanningTwoUnis(appliedAt: string): NotificationItem {
  return {
    id: "milestone-planning-two-unis",
    type: "milestone",
    title: "Two universities on your list!",
    message:
      "Smart move — keeping your options open is one of the best things you can do right now. You're thinking ahead.",
    timestamp: appliedAt,
    href: "/dashboard/detail",
  };
}

function milestonePlanningThreeUnis(appliedAt: string): NotificationItem {
  return {
    id: "milestone-planning-three-unis",
    type: "milestone",
    title: "Three universities tracked — you're serious about this!",
    message:
      "Three universities means three chances at the future you want. You're giving yourself the best possible shot. Don't stop now.",
    timestamp: appliedAt,
    href: "/dashboard/detail",
  };
}

function milestoneGmailConnected(connectedAt: string): NotificationItem {
  return {
    id: "milestone-gmail-connected",
    type: "milestone",
    title: "Gmail connected — we've got your back!",
    message:
      "Your inbox is now being watched. We'll automatically update your application statuses whenever a university email comes in. You can relax on that part.",
    timestamp: connectedAt,
    href: "/profile",
  };
}

// ── Detection-phase milestones (fire after email agent detects a status) ──────

function milestoneFirstApp(detectedAt: string): NotificationItem {
  return {
    id: "milestone-first-app",
    type: "milestone",
    title: "Your first application is in motion!",
    message:
      "Congratulations — we detected activity on your first application. You're no longer just planning, you're doing it. Keep that energy going.",
    timestamp: detectedAt,
    href: "/dashboard/detail",
  };
}

function milestoneInProgress(uniId: string | number, uniName: string, updatedAt: string): NotificationItem {
  return {
    id: `milestone-in-progress-${uniId}`,
    type: "milestone",
    title: `Your ${uniName} application is in progress!`,
    message: `You're making real moves. Keep going — you've got this, and ${uniName} is waiting for your story.`,
    timestamp: updatedAt,
    href: `/dashboard/detail/${uniId}`,
  };
}

function milestoneSubmitted(uniId: string | number, uniName: string, updatedAt: string): NotificationItem {
  return {
    id: `milestone-submitted-${uniId}`,
    type: "milestone",
    title: `Well done on completing your ${uniName} application!`,
    message: `That's one in the bag. You put in the work and it shows — your future self will thank you for this.`,
    timestamp: updatedAt,
    href: `/dashboard/detail/${uniId}`,
  };
}

function milestoneAccepted(uniId: string | number, uniName: string, updatedAt: string): NotificationItem {
  return {
    id: `milestone-accepted-${uniId}`,
    type: "milestone",
    title: `You've received an offer from ${uniName}!`,
    message: `This is your moment — congratulations! All those late nights and hard work brought you here. You earned this.`,
    timestamp: updatedAt,
    href: `/dashboard/detail/${uniId}`,
  };
}

function milestoneWaitlisted(uniId: string | number, uniName: string, updatedAt: string): NotificationItem {
  return {
    id: `milestone-waitlisted-${uniId}`,
    type: "milestone",
    title: `You're on the waitlist at ${uniName}`,
    message: `Don't lose hope — being waitlisted means they see potential in you. Stay patient and keep your other options open.`,
    timestamp: updatedAt,
    href: `/dashboard/detail/${uniId}`,
  };
}

function milestoneThreeSubmitted(updatedAt: string): NotificationItem {
  return {
    id: "milestone-3-submitted",
    type: "milestone",
    title: "3 applications submitted — you're on a roll!",
    message:
      "You've put yourself in front of 3 universities already. Most students stop at one — you're going all in. Keep that energy.",
    timestamp: updatedAt,
    href: "/tracker",
  };
}

function milestoneAllSubmitted(updatedAt: string): NotificationItem {
  return {
    id: "milestone-all-submitted",
    type: "milestone",
    title: "All your applications are complete!",
    message:
      "You've done everything you possibly can — now it's time to breathe, stay positive, and let the results come to you. Proud of you.",
    timestamp: updatedAt,
    href: "/tracker",
  };
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [appsResult, emailLogsResult, emailConnResult, userCredits, profileResult] = await Promise.all([
    supabase
      .from("applications")
      .select(`
        id, status, applied_at, updated_at,
        faculties ( id, name ),
        universities ( id, name, closing_date )
      `)
      .eq("student_id", user.id)
      .order("applied_at", { ascending: true }),

    supabase
      .from("email_scan_logs")
      .select(`
        id, email_subject, email_from, detected_status, created_at,
        applications ( universities ( id, name ) )
      `)
      .eq("user_id", user.id)
      .eq("action_taken", "status_updated")
      .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("email_connections")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),

    getUserCredits(user.id),

    supabase
      .from("profiles")
      .select("notifications_last_read_at")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (appsResult.error) {
    return NextResponse.json({ error: appsResult.error.message }, { status: 500 });
  }

  const apps = (appsResult.data ?? []) as unknown as AppRow[];
  const notifications: NotificationItem[] = [];

  // ── Email-detected notifications ─────────────────────────────────────────
  for (const log of (emailLogsResult.data ?? []) as unknown as EmailLogRow[]) {
    const uni = log.applications?.universities;
    const statusLabel = String(log.detected_status ?? "").replace(/_/g, " ");

    notifications.push({
      id: `email-${log.id}`,
      type: "email_detected",
      title: `Auto-detected: ${uni?.name ?? "University"} application`,
      message: `We spotted an email in your inbox about your ${uni?.name ?? "university"} application. Status automatically updated to ${statusLabel}.`,
      timestamp: log.created_at,
      href: uni?.id ? `/dashboard/detail/${uni.id}` : "/tracker",
    });
  }

  // ── Application status & deadline notifications ───────────────────────────
  for (const app of apps) {
    const uni = app.universities;
    const faculty = app.faculties;
    const updatedAt: string = app.updated_at ?? app.applied_at ?? new Date().toISOString();

    if (app.status && app.status !== "planning") {
      notifications.push({
        id: `status-${app.id}`,
        type: "status",
        title: `Application update: ${faculty?.name ?? "Programme"}`,
        message: `Status changed to ${String(app.status).replace(/_/g, " ")} at ${uni?.name ?? "your university"}.`,
        timestamp: updatedAt,
        href: uni?.id ? `/dashboard/detail/${uni.id}` : "/dashboard/detail",
      });
    }

    if (uni?.closing_date && app.status === "planning") {
      const days = daysUntil(uni.closing_date);
      if (days >= 0 && days <= 45) {
        notifications.push({
          id: `deadline-${app.id}`,
          type: "deadline",
          title: `${uni.name} deadline approaching`,
          message: `${faculty?.name ?? "A programme"} closes in ${days} day${days === 1 ? "" : "s"}.`,
          timestamp: new Date(uni.closing_date).toISOString(),
          href: uni?.id ? `/dashboard/detail/${uni.id}` : "/dashboard/detail",
        });
      }
    }
  }

  // ── Milestone notifications ───────────────────────────────────────────────
  if (apps.length > 0) {

    // ── Planning-phase milestones (based on unique universities tracked) ────
    const uniqueUniIds = [...new Set(
      apps
        .filter((a) => a.universities?.id)
        .map((a) => String(a.universities!.id))
    )];

    // Timestamps: use applied_at of first app per university (apps sorted asc)
    const uniFirstAppliedAt: Record<string, string> = {};
    for (const app of apps) {
      const uniId = String(app.universities?.id ?? "");
      if (uniId && !uniFirstAppliedAt[uniId]) {
        uniFirstAppliedAt[uniId] = app.applied_at ?? new Date().toISOString();
      }
    }

    if (uniqueUniIds.length >= 1) {
      notifications.push(milestonePlanningFirstUni(uniFirstAppliedAt[uniqueUniIds[0]]));
    }
    if (uniqueUniIds.length >= 2) {
      notifications.push(milestonePlanningTwoUnis(uniFirstAppliedAt[uniqueUniIds[1]]));
    }
    if (uniqueUniIds.length >= 3) {
      notifications.push(milestonePlanningThreeUnis(uniFirstAppliedAt[uniqueUniIds[2]]));
    }

    // ── Gmail connected milestone ───────────────────────────────────────────
    if (emailConnResult.data?.created_at) {
      notifications.push(milestoneGmailConnected(emailConnResult.data.created_at));
    }

    // ── Detection-phase milestones (require email agent to have detected something) ──
    const firstActiveApp = apps.find((a) =>
      ["in_progress", "submitted", "accepted", "rejected", "waitlisted"].includes(a.status ?? "")
    );
    if (firstActiveApp) {
      const ts = firstActiveApp.updated_at ?? firstActiveApp.applied_at ?? new Date().toISOString();
      notifications.push(milestoneFirstApp(ts));
    }

    let submittedCount = 0;
    let latestSubmittedAt = "";

    const seenUniversities = new Set<string>();
    for (const app of apps) {
      const uni = app.universities;
      if (!uni?.id) continue;

      const uniKey = String(uni.id);
      if (seenUniversities.has(uniKey)) continue;
      seenUniversities.add(uniKey);

      const updatedAt: string = app.updated_at ?? app.applied_at ?? new Date().toISOString();

      if (app.status === "in_progress") {
        notifications.push(milestoneInProgress(uni.id, uni.name, updatedAt));
      }
      if (app.status === "submitted") {
        notifications.push(milestoneSubmitted(uni.id, uni.name, updatedAt));
        submittedCount++;
        if (!latestSubmittedAt || updatedAt > latestSubmittedAt) latestSubmittedAt = updatedAt;
      }
      if (app.status === "accepted") {
        notifications.push(milestoneAccepted(uni.id, uni.name, updatedAt));
        submittedCount++;
        if (!latestSubmittedAt || updatedAt > latestSubmittedAt) latestSubmittedAt = updatedAt;
      }
      if (app.status === "waitlisted") {
        notifications.push(milestoneWaitlisted(uni.id, uni.name, updatedAt));
        submittedCount++;
        if (!latestSubmittedAt || updatedAt > latestSubmittedAt) latestSubmittedAt = updatedAt;
      }
      if (app.status === "rejected") {
        submittedCount++;
        if (!latestSubmittedAt || updatedAt > latestSubmittedAt) latestSubmittedAt = updatedAt;
      }
    }

    if (submittedCount >= 3 && latestSubmittedAt) {
      notifications.push(milestoneThreeSubmitted(latestSubmittedAt));
    }

    const allDone = apps.every((a) =>
      ["submitted", "accepted", "rejected", "waitlisted"].includes(a.status ?? "")
    );
    if (allDone && apps.length >= 2 && latestSubmittedAt) {
      notifications.push(milestoneAllSubmitted(latestSubmittedAt));
    }
  }

  // ── Base Credits threshold notifications ─────────────────────────────────
  if (userCredits?.highestThresholdCrossed != null) {
    const pct = userCredits.highestThresholdCrossed;
    const remaining = Math.max(0, userCredits.weekStartBalance - userCredits.weeklyUsed);
    const weekly = userCredits.weekStartBalance || 100;

    // Use last_topped_up_at as timestamp so the ID changes each week
    const weekKey = userCredits.lastToppedUpAt
      ? userCredits.lastToppedUpAt.slice(0, 10)
      : userCredits.planStartDate.slice(0, 10);

    const messages: Record<number, { title: string; message: string }> = {
      25:  { title: "You've used 25% of your weekly credits", message: `${remaining} of your ${weekly} weekly Base Credits remain. You're pacing well — keep it up.` },
      50:  { title: "Halfway through your weekly credits", message: `${remaining} Base Credits left this week. Use them wisely and they'll roll over if you don't spend them all.` },
      80:  { title: "80% of weekly credits used", message: `Only ${remaining} Base Credits left for this week. Your next top-up lands next Monday.` },
      90:  { title: "90% of weekly credits used — running low", message: `Just ${remaining} Base Credits remaining. AI features will pause if you hit zero before Monday's top-up.` },
      95:  { title: "Almost out of weekly credits", message: `Only ${remaining} Base Credit${remaining === 1 ? "" : "s"} left. Monday's top-up of ${weekly} credits is on its way.` },
    };

    const content = messages[pct];
    if (content) {
      notifications.push({
        id: `credits-${pct}pct-${weekKey}`,
        type: "credits",
        title: content.title,
        message: content.message,
        timestamp: new Date().toISOString(),
        href: "/settings/usage",
      });
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (notifications.length === 0) {
    notifications.push({
      id: "reminder-get-started",
      type: "reminder",
      title: "No alerts yet",
      message: "Add programmes to start receiving deadline and status notifications.",
      timestamp: new Date().toISOString(),
      href: "/dashboard/detail",
    });
  }

  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Server-side read state: anything timestamped after notifications_last_read_at
  // is unread. This survives across devices and localStorage wipes.
  const lastReadAtRaw = (profileResult?.data as { notifications_last_read_at?: string | null } | null)
    ?.notifications_last_read_at ?? null;
  const lastReadAt = lastReadAtRaw ? new Date(lastReadAtRaw).getTime() : 0;
  const unreadCount = notifications.filter((n) => new Date(n.timestamp).getTime() > lastReadAt).length;

  return NextResponse.json({
    items: notifications,
    lastReadAt: lastReadAtRaw,
    unreadCount,
  });
}
