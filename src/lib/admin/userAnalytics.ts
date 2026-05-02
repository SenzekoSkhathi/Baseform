import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsRange = {
  from: string;
  to: string;
  days: number;
  label: string;
};

export type DailyActivityPoint = {
  day: string;
  dau: number;
  events: number;
  signups: number;
  newUsers: number;
};

export type HourlyHeatmapCell = {
  dow: number;
  hour: number;
  count: number;
};

export type ActiveUserEntry = {
  userId: string;
  label: string;
  email: string | null;
  events: number;
  lastSeenAt: string | null;
};

export type EventTypeBreakdownEntry = {
  eventType: string;
  count: number;
};

export type AnalyticsResponse = {
  range: AnalyticsRange;
  presence: {
    onlineNow: number;
    activeLast15m: number;
    activeLastHour: number;
    activeToday: number;
  };
  rolling: {
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
  };
  totals: {
    totalUsers: number;
    newUsersInRange: number;
    eventsInRange: number;
    activeInRange: number;
  };
  daily: DailyActivityPoint[];
  hourly: HourlyHeatmapCell[];
  eventTypes: EventTypeBreakdownEntry[];
  topActiveUsers: ActiveUserEntry[];
  recentlyOnline: ActiveUserEntry[];
  retention: {
    d1: number;
    d7: number;
    d30: number;
  };
};

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = value ? parseInt(value, 10) : NaN;
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function resolveRange(searchParams: URLSearchParams): AnalyticsRange {
  const preset = searchParams.get("range") ?? "30";
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (preset === "custom") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      const fromD = new Date(`${from}T00:00:00Z`);
      const toD = new Date(`${to}T00:00:00Z`);
      const days = Math.max(
        1,
        Math.round((toD.getTime() - fromD.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      return { from, to, days, label: `${from} → ${to}` };
    }
  }

  const days = clampInt(preset, 30, 1, 365);
  const fromDate = new Date(today);
  fromDate.setUTCDate(today.getUTCDate() - (days - 1));
  return {
    from: isoDate(fromDate),
    to: isoDate(today),
    days,
    label: `Last ${days} days`,
  };
}

function emptyDailyMap(range: AnalyticsRange): Map<string, DailyActivityPoint> {
  const map = new Map<string, DailyActivityPoint>();
  const start = new Date(`${range.from}T00:00:00Z`);
  for (let i = 0; i < range.days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = isoDate(d);
    map.set(key, { day: key, dau: 0, events: 0, signups: 0, newUsers: 0 });
  }
  return map;
}

type ProfileLite = { id: string; email: string | null; full_name: string | null };

function userLabel(p: ProfileLite | undefined): string {
  if (!p) return "Unknown user";
  return p.full_name?.trim() || p.email?.trim() || p.id.slice(0, 8);
}

export async function getAdminUserAnalytics(
  admin: SupabaseClient,
  searchParams: URLSearchParams
): Promise<AnalyticsResponse> {
  const range = resolveRange(searchParams);
  const rangeStartIso = `${range.from}T00:00:00Z`;
  const rangeEndIso = `${range.to}T23:59:59.999Z`;
  const now = new Date();
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Counts via head requests — cheap on PG with proper indexes.
  const [
    onlineNowRes,
    activeLast15Res,
    activeLastHourRes,
    activeTodayRes,
    totalUsersRes,
    dauRes,
    wauRes,
    mauRes,
    newUsersInRangeRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", fiveMinAgo),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", fifteenMinAgo),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", oneHourAgo),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", todayStart.toISOString()),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", oneDayAgo),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", sevenDaysAgo),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", thirtyDaysAgo),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", rangeStartIso)
      .lte("created_at", rangeEndIso),
  ]);

  // Pull events for the range. Cap at a sane upper bound to avoid unbounded
  // memory blow-up; 200k events covers many months of moderate usage.
  const { data: eventsRaw } = await admin
    .from("activity_events")
    .select("user_id,event_type,created_at")
    .gte("created_at", rangeStartIso)
    .lte("created_at", rangeEndIso)
    .order("created_at", { ascending: false })
    .limit(200_000);

  const events = (eventsRaw ?? []) as Array<{
    user_id: string | null;
    event_type: string;
    created_at: string;
  }>;

  // Daily aggregation
  const dailyMap = emptyDailyMap(range);
  const dailyUserSets = new Map<string, Set<string>>();
  const eventTypeCounts = new Map<string, number>();
  const userEventCounts = new Map<string, number>();
  const hourlyCounts = new Map<string, number>(); // key = `${dow}:${hour}`
  const activeUserSet = new Set<string>();

  for (const ev of events) {
    const day = ev.created_at.slice(0, 10);
    const point = dailyMap.get(day);
    if (point) point.events += 1;

    if (ev.user_id) {
      let dayUsers = dailyUserSets.get(day);
      if (!dayUsers) {
        dayUsers = new Set<string>();
        dailyUserSets.set(day, dayUsers);
      }
      dayUsers.add(ev.user_id);
      activeUserSet.add(ev.user_id);
      userEventCounts.set(ev.user_id, (userEventCounts.get(ev.user_id) ?? 0) + 1);
    }

    eventTypeCounts.set(ev.event_type, (eventTypeCounts.get(ev.event_type) ?? 0) + 1);

    const ts = new Date(ev.created_at);
    const hourKey = `${ts.getUTCDay()}:${ts.getUTCHours()}`;
    hourlyCounts.set(hourKey, (hourlyCounts.get(hourKey) ?? 0) + 1);
  }

  for (const [day, users] of dailyUserSets) {
    const point = dailyMap.get(day);
    if (point) point.dau = users.size;
  }

  // Signups per day from profiles in range
  const { data: signupsRaw } = await admin
    .from("profiles")
    .select("created_at")
    .gte("created_at", rangeStartIso)
    .lte("created_at", rangeEndIso)
    .order("created_at", { ascending: false })
    .limit(50_000);

  for (const row of signupsRaw ?? []) {
    const day = (row as { created_at: string }).created_at.slice(0, 10);
    const point = dailyMap.get(day);
    if (point) {
      point.signups += 1;
      point.newUsers += 1;
    }
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.day.localeCompare(b.day));

  const hourly: HourlyHeatmapCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${dow}:${hour}`;
      hourly.push({ dow, hour, count: hourlyCounts.get(key) ?? 0 });
    }
  }

  const eventTypes: EventTypeBreakdownEntry[] = Array.from(eventTypeCounts.entries())
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count);

  // Top active users + lookup their profiles for labels
  const topUserIds = Array.from(userEventCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId]) => userId);

  const { data: recentRaw } = await admin
    .from("profiles")
    .select("id,email,full_name,last_seen_at")
    .not("last_seen_at", "is", null)
    .order("last_seen_at", { ascending: false })
    .limit(10);

  const recentRows = (recentRaw ?? []) as Array<
    ProfileLite & { last_seen_at: string | null }
  >;

  const profileIdsToFetch = Array.from(
    new Set([...topUserIds, ...recentRows.map((r) => r.id)])
  );

  let profileLookup = new Map<string, ProfileLite & { last_seen_at: string | null }>();
  if (profileIdsToFetch.length > 0) {
    const { data: profilesRaw } = await admin
      .from("profiles")
      .select("id,email,full_name,last_seen_at")
      .in("id", profileIdsToFetch);

    profileLookup = new Map(
      (profilesRaw ?? []).map((p) => {
        const row = p as ProfileLite & { last_seen_at: string | null };
        return [row.id, row];
      })
    );
  }

  const topActiveUsers: ActiveUserEntry[] = topUserIds.map((userId) => {
    const profile = profileLookup.get(userId);
    return {
      userId,
      label: userLabel(profile),
      email: profile?.email ?? null,
      events: userEventCounts.get(userId) ?? 0,
      lastSeenAt: profile?.last_seen_at ?? null,
    };
  });

  const recentlyOnline: ActiveUserEntry[] = recentRows.map((row) => ({
    userId: row.id,
    label: userLabel(row),
    email: row.email,
    events: userEventCounts.get(row.id) ?? 0,
    lastSeenAt: row.last_seen_at,
  }));

  // Retention — share of users who signed up at least N days ago who have
  // returned at least once since then. Cheap approximation good enough for an
  // exec dashboard.
  const retention = await computeRetention(admin);

  const dau = dauRes.count ?? 0;
  const mau = mauRes.count ?? 0;

  return {
    range,
    presence: {
      onlineNow: onlineNowRes.count ?? 0,
      activeLast15m: activeLast15Res.count ?? 0,
      activeLastHour: activeLastHourRes.count ?? 0,
      activeToday: activeTodayRes.count ?? 0,
    },
    rolling: {
      dau,
      wau: wauRes.count ?? 0,
      mau,
      stickiness: mau > 0 ? Math.round((dau / mau) * 1000) / 10 : 0,
    },
    totals: {
      totalUsers: totalUsersRes.count ?? 0,
      newUsersInRange: newUsersInRangeRes.count ?? 0,
      eventsInRange: events.length,
      activeInRange: activeUserSet.size,
    },
    daily,
    hourly,
    eventTypes,
    topActiveUsers,
    recentlyOnline,
    retention,
  };
}

async function computeRetention(admin: SupabaseClient) {
  // For each cohort (signed up ≥1d ago, ≥7d ago, ≥30d ago), what fraction
  // returned at least once after their signup? We approximate "returned"
  // with last_seen_at > created_at + window.
  const now = Date.now();
  const buckets: Array<{ key: "d1" | "d7" | "d30"; ms: number }> = [
    { key: "d1", ms: 24 * 60 * 60 * 1000 },
    { key: "d7", ms: 7 * 24 * 60 * 60 * 1000 },
    { key: "d30", ms: 30 * 24 * 60 * 60 * 1000 },
  ];

  const result: { d1: number; d7: number; d30: number } = { d1: 0, d7: 0, d30: 0 };

  for (const bucket of buckets) {
    const cutoff = new Date(now - bucket.ms).toISOString();
    const [{ count: cohort }, { count: returned }] = await Promise.all([
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .lte("created_at", cutoff),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .lte("created_at", cutoff)
        .gt("last_seen_at", cutoff),
    ]);

    const cohortCount = cohort ?? 0;
    const returnedCount = returned ?? 0;
    result[bucket.key] =
      cohortCount > 0 ? Math.round((returnedCount / cohortCount) * 1000) / 10 : 0;
  }

  return result;
}
