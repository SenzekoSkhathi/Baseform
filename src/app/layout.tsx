import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HeartbeatProvider } from "@/components/HeartbeatProvider";

export const metadata: Metadata = {
  // Resolves relative OG/canonical URLs; opengraph-image.tsx provides the
  // share card WhatsApp/Twitter render from this base.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://baseformapplications.com"
  ),
  title: {
    default: "Baseform — Your University Application Co-pilot",
    template: "%s · Baseform",
  },
  description:
    "Discover universities and bursaries you qualify for, track every application, and never miss a deadline.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Baseform",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Baseform",
    title: "Baseform — Your University Application Co-pilot",
    description:
      "Discover universities and bursaries you qualify for, track every application, and never miss a deadline.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Zoom stays enabled (WCAG 1.4.4) — students need to pinch-zoom APS tables
// and bursary details on small screens; iOS ignores user-scalable=no anyway.
export const viewport: Viewport = {
  themeColor: "#fff9f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Supabase so DB/auth requests start sooner on slow SA data connections */}
        <link rel="preconnect" href="https://twswbccbxitlhkmrvomm.supabase.co" />
        <link rel="dns-prefetch" href="https://twswbccbxitlhkmrvomm.supabase.co" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function (regs) {
                  regs.forEach(function (reg) { reg.unregister(); });
                }).catch(function () {});
              }
              if (typeof caches !== 'undefined') {
                caches.keys().then(function (keys) {
                  keys.forEach(function (key) { caches.delete(key); });
                }).catch(function () {});
              }
            `,
          }}
        />
      </head>
      <body>
        <HeartbeatProvider />
        {children}
      </body>
    </html>
  );
}
