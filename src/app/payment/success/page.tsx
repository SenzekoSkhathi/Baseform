import { Suspense } from "react";
import type { Metadata } from "next";
import SuccessClient from "./SuccessClient";

export const metadata: Metadata = {
  title: "Welcome to your new plan — Baseform",
  description: "Activating your Baseform plan upgrade.",
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>}>
      <SuccessClient />
    </Suspense>
  );
}
