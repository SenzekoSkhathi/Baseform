import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PLANS } from "@/lib/site-config/defaults";
import { getUserCredits, getCreditTransactions, CREDIT_CAP } from "@/lib/credits";
import { BarChart2, FileText, FolderOpen, Layers, Zap } from "lucide-react";

export const metadata = { title: "Usage — Settings" };

// Per-tier limits
const APP_LIMITS: Record<string, number | null> = {
  free: 3,
  essential: null,
  pro: null,
  ultra: null,
};

// Vault storage limits in bytes (approximate per-tier ceiling)
const VAULT_LIMITS: Record<string, number | null> = {
  free: null,               // vault not available on free
  essential: 100 * 1024 * 1024,   // 100 MB
  pro: 500 * 1024 * 1024,         // 500 MB
  ultra: 1024 * 1024 * 1024,      // 1 GB
};

function normalizeTier(raw: unknown): string {
  const t = String(raw ?? "free").trim().toLowerCase();
  return ["free", "essential", "pro", "ultra"].includes(t) ? t : "free";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UsageStat({
  icon: Icon,
  label,
  value,
  sub,
  used,
  total,
  locked,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  used?: number;   // 0–100 percentage
  total?: string;
  locked?: boolean;
}) {
  return (
    <div className={[
      "rounded-2xl border p-5",
      locked ? "border-gray-100 bg-gray-50" : "border-gray-100 bg-white",
    ].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={[
            "flex h-9 w-9 items-center justify-center rounded-xl",
            locked ? "bg-gray-100" : "bg-orange-50",
          ].join(" ")}>
            <Icon size={17} className={locked ? "text-gray-400" : "text-orange-500"} />
          </span>
          <p className={["text-sm font-semibold", locked ? "text-gray-400" : "text-gray-700"].join(" ")}>
            {label}
          </p>
        </div>
        {locked && (
          <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Locked
          </span>
        )}
      </div>

      <p className={["mt-3 text-3xl font-black tracking-tight", locked ? "text-gray-300" : "text-gray-900"].join(" ")}>
        {locked ? "—" : value}
      </p>
      {sub && !locked && (
        <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
      )}

      {used !== undefined && !locked && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
            <span>{value} used</span>
            {total && <span>of {total}</span>}
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={[
                "h-full rounded-full transition-all",
                used >= 90 ? "bg-red-500" : used >= 70 ? "bg-amber-500" : "bg-orange-500",
              ].join(" ")}
              style={{ width: `${Math.min(100, used)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Fetch profile (tier + joined date)
  const { data: profile } = await admin
    .from("profiles")
    .select("tier, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const tier = normalizeTier((profile as { tier?: unknown } | null)?.tier);
  const plan = DEFAULT_PLANS.find((p) => p.slug === tier) ?? DEFAULT_PLANS[0];
  const joinedAt = (profile as { created_at?: string } | null)?.created_at;

  // Fetch application count
  const { count: appCount } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id);

  // Fetch vault files
  const VALID_CATEGORIES = [
    "id-document", "matric-transcript", "proof-of-address",
    "motivational-letter", "other",
  ] as const;

  let vaultFileCount = 0;
  let vaultBytes = 0;

  for (const category of VALID_CATEGORIES) {
    const { data } = await supabase.storage
      .from("documents")
      .list(`${user.id}/${category}`, { limit: 200 });
    if (!data) continue;
    for (const f of data) {
      if (!f.name || f.name === ".emptyFolderPlaceholder") continue;
      vaultFileCount++;
      vaultBytes += (f.metadata?.size as number | undefined) ?? 0;
    }
  }

  const appLimit = APP_LIMITS[tier];
  const appPct = appLimit ? Math.round(((appCount ?? 0) / appLimit) * 100) : null;

  const vaultLimit = VAULT_LIMITS[tier];
  const vaultPct = vaultLimit ? Math.round((vaultBytes / vaultLimit) * 100) : null;
  const vaultLocked = tier === "free";

  // Credits (essential plan only)
  const [userCredits, creditTransactions] = tier === "essential"
    ? await Promise.all([getUserCredits(user.id), getCreditTransactions(user.id, 10)])
    : [null, []];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-black text-gray-900">Usage</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Your current plan usage and limits.
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 ring-1 ring-orange-200">
              {plan.name}
            </span>
            {joinedAt && (
              <p className="mt-1 text-[11px] text-gray-400">
                Member since {new Date(joinedAt).toLocaleDateString("en-ZA", { month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        <UsageStat
          icon={Layers}
          label="Applications tracked"
          value={String(appCount ?? 0)}
          sub={appLimit ? `${appLimit - (appCount ?? 0)} remaining` : "Unlimited"}
          used={appPct ?? undefined}
          total={appLimit ? String(appLimit) : undefined}
        />

        <UsageStat
          icon={FolderOpen}
          label="Vault documents"
          value={String(vaultFileCount)}
          sub={`${formatBytes(vaultBytes)} used`}
          used={vaultPct ?? undefined}
          total={vaultLimit ? formatBytes(vaultLimit) : undefined}
          locked={vaultLocked}
        />

        <UsageStat
          icon={FileText}
          label="Documents scanned"
          value={String(vaultFileCount)}
          sub="Lifetime scans saved to vault"
          locked={vaultLocked}
        />

        <UsageStat
          icon={BarChart2}
          label="Plan features"
          value={String(plan.features.length)}
          sub={`${plan.name} — ${plan.price}${plan.period}`}
        />
      </div>

      {/* Base Credits (essential only) */}
      {tier === "essential" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
                <Zap size={17} className="text-orange-500" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">Base Credits</p>
                <p className="text-[11px] text-gray-400">Powers AI features — refills 100/week, capped at {CREDIT_CAP}</p>
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900">
              {userCredits?.balance ?? 0}
              <span className="text-sm font-medium text-gray-400"> / {CREDIT_CAP}</span>
            </span>
          </div>

          {/* Balance bar */}
          {userCredits && (
            <div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={[
                    "h-full rounded-full transition-all",
                    userCredits.balance <= 20 ? "bg-red-500" : userCredits.balance <= 80 ? "bg-amber-500" : "bg-orange-500",
                  ].join(" ")}
                  style={{ width: `${Math.round((userCredits.balance / CREDIT_CAP) * 100)}%` }}
                />
              </div>
              {userCredits.balance <= 20 && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">
                  Running low — your weekly top-up of 100 credits lands every Monday.
                </p>
              )}
            </div>
          )}

          {/* Credit costs reference */}
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Credit costs</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>AI Coach message</span><span className="font-semibold text-right">1 credit</span>
              <span>Bursary deadline alert</span><span className="font-semibold text-right">1 credit</span>
              <span>Gmail agent check</span><span className="font-semibold text-right">1 credit</span>
              <span>Motivation letter draft</span><span className="font-semibold text-right">5 credits</span>
            </div>
          </div>

          {/* Recent transactions */}
          {creditTransactions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Recent activity</p>
              <ul className="space-y-1.5">
                {creditTransactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between text-xs text-gray-600">
                    <span className="truncate max-w-[65%]">{tx.description ?? tx.action ?? tx.type}</span>
                    <span className={tx.amount > 0 ? "font-semibold text-green-600" : "font-semibold text-gray-700"}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Feature list */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">What&apos;s included in {plan.name}</h2>
        <ul className="mt-3 space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-orange-100 flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4l2 2 4-4" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>
        {tier === "free" && (
          <a
            href="/plans"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
          >
            Upgrade plan
          </a>
        )}
      </div>
    </div>
  );
}
