import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isFreePlanTier } from "@/lib/access/tiers";
import { hasAdminAccess } from "@/lib/admin/access";
import { checkRateLimit, strictLimiter, standardLimiter, aiLimiter } from "@/lib/ratelimit";

// ---------------------------------------------------------------------------
// Route-tier classification for rate limiting
// strict   — public write endpoints most exposed to abuse
// ai       — expensive AI / Basebot calls
// standard — all other authenticated API routes
// ---------------------------------------------------------------------------
const STRICT_ROUTES   = ["/api/waitlist", "/api/auth/signup/profile"];
const AI_ROUTES       = ["/api/basebot"];
const STANDARD_ROUTES = ["/api/"]; // catch-all for remaining API routes

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

const PROTECTED = ["/dashboard", "/programmes", "/bursaries", "/tracker", "/profile", "/basebot", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limiting (runs before auth, no DB hit required) ----------------
  const tier = classifyRoute(pathname);
  if (tier) {
    const limiter =
      tier === "strict"   ? strictLimiter   :
      tier === "ai"       ? aiLimiter       :
      standardLimiter;

    const ip = getIp(request);
    const { limited } = await checkRateLimit(limiter, `${tier}:${ip}`);

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

  if (isBaseBotRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle();

    if (isFreePlanTier(profile?.tier)) {
      return NextResponse.redirect(new URL("/settings/billing?upgrade=ai", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.svg$).*)",
  ],
};
