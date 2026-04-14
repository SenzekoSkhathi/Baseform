import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, CreditCard, Download, ShieldCheck, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PLANS, type PublicPlan } from "@/lib/site-config/defaults";

type BillingEvent = {
  id: string;
  plan_slug: string;
  amount_zar: string | number;
  status: string;
  term_months: number | null;
  term_label: string | null;
  payfast_payment_id: string | null;
  created_at: string;
};

function normalizeTier(value: string | undefined): string {
  const tier = String(value ?? "free").trim().toLowerCase();
  if (tier === "essential" || tier === "pro" || tier === "ultra" || tier === "free") return tier;
  return "free";
}

function findPlan(slug: string): PublicPlan | undefined {
  return DEFAULT_PLANS.find((plan) => plan.slug === slug);
}

function toPlanLabel(slug: string): string {
  return findPlan(slug)?.name ?? slug;
}

function formatStatus(status: string): string {
  const value = status.trim().toLowerCase();
  if (value === "complete") return "Paid";
  if (value === "cancelled") return "Cancelled";
  if (value === "failed") return "Failed";
  return status;
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: profile }, { data: history }] = await Promise.all([
    admin
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("billing_events")
      .select("id, plan_slug, amount_zar, status, term_months, term_label, payfast_payment_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const tier = normalizeTier((profile as { tier?: string } | null)?.tier);
  const currentPlan = findPlan(tier) ?? findPlan("free") ?? DEFAULT_PLANS[0];
  const paidPlans = DEFAULT_PLANS.filter((plan) => plan.slug !== "free");
  const paymentHistory = (history ?? []) as BillingEvent[];
  const latestPaid = paymentHistory.find((entry) => entry.status.toLowerCase() === "complete");

  return (
    <main>
      <div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <CreditCard size={14} />
              Billing
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900">Manage your plan</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review your active subscription, download receipts, and switch when you need more power.
            </p>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-[#fffaf5] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current plan</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <h2 className="text-2xl font-black text-gray-900">{currentPlan?.name ?? "Free"}</h2>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
                  {currentPlan?.price ?? "R0"}{currentPlan?.period ?? "/month"}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{currentPlan?.tagline ?? "Get started"}</p>
              {latestPaid && (
                <p className="mt-1 text-xs font-semibold text-orange-700">
                  Latest billing term: {latestPaid.term_label ?? `${latestPaid.term_months ?? 3} months use`}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/plans"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
              >
                <Sparkles size={16} />
                Change plan
              </Link>
              {tier !== "free" ? (
                <Link
                  href="/plans?plan=free"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <ShieldCheck size={16} />
                  Downgrade to Free
                </Link>
              ) : (
                <Link
                  href="/plans/essential"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <ShieldCheck size={16} />
                  Upgrade to Essential
                </Link>
              )}
            </div>
          </section>

          <aside className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-gray-900">Plan comparison</h2>
            <div className="space-y-3">
              {paidPlans.map((plan) => (
                <div key={plan.slug} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500">{plan.price}{plan.period}</p>
                    </div>
                    {tier === plan.slug ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        <Check size={12} />
                        Active
                      </span>
                    ) : (
                      <Link
                        href={plan.slug === "essential" ? "/plans/essential" : `/payment?plan=${plan.slug}`}
                        className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-black"
                      >
                        Select
                      </Link>
                    )}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.slice(0, 3).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-gray-600">
                        <Check size={12} className="mt-0.5 text-orange-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900">Payment history</h2>
              <p className="mt-1 text-sm text-gray-500">Recent billing events and downloadable receipts.</p>
            </div>
          </div>

          {paymentHistory.length > 0 ? (
            <div className="mt-4 space-y-3">
              {paymentHistory.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{toPlanLabel(entry.plan_slug)}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleString()} · R{Number(entry.amount_zar).toFixed(2)} · {entry.term_label ?? `${entry.term_months ?? 3} months use`}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">Status: {formatStatus(entry.status)}</p>
                    </div>

                    <Link
                      href={`/api/billing/receipt/${entry.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Download size={16} />
                      Receipt
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No payment history yet. Once your first PayFast payment is confirmed, it will appear here.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}