import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/programmes", "/bursaries", "/tracker", "/profile", "/basebot", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

    const tier = String(profile?.tier ?? "").trim().toLowerCase();
    const appRole = String(user.app_metadata?.role ?? "").trim().toLowerCase();
    const appTier = String(user.app_metadata?.tier ?? "").trim().toLowerCase();

    if (tier !== "admin" && appRole !== "admin" && appTier !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.svg$).*)",
  ],
};
