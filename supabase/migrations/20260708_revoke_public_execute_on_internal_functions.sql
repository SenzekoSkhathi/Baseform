-- Security fix: several SECURITY DEFINER functions were reachable by the
-- public `anon` role (and `authenticated`) via PostgREST RPC
-- (/rest/v1/rpc/<fn>), with no internal check that the caller is who they
-- claim to be. Concretely this let anyone with the public anon key:
--   - initialize_user_credits: self-grant the paid-plan activation bonus
--     without paying (bypasses PayFast entirely)
--   - weekly_credit_top_up / monthly_credit_top_up: trigger a free top-up
--     for every user in the system, on demand
--   - deduct_credits: zero out any other student's credit balance
--   - get_credit_vault_balance: read internal AI-cost economics, unauthenticated
--   - ensure_free_user_credits, handle_new_user, handle_user_email_updated:
--     not meant to be called directly at all (cron/trigger-only)
--
-- All of these are called internally via the service-role client
-- (Backend/src/lib/credits.ts, the handle_new_user/email trigger bindings),
-- which is unaffected by revoking anon/authenticated — only the public REST
-- RPC surface is closed.
--
-- Postgres also grants EXECUTE to the PUBLIC pseudo-role by default at
-- function creation time, and every role (including anon/authenticated) is
-- implicitly a member of PUBLIC — so revoking from the named roles alone
-- does not close the hole. Both revokes are required; verified live against
-- information_schema.routine_privileges that only `postgres` and
-- `service_role` retain EXECUTE after this migration.

revoke execute on function public.deduct_credits(uuid, integer, text, text) from anon, authenticated, public;
revoke execute on function public.initialize_user_credits(uuid, integer) from anon, authenticated, public;
revoke execute on function public.ensure_free_user_credits(uuid) from anon, authenticated, public;
revoke execute on function public.get_credit_vault_balance() from anon, authenticated, public;
revoke execute on function public.monthly_credit_top_up() from anon, authenticated, public;
revoke execute on function public.weekly_credit_top_up() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.handle_user_email_updated() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
