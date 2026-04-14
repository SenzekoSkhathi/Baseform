import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Download, ShieldCheck, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PLANS, type PublicPlan } from "@/lib/site-config/defaults";

export const metadata = { title: "Billing — Settings" };

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
  return ["essential", "pro", "ultra", "free"].includes(tier) ? tier : "free";
}

function findPlan(slug: string): PublicPlan | undefined {
  return DEFAULT_PLANS.find((p) => p.slug === slug);
}

function toPlanLabel(slug: string): string {
  return findPlan(slug)?.name ?? slug;
}

function statusBadge(status: string) {
  const s = status.trim().toLowerCase();
  if (s === "complete") return { label: "Paid", cls: "bg-green-50 text-green-700" };
  if (s === "cancelled") return { label: "Cancelled", cls: "bg-gray-100 text-gray-500" };
  if (s === "failed") return { label: "Failed", cls: "bg-red-50 text-red-600" };
  return { label: status, cls: "bg-gray-100 text-gray-500" };
}

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: profile }, { data: history }] = await Promise.all([
    admin.from("profiles").select("tier").eq("id", user.id).maybeSingle(),
    admin
      .from("billing_events")
      .select("id, plan_slug, amount_zar, status, term_months, term_label, payfast_payment_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const tier = normalizeTier((profile as { tier?: string } | null)?.tier);
  const currentPlan = findPlan(tier) ?? DEFAULT_PLANS[0];
  const paymentHistory = (history ?? []) as BillingEvent[];
  const latestPaid = paymentHistory.find((e) => e.status.toLowerCase() === "complete");

  return (
    <div className="space-y-4">
      {/* Manage Plan */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-orange-500" />
          <h1 className="text-lg font-black text-gray-900">Manage Plan</h1>
        </div>

        {/* Current plan badge */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">Current plan</p>
            <p className="mt-0.5 text-xl font-black text-gray-900">{currentPlan.name}</p>
            <p className="text-sm text-gray-500">{currentPlan.price}{currentPlan.period}</p>
          </div>
          {latestPaid && (
            <p className="text-right text-xs text-orange-600 font-semibold">
              {latestPaid.term_label ?? `${latestPaid.term_months ?? 3} months`}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
          >
            <Sparkles size={14} />
            Change plan
          </Link>
          {tier !== "free" ? (
            <Link
              href="/plans?plan=free"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <ShieldCheck size={14} />
              Downgrade to Free
            </Link>
          ) : (
            <Link
              href="/plans/essential"
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
            >
              <ShieldCheck size={14} />
              Upgrade to Essential
            </Link>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-gray-900">Payment History</h2>
        <p className="mt-0.5 text-sm text-gray-500">Your past payments and downloadable receipts.</p>

        {paymentHistory.length > 0 ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {paymentHistory.map((entry) => {
              const badge = statusBadge(entry.status);
              return (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {toPlanLabel(entry.plan_slug)}
                      </p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString("en-ZA", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {" · "}R{Number(entry.amount_zar).toFixed(2)}
                      {" · "}{entry.term_label ?? `${entry.term_months ?? 3} months`}
                    </p>
                  </div>
                  <Link
                    href={`/api/billing/receipt/${entry.id}`}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    <Download size={13} />
                    Receipt
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No payments yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Once your first payment is confirmed it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
