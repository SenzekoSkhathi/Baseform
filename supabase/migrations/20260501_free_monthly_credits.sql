-- Free-plan monthly Base Credits.
-- Free users get 20 credits per calendar month, BaseBot messages only,
-- no weekly limits and no carryover. They are NOT topped up by the
-- weekly cron — only by the new monthly cron below.

alter table public.user_credits
  add column if not exists last_monthly_top_up_at timestamptz;

-- Backfill: every existing free-tier profile gets a credits row with 20 credits,
-- anchored to 2026-05-01 so the next monthly grant lands on 2026-06-01.
insert into public.user_credits (
  user_id, balance, week_start_balance, weekly_allowance,
  plan_start_date, plan_term_months, last_topped_up_at, last_monthly_top_up_at
)
select
  p.id,
  20,
  0,    -- weekly tracking is not used for free users
  0,
  now(),
  3,    -- arbitrary; required by check constraint (3/6/9)
  null,
  timestamptz '2026-05-01 00:00:00+00'
from public.profiles p
where coalesce(p.tier, 'free') = 'free'
on conflict (user_id) do nothing;

-- Log the activation grant for each backfilled user.
insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
select uc.user_id, 20, 'bonus', 'free_monthly_grant', 'Free plan monthly credits', uc.balance
from public.user_credits uc
join public.profiles p on p.id = uc.user_id
where coalesce(p.tier, 'free') = 'free'
  and uc.last_monthly_top_up_at = timestamptz '2026-05-01 00:00:00+00'
  and not exists (
    select 1 from public.credit_transactions ct
    where ct.user_id = uc.user_id and ct.action = 'free_monthly_grant'
  );

-- Monthly top-up: resets free users' balance to 20 once per calendar month.
-- No carryover — leftover credits from the prior month are discarded.
create or replace function public.monthly_credit_top_up()
returns void language plpgsql security definer as $$
declare
  rec        record;
  v_grant    integer := 20;
  v_delta    integer;
begin
  for rec in
    select uc.user_id, uc.balance, uc.last_monthly_top_up_at
    from public.user_credits uc
    join public.profiles p on p.id = uc.user_id
    where coalesce(p.tier, 'free') = 'free'
      and (
        uc.last_monthly_top_up_at is null
        or date_trunc('month', uc.last_monthly_top_up_at) < date_trunc('month', now())
      )
  loop
    v_delta := v_grant - rec.balance;

    update public.user_credits
    set balance               = v_grant,
        week_start_balance    = 0,
        last_monthly_top_up_at = now(),
        updated_at            = now()
    where user_id = rec.user_id;

    insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
    values (rec.user_id, v_delta, 'top_up', 'monthly_top_up', 'Monthly free credits refill', v_grant);
  end loop;
end;
$$;

-- Provision a free-user credits row on demand (called from the API the first
-- time a brand-new free signup hits BaseBot). Idempotent.
create or replace function public.ensure_free_user_credits(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.user_credits (
    user_id, balance, week_start_balance, weekly_allowance,
    plan_start_date, plan_term_months, last_topped_up_at, last_monthly_top_up_at
  )
  values (p_user_id, 20, 0, 0, now(), 3, null, now())
  on conflict (user_id) do nothing;

  if (select 1 from public.credit_transactions
      where user_id = p_user_id and action = 'free_monthly_grant' limit 1) is null
     and exists (select 1 from public.user_credits where user_id = p_user_id) then
    insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
    values (p_user_id, 20, 'bonus', 'free_monthly_grant', 'Free plan monthly credits',
            (select balance from public.user_credits where user_id = p_user_id));
  end if;
end;
$$;

-- Exclude free users from the weekly cron (they are monthly-only).
create or replace function public.weekly_credit_top_up()
returns void language plpgsql security definer as $$
declare
  rec       record;
  v_cap     integer := 180;
  v_add     integer;
  v_new_bal integer;
begin
  for rec in
    select uc.user_id, uc.balance, uc.weekly_allowance
    from public.user_credits uc
    join public.profiles p on p.id = uc.user_id
    where (
      (p.tier = 'essential' and (p.grade_year is distinct from 'Grade 11'))
      or
      (p.tier = 'pro' and p.grade_year = 'Grade 11')
    )
      and (uc.last_topped_up_at is null or uc.last_topped_up_at <= now() - interval '7 days')
  loop
    v_add     := coalesce(rec.weekly_allowance, 60);
    v_new_bal := least(rec.balance + v_add, v_cap);

    update public.user_credits
    set balance            = v_new_bal,
        week_start_balance = v_new_bal,
        last_topped_up_at  = now(),
        updated_at         = now()
    where user_id = rec.user_id;

    insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
    values (rec.user_id, v_new_bal - rec.balance, 'top_up', 'weekly_top_up', 'Weekly credit top-up', v_new_bal);
  end loop;
end;
$$;

-- Schedule with pg_cron (run once in the Supabase SQL editor):
--
--   select cron.schedule(
--     'monthly-credit-top-up',
--     '0 0 1 * *',
--     $$select public.monthly_credit_top_up();$$
--   );
