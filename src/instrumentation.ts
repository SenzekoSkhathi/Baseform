// ---------------------------------------------------------------------------
// Env var validation — runs once at server startup (nodejs runtime only).
// Missing required secrets are logged as fatal errors so a broken deploy is
// caught immediately rather than silently failing on the first user request.
// ---------------------------------------------------------------------------

type EnvVar = {
  name: string;
  // "fatal"  → throw and crash the server (cannot function without it)
  // "warn"   → log a warning (feature degraded but app still boots)
  severity: "fatal" | "warn";
};

const REQUIRED_ENV: EnvVar[] = [
  // Supabase
  { name: "NEXT_PUBLIC_SUPABASE_URL",       severity: "fatal" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",  severity: "fatal" },
  { name: "SUPABASE_SERVICE_ROLE_KEY",      severity: "fatal" },
  // Email
  { name: "RESEND_API_KEY",                 severity: "warn"  },
  // Payments
  { name: "PAYFAST_MERCHANT_ID",            severity: "warn"  },
  { name: "PAYFAST_MERCHANT_KEY",           severity: "warn"  },
  // Push notifications
  { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",   severity: "warn"  },
  { name: "VAPID_PRIVATE_KEY",              severity: "warn"  },
  { name: "VAPID_SUBJECT",                  severity: "warn"  },
  // Google Gmail OAuth
  { name: "GOOGLE_CLIENT_ID",               severity: "warn"  },
  { name: "GOOGLE_CLIENT_SECRET",           severity: "warn"  },
];

function validateEnv() {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    console.warn("[startup] SKIP_ENV_VALIDATION=1 — skipping env var checks");
    return;
  }

  const missing = REQUIRED_ENV.filter(({ name }) => !process.env[name]?.trim());
  if (missing.length === 0) return;

  const fatals = missing.filter((v) => v.severity === "fatal").map((v) => v.name);
  const warns  = missing.filter((v) => v.severity === "warn").map((v) => v.name);

  if (warns.length > 0) {
    console.warn(`[startup] Missing optional env vars (degraded features): ${warns.join(", ")}`);
  }

  if (fatals.length > 0) {
    throw new Error(`[startup] Missing required env vars — cannot start: ${fatals.join(", ")}`);
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateEnv();

    const { init } = await import("@sentry/nextjs");
    init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.2,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const { init } = await import("@sentry/nextjs");
    init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.2,
    });
  }
}
