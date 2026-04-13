"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/ui/Logo";
import { DEFAULT_PLANS, type PublicPlan } from "@/lib/site-config/defaults";

type PlanId = "essential" | "pro" | "ultra";

const DEFAULT_PLAN_COPY: Record<PlanId, { name: string; price: string }> = {
  essential: { name: "Essential", price: "R59 / month" },
  pro: { name: "Pro", price: "R129 / month" },
  ultra: { name: "Ultra", price: "R249 / month" },
};

function toPlanCopy(rows: PublicPlan[]): Record<PlanId, { name: string; price: string }> {
  const copy: Record<PlanId, { name: string; price: string }> = { ...DEFAULT_PLAN_COPY };

  for (const row of rows) {
    if (row.slug === "essential" || row.slug === "pro" || row.slug === "ultra") {
      copy[row.slug] = {
        name: row.name,
        price: `${row.price} ${row.period}`,
      };
    }
  }

  return copy;
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [planCopy, setPlanCopy] = useState<Record<PlanId, { name: string; price: string }>>(DEFAULT_PLAN_COPY);

  const plan = useMemo(() => {
    const raw = (searchParams.get("plan") ?? "essential") as PlanId;
    return raw in planCopy ? raw : "essential";
  }, [planCopy, searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadConfig() {
      try {
        const res = await fetch("/api/site-config", { signal: controller.signal });
        if (!res.ok) return;
        const payload = await res.json();
        const plans = Array.isArray(payload?.plans) ? (payload.plans as PublicPlan[]) : DEFAULT_PLANS;
        setPlanCopy(toPlanCopy(plans));
      } catch {
        // Keep defaults when config fetch fails.
      }
    }

    void loadConfig();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) return;

    if (status === "cancelled") {
      setNotice("Payment was cancelled. You can try again whenever you are ready.");
      return;
    }

    if (status !== "success") return;

    let isMounted = true;
    async function verifyReturn() {
      setNotice("Payment received. Verifying your plan upgrade...");
      try {
        const res = await fetch("/api/payments/payfast/verify-return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        const payload = (await res.json().catch(() => null)) as { ok?: boolean; pending?: boolean } | null;
        if (!isMounted) return;

        if (res.ok && payload?.ok) {
          router.push("/dashboard");
          return;
        }

        if (payload?.pending) {
          setNotice("We are still confirming your payment with PayFast. Please refresh in a few moments.");
          return;
        }

        setError("We could not verify your payment yet. Please refresh or contact support.");
      } catch {
        if (!isMounted) return;
        setError("Verification failed. Please refresh and try again.");
      }
    }

    void verifyReturn();
    return () => {
      isMounted = false;
    };
  }, [plan, router, searchParams]);

  async function handleCompletePayment() {
    setLoading(true);
    setError("");
    setNotice("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/payments/payfast/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });

    const payload = (await res.json().catch(() => null)) as
      | {
          error?: string;
          processUrl?: string;
          fields?: Record<string, string>;
        }
      | null;

    if (!res.ok || !payload?.processUrl || !payload.fields) {
      setError(payload?.error ?? "Could not start payment. Please try again.");
      setLoading(false);
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = payload.processUrl;

    for (const [key, value] of Object.entries(payload.fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }

  const payfastSandbox = process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === "true";

  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <Logo variant="lockup" size="md" className="mb-8" />

        <div className="space-y-1 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Complete your payment</h2>
          <p className="text-gray-500 text-sm">
            You selected the <span className="font-semibold text-gray-700">{planCopy[plan].name}</span> plan ({planCopy[plan].price}).
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800">
          You will be redirected to PayFast to complete your payment securely.
          {payfastSandbox ? " Sandbox mode is currently enabled." : ""}
        </div>

        {notice && <p className="mt-4 text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl">{notice}</p>}
        {error && <p className="mt-4 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

        <button
          type="button"
          onClick={handleCompletePayment}
          disabled={loading}
          className="mt-5 w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base disabled:opacity-50 hover:bg-orange-600 transition-colors"
        >
          {loading ? "Confirming…" : "Pay now"}
        </button>
      </div>
    </main>
  );
}
