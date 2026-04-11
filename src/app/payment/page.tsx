"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/ui/Logo";

type PlanId = "essential" | "pro" | "ultra";

const PLAN_COPY: Record<PlanId, { name: string; price: string }> = {
  essential: { name: "Essential", price: "R59 / month" },
  pro: { name: "Pro", price: "R129 / month" },
  ultra: { name: "Ultra", price: "R249 / month" },
};

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = useMemo(() => {
    const raw = (searchParams.get("plan") ?? "essential") as PlanId;
    return raw in PLAN_COPY ? raw : "essential";
  }, [searchParams]);

  async function handleCompletePayment() {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tier: plan })
      .eq("id", user.id);

    if (updateError) {
      setError("Could not confirm your plan. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <Logo variant="lockup" size="md" className="mb-8" />

        <div className="space-y-1 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Complete your payment</h2>
          <p className="text-gray-500 text-sm">
            You selected the <span className="font-semibold text-gray-700">{PLAN_COPY[plan].name}</span> plan ({PLAN_COPY[plan].price}).
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800">
          Payment provider integration can be connected here. For now, use the button below to complete this flow and continue.
        </div>

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
