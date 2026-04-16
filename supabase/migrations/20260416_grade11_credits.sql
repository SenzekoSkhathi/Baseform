-- Grade 11 Base Credits: 150 credits/week for Pro tier
-- Adds weekly_allowance column so each user's top-up amount is configurable.
-- Grade 12 Essential → 100/week (unchanged)
-- Grade 11 Pro       → 150/week

-- 1. Add weekly_allowance column (default 100 keeps existing Grade 12 users correct)
alter table public.user_credits
  add column if not exists weekly_allowance integer not null default 100;

-- 2. Backfill existing Grade 11 Pro users who already have a credits row
update public.user_credits uc
set weekly_allowance = 150
from public.profiles p
where p.id = uc.user_id
  and p.grade_year = 'Grade 11'
  and p.tier = 'pro';

-- 3. Re-create initialize_user_credits
--    Detects grade_year/tier from profiles to set the correct weekly_allowance.
--    Grade 11 Pro gets 150; everyone else gets 100.
create or replace function public.initialize_user_credits(
  p_user_id uuid,
  p_term_months integer
)
returns void language plpgsql security definer as $$
declare
  v_bonus            integer := 100;
  v_cap              integer := 300;
  v_weekly_allowance integer := 100;
  v_new_balance      integer;
begin
  -- Detect weekly allowance from profile
  select
    case when p.grade_year = 'Grade 11' and p.tier = 'pro' then 150 else 100 end
  into v_weekly_allowance
  from public.profiles p
  where p.id = p_user_id;

  insert into public.user_credits (
    user_id, balance, week_start_balance, weekly_allowance,
    plan_start_date, plan_term_months, last_topped_up_at
  )
  values (
    p_user_id,
    least(v_bonus, v_cap),
    least(v_bonus, v_cap),
    v_weekly_allowance,
    now(), p_term_months, now()
  )
  on conflict (user_id) do update
    set balance            = least(v_bonus, v_cap),
        week_start_balance = least(v_bonus, v_cap),
        weekly_allowance   = v_weekly_allowance,
        plan_start_date    = now(),
        plan_term_months   = excluded.plan_term_months,
        last_topped_up_at  = now(),
        updated_at         = now();

  select balance into v_new_balance
  from public.user_credits where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
  values (p_user_id, v_bonus, 'bonus', 'plan_activation', 'Plan activation bonus', v_new_balance);
end;
$$;

-- 4. Re-create weekly_credit_top_up
--    Uses each row's weekly_allowance instead of a hardcoded 100.
--    Covers Grade 12 Essential AND Grade 11 Pro (the two credit-eligible tiers).
create or replace function public.weekly_credit_top_up()
returns void language plpgsql security definer as $$
declare
  rec       record;
  v_cap     integer := 300;
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
    v_add     := coalesce(rec.weekly_allowance, 100);
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
