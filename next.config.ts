import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint runs during builds. The lint script uses eslint-config-next (flat config)
    // directly — do not restore FlatCompat which triggered a circular-ref crash.
    ignoreDuringBuilds: false,
  },
  experimental: {
    // Tree-shake large icon/animation libraries — only ships icons/motion components actually used
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
  async headers() {
    // Content-Security-Policy — built from individual directives so each line
    // is readable and easy to extend.
    //
    // 'unsafe-inline' in script-src is required by Next.js inline hydration
    // scripts. To harden further, replace with a nonce-based approach once
    // traffic justifies the middleware overhead.
    const csp = [
      "default-src 'self'",
      // Next.js inline scripts + PayFast engine.js (onsite payments)
      "script-src 'self' 'unsafe-inline' https://www.payfast.co.za https://sandbox.payfast.co.za https://payment.payfast.io",
      // Tailwind / CSS-in-JS inline styles + PayFast engine.css
      "style-src 'self' 'unsafe-inline' https://payment.payfast.io",
      // University logos, Supabase storage, blob/data URLs for share card
      "img-src 'self' data: blob: https://upload.wikimedia.org https://*.supabase.co https://tenderbulletins.co.za https://www.skillsportal.co.za https://veldfiremedia.com https://studentroom.co.za https://sagea.org.za https://www.itweb.co.za https://www.univen.ac.za https://cms.cut.ac.za https://media.cdn.gradconnection.com https://i1.rgstatic.net https://images.sftcdn.net",
      // No external fonts — system stack only
      "font-src 'self' data:",
      // API calls: Supabase REST + Realtime WS, Sentry EU ingest, Hono backend, PayFast
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.de.sentry.io https://baseform.onrender.com https://www.payfast.co.za https://sandbox.payfast.co.za https://payment.payfast.io",
      // Vault PDF (blob:), Office preview, PayFast onsite modal
      "frame-src blob: https://view.officeapps.live.com https://www.payfast.co.za https://sandbox.payfast.co.za https://payment.payfast.io",
      // Service worker (PWA)
      "worker-src 'self' blob:",
      // Block all plugin content
      "object-src 'none'",
      // Prevent base-tag hijacking
      "base-uri 'self'",
      // Restrict form submissions to own origin + PayFast redirect flow
      "form-action 'self' https://www.payfast.co.za https://sandbox.payfast.co.za",
      // Upgrade any accidental http:// sub-resource requests
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy",   value: csp },
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "lumen-ai-5r",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
