import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side guard: ensures the request comes from an authenticated user
 * whose email has been verified. Redirects elsewhere if not.
 *
 * Why a separate helper:
 * - Supabase's built-in "Confirm email" toggle only blocks the sign-in call;
 *   sessions created before the toggle was enabled, or via the email-change
 *   flow, can still leak through unverified.
 * - Defense-in-depth: even if the auth setting is misconfigured or a future
 *   migration toggles it off, the dashboard / onboarding / admin areas all
 *   stay locked to verified users.
 *
 * Returns the user object (always email-verified) or redirects.
 */
export async function requireVerifiedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!user.email_confirmed_at) {
    redirect("/verify-email?reason=unverified");
  }

  return user;
}
