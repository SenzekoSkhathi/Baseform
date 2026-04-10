import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaInstallButton from "@/components/ui/PwaInstallButton";

export const metadata: Metadata = {
  title: "Baseform — Your University Application Co-pilot",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <PwaInstallButton />
      </body>
    </html>
  );
}
