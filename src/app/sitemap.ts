import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://baseformapplications.com";

// Public marketing + legal pages only. App routes (/dashboard, /vault, …)
// are auth-gated and deliberately excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/how-it-works", priority: 0.9 },
    { path: "/plans", priority: 0.8 },
    { path: "/about", priority: 0.6 },
    { path: "/contact", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
  ];

  return pages.map(({ path, priority }) => ({
    url: `${BASE_URL}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority,
  }));
}
