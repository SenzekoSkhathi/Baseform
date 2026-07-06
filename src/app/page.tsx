import type { Metadata } from "next";
import HomeClient from "./HomeClient";

// The landing page lives at "/" so search engines index real content instead
// of a redirect stub. Logged-in users are bounced to /dashboard by middleware.
export const metadata: Metadata = {
  title: "Baseform — Your University Application Co-pilot",
  description:
    "Baseform helps SA Grade 11 and 12 learners discover universities and bursaries they qualify for, track every application, and never miss a deadline.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Baseform — Your University Application Co-pilot",
    description:
      "Discover universities and bursaries you qualify for, track every application, and never miss a deadline.",
  },
};

export default function Home() {
  return <HomeClient />;
}
