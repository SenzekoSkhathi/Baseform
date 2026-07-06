import type { Metadata } from "next";
import PlansClient from "./PlansClient";

export const metadata: Metadata = {
  title: "Plans & Pricing",
  description:
    "Compare Baseform plans for Grade 11 and Grade 12 learners — Base Credits for the AI Coach, bursary alerts, Gmail agent, and motivation letter drafts.",
  alternates: { canonical: "/plans" },
};

export default function PlansPage() {
  return <PlansClient />;
}
