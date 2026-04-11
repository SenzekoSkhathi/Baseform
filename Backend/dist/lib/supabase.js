"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
exports.createUserClient = createUserClient;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}
/**
 * Admin client — bypasses RLS. Only use server-side, never expose to frontend.
 */
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
/**
 * Creates a Supabase client that acts on behalf of an authenticated user
 * by forwarding their JWT. Respects RLS policies.
 */
function createUserClient(accessToken) {
    return (0, supabase_js_1.createClient)(supabaseUrl, process.env.SUPABASE_ANON_KEY ?? serviceRoleKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
