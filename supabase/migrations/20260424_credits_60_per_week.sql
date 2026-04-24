-- Change Grade 12 Essential refill from 100 → 60 per week and cap from 300 → 180.
-- Grade 11 Pro stays at 150/week (its own tier).
-- NOTE: the 180 cap is applied to ALL credit-eligible tiers. Grade 11 Pro
-- previously benefited from a 300 cap; if you want them uncapped relative to
-- their 150/week allowance, change v_cap logic below.

-- 1. Backfill weekly_allowance for existing Grade 12 Essential users
update public.user_credits uc
set weekly_allowance = 60,
    updated_at       = now()
from public.profiles p
where p.id = uc.user_id
  and p.tier = 'essential'
  and (p.grade_year is distinct from 'Grade 11')
  and uc.weekly_allowance = 100;

-- 2. Clamp any balance currently above the new cap down to 180.
--    We log a single "balance cap adjustment" transaction for audit.
with clamped as (
  update public.user_credits
  set balance            = least(balance, 180),
      week_start_balance = least(week_start_balance, 180),
      updated_at         = now()
  where balance > 180 or week_start_balance > 180
  returning user_id, balance
)
insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
select user_id, 0, 'bonus', 'cap_adjustment', 'Balance adjusted for new 180 cap', balance
from clamped;

-- 3. Re-create initialize_user_credits: activation bonus 60, cap 180
create or replace function public.initialize_user_credits(
  p_user_id uuid,
  p_term_months integer
)
returns void language plpgsql security definer as $$
declare
  v_bonus            integer := 60;
  v_cap              integer := 180;
  v_weekly_allowance integer := 60;
  v_new_balance      integer;
begin
  -- Detect weekly allowance from profile (Grade 11 Pro keeps 150)
  select
    case when p.grade_year = 'Grade 11' and p.tier = 'pro' then 150 else 60 end
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

-- 4. Re-create weekly_credit_top_up with the new 180 cap.
--    Each row's weekly_allowance still drives how much is added (60 or 150).
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
