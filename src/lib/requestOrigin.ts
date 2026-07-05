import type { NextRequest } from "next/server";

/**
 * External origin of the request as the browser sees it.
 *
 * Behind Cloud Run / Firebase App Hosting TLS terminates at the load
 * balancer, so `req.url` reports `http://`. Google OAuth rejects plain-http
 * redirect URIs ("doesn't comply with OAuth 2.0 policy"), so build the
 * origin from the forwarded headers instead and only trust `req.url` as a
 * last resort (local dev).
 */
export function externalOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return new URL(req.url).origin;

  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${proto}://${host}`;
}
