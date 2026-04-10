import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baseform — Your University Application Co-pilot",
  description:
    "Discover universities and bursaries you qualify for, track every application, and never miss a deadline.",
  manifest: "/manifest.json",
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
    title: "Baseform",
    description: "Your SA university application co-pilot",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      </head>
      <body>{children}</body>
    </html>
  );
}
