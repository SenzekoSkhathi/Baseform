import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HOME_FEATURES,
  DEFAULT_HOME_STATS,
  DEFAULT_HOME_SUBTITLE,
  DEFAULT_PLANS,
} from "@/lib/site-config/defaults";

export async function GET() {
  const supabase = await createClient();

  const [plansRes, settingsRes] = await Promise.all([
    supabase
      .from("admin_pricing_plans")
      .select("id,slug,name,price,period,tagline,features,available,recommended,sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("admin_site_settings")
      .select("key,value"),
  ]);

  const plans = plansRes.error
    ? DEFAULT_PLANS
    : (plansRes.data ?? []).map((row) => ({
        id: String((row as Record<string, unknown>).id ?? (row as Record<string, unknown>).slug ?? ""),
        slug: String((row as Record<string, unknown>).slug ?? ""),
        name: String((row as Record<string, unknown>).name ?? ""),
        price: String((row as Record<string, unknown>).price ?? ""),
        period: String((row as Record<string, unknown>).period ?? "/month"),
        tagline: String((row as Record<string, unknown>).tagline ?? ""),
        features: Array.isArray((row as Record<string, unknown>).features)
          ? ((row as Record<string, unknown>).features as unknown[]).map((f) => String(f))
          : [],
        available: Boolean((row as Record<string, unknown>).available),
        recommended: Boolean((row as Record<string, unknown>).recommended),
        sortOrder: Number((row as Record<string, unknown>).sort_order ?? 0),
      }));

  const settings = new Map<string, unknown>();
  if (!settingsRes.error) {
    for (const row of settingsRes.data ?? []) {
      const key = String((row as Record<string, unknown>).key ?? "");
      if (!key) continue;
      settings.set(key, (row as Record<string, unknown>).value);
    }
  }

  const homeSubtitle = typeof settings.get("home_subtitle") === "string"
    ? (settings.get("home_subtitle") as string)
    : DEFAULT_HOME_SUBTITLE;

  const homeFeaturesRaw = settings.get("home_features");
  const homeFeatures = Array.isArray(homeFeaturesRaw)
    ? homeFeaturesRaw.map((item) => String(item))
    : DEFAULT_HOME_FEATURES;

  const homeStatsRaw = settings.get("home_stats");
  const homeStats = Array.isArray(homeStatsRaw)
    ? homeStatsRaw
        .map((entry) => {
          const record = entry as Record<string, unknown>;
          const iconRaw = String(record.icon ?? "");
          const icon = iconRaw === "graduation-cap" || iconRaw === "trophy" || iconRaw === "clock"
            ? iconRaw
            : "graduation-cap";
          return {
            value: String(record.value ?? ""),
            label: String(record.label ?? ""),
            icon,
            color: String(record.color ?? "text-orange-500"),
          };
        })
        .filter((item) => item.value && item.label)
    : DEFAULT_HOME_STATS;

  return NextResponse.json({
    plans: plans.length > 0 ? plans : DEFAULT_PLANS,
    homeSubtitle,
    homeFeatures: homeFeatures.length > 0 ? homeFeatures : DEFAULT_HOME_FEATURES,
    homeStats: homeStats.length > 0 ? homeStats : DEFAULT_HOME_STATS,
  });
}
