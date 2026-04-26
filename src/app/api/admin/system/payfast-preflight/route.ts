import { NextResponse } from "next/server";
import { requireAdminGuard } from "@/lib/admin/auth";

type CheckStatus = "pass" | "warn" | "fail";
type Check = { name: string; status: CheckStatus; detail: string };

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const checks: Check[] = [];

  // ── 1. Env vars ────────────────────────────────────────────────────────────
  const merchantId = String(process.env.PAYFAST_MERCHANT_ID ?? "").trim();
  const merchantKey = String(process.env.PAYFAST_MERCHANT_KEY ?? "").trim();
  const passphrase = String(process.env.PAYFAST_PASSPHRASE ?? "").trim();
  const rawPassphrase = process.env.PAYFAST_PASSPHRASE ?? "";
  const sandboxRaw = process.env.PAYFAST_SANDBOX ?? process.env.NEXT_PUBLIC_PAYFAST_SANDBOX ?? "true";
  const isSandbox = String(sandboxRaw).toLowerCase() !== "false";
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const cronSecret = String(process.env.CRON_SECRET ?? "").trim();
  const resendKey = String(process.env.RESEND_API_KEY ?? "").trim();

  checks.push({
    name: "PAYFAST_MERCHANT_ID set",
    status: merchantId ? "pass" : "fail",
    detail: merchantId ? `Set (${merchantId.slice(0, 4)}…)` : "Missing — payment initiation will throw.",
  });

  checks.push({
    name: "PAYFAST_MERCHANT_KEY set",
    status: merchantKey ? "pass" : "fail",
    detail: merchantKey ? "Set" : "Missing — payment initiation will throw.",
  });

  checks.push({
    name: "PAYFAST_PASSPHRASE set",
    status: passphrase ? "pass" : "warn",
    detail: passphrase
      ? rawPassphrase !== passphrase
        ? "WARNING — leading or trailing whitespace detected. Will break signatures."
        : "Set"
      : "Missing — fine only if your PayFast account has no passphrase configured.",
  });

  checks.push({
    name: "Sandbox mode",
    status: isSandbox ? "warn" : "pass",
    detail: isSandbox
      ? "PAYFAST_SANDBOX is true (or unset). Real payments will not work in production."
      : "Live mode (PAYFAST_SANDBOX=false).",
  });

  checks.push({
    name: "NEXT_PUBLIC_APP_URL set",
    status: appUrl ? "pass" : "fail",
    detail: appUrl
      ? appUrl
      : "Missing — notify_url falls back to request headers, which can resolve to a preview/non-public domain that PayFast can't reach. THIS IS THE #1 CAUSE OF SILENT ITN FAILURES.",
  });

  if (appUrl) {
    checks.push({
      name: "App URL is HTTPS",
      status: appUrl.startsWith("https://") ? "pass" : "fail",
      detail: appUrl.startsWith("https://") ? "OK" : "PayFast only delivers ITNs to HTTPS endpoints in live mode.",
    });

    checks.push({
      name: "App URL has no trailing slash",
      status: !appUrl.endsWith("/") ? "pass" : "warn",
      detail: !appUrl.endsWith("/") ? "OK" : "Trailing slash creates double-slashes in URLs — strip it.",
    });
  }

  checks.push({
    name: "CRON_SECRET set",
    status: cronSecret ? "pass" : "fail",
    detail: cronSecret
      ? "Set — stale-payment cron will run."
      : "Missing — the cron that catches missing ITNs is locked out and will return 401.",
  });

  checks.push({
    name: "RESEND_API_KEY set",
    status: resendKey ? "pass" : "warn",
    detail: resendKey ? "Set — invoice emails will send." : "Missing — invoices will be skipped silently.",
  });

  // ── 2. Notify URL reachability ────────────────────────────────────────────
  if (appUrl) {
    const notifyUrl = `${appUrl.replace(/\/$/, "")}/api/payments/payfast/notify`;
    try {
      // POST with no body — the route should reject with a 400 (signature missing).
      // Anything other than a network error proves the endpoint is publicly reachable.
      const probeRes = await fetch(notifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "",
        cache: "no-store",
      });
      const status = probeRes.status;
      checks.push({
        name: "Notify endpoint reachable",
        status: status >= 400 && status < 500 ? "pass" : status >= 500 ? "warn" : "warn",
        detail: `${notifyUrl} → HTTP ${status}. ${
          status >= 400 && status < 500
            ? "Endpoint is live and rejecting unsigned probes (expected)."
            : "Unexpected status — investigate."
        }`,
      });
    } catch (err) {
      checks.push({
        name: "Notify endpoint reachable",
        status: "fail",
        detail: `Could not reach ${notifyUrl}: ${err instanceof Error ? err.message : String(err)}. PayFast won't be able to either.`,
      });
    }
  }

  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };

  return NextResponse.json({
    ok: summary.fail === 0,
    summary,
    checks,
    notifyUrl: appUrl ? `${appUrl.replace(/\/$/, "")}/api/payments/payfast/notify` : null,
    sandboxMode: isSandbox,
  });
}
