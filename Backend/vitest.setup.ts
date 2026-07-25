import "dotenv/config";

// A few modules read env vars at import time and throw if they're missing
// (lib/supabase.ts, lib/ai.ts). Tests that only exercise pure logic from
// those modules don't need real credentials — just placeholders so the
// import doesn't throw when .env isn't present (e.g. in CI).
process.env.SUPABASE_URL ??= "https://placeholder.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "placeholder-service-role-key";
process.env.ANTHROPIC_API_KEY ??= "placeholder-anthropic-key";
