import type { Metadata } from "next";
import SuccessClient from "./SuccessClient";

export const metadata: Metadata = {
  title: "Welcome to your new plan — Baseform",
  description: "Activating your Baseform plan upgrade.",
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  return <SuccessClient />;
}
