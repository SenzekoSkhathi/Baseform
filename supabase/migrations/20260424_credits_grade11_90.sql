-- Change Grade 11 Pro refill from 150 → 90 per week.
-- Cap stays at 180.

-- 1. Backfill weekly_allowance for existing Grade 11 Pro users
update public.user_credits uc
set weekly_allowance = 90,
    updated_at       = now()
from public.profiles p
where p.id = uc.user_id
  and p.tier = 'pro'
  and p.grade_year = 'Grade 11'
  and uc.weekly_allowance = 150;

-- 2. Re-create initialize_user_credits with Grade 11 Pro = 90/week
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
  select
    case when p.grade_year = 'Grade 11' and p.tier = 'pro' then 90 else 60 end
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

-- weekly_credit_top_up does not need to change — it already reads each row's
-- weekly_allowance, which is now 90 for Grade 11 Pro after the backfill above.
