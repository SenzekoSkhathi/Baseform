import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin client — uses the service role key.
 * Bypasses RLS. Only ever called from Next.js server code (API routes / Server Actions).
 * NEVER import this in client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars for admin client");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
