import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 10% of sessions as replays in production; 100% on errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Trace 20% of requests for performance monitoring
  tracesSampleRate: 0.2,

  integrations: [
    Sentry.replayIntegration(),
  ],
});
