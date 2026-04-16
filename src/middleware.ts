import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isFreePlanTier } from "@/lib/access/tiers";
import { hasAdminAccess } from "@/lib/admin/access";

// ---------------------------------------------------------------------------
// Route-tier classification for rate limiting
// strict   — public write endpoints most exposed to abuse
// ai       — expensive AI / Basebot calls
// standard — all other authenticated API routes
// ---------------------------------------------------------------------------
const STRICT_ROUTES   = ["/api/waitlist", "/api/auth/signup/profile"];
const AI_ROUTES       = ["/api/basebot"];
const STANDARD_ROUTES = ["/api/"]; // catch-all for remaining API routes

const RATE_LIMITS: Record<string, { requests: number; window: string }> = {
  strict:   { requests: 10,  window: "1 m" },
  ai:       { requests: 10,  window: "1 m" },
  standard: { requests: 60,  window: "1 m" },
};

function classifyRoute(pathname: string) {
  if (STRICT_ROUTES.some((p) => pathname.startsWith(p)))   return "strict";
  if (AI_ROUTES.some((p) => pathname.startsWith(p)))       return "ai";
  if (STANDARD_ROUTES.some((p) => pathname.startsWith(p))) return "standard";
  return null;
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Dynamically imports Upstash only when env vars are present, keeping the
// Edge bundle free of the package when Upstash is not configured.
async function applyRateLimit(tier: string, ip: string): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false; // not configured — allow all

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis }     = await import("@upstash/redis");

    const redis   = new Redis({ url, token });
    const { requests, window } = RATE_LIMITS[tier];
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window as `${number} ${"s" | "m" | "h" | "d"}`),
      analytics: false,
      prefix: "bf_rl",
    });

    const { success } = await limiter.limit(`${tier}:${ip}`);
    return !success; // true = limited
  } catch {
    return false; // if Upstash is unreachable, fail open
  }
}

const PROTECTED = ["/dashboard", "/programmes", "/bursaries", "/tracker", "/profile", "/basebot", "/admin", "/targets", "/vault", "/discover"];
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limiting (runs before auth, no DB hit required) ----------------
  const tier = classifyRoute(pathname);
  if (tier) {
    const limited = await applyRateLimit(tier, getIp(request));
    if (limited) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }
  }
  // -------------------------------------------------------------------------

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isAdminRoute = pathname.startsWith("/admin");
  const isBaseBotRoute = pathname.startsWith("/basebot");
  const isRootPage = pathname === "/";

  // Not logged in, trying to access protected route
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already logged in, no need to see auth pages
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Logged-in users should land on dashboard instead of public marketing page.
  if (isRootPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle();

    if (!hasAdminAccess({
      tier: profile?.tier,
      appMetadataRole: user.app_metadata?.role,
      appMetadataTier: user.app_metadata?.tier,
    })) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (isBaseBotRoute && !pathname.startsWith("/basebot/preview") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle();

    if (isFreePlanTier(profile?.tier)) {
      return NextResponse.redirect(new URL("/basebot/preview", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.svg$).*)",
  ],
};
