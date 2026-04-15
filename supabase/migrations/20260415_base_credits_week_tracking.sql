-- Track weekly credit usage for threshold notifications.
-- week_start_balance: balance recorded at the start of each weekly period (after top-up or plan activation).
-- Used to calculate how many of this week's 100 credits have been spent.

alter table public.user_credits
  add column if not exists week_start_balance integer not null default 100;

-- Backfill existing rows: treat current balance as week start
update public.user_credits
set week_start_balance = balance
where week_start_balance = 100;

-- Re-create initialize_user_credits to also set week_start_balance
create or replace function public.initialize_user_credits(
  p_user_id uuid,
  p_term_months integer
)
returns void language plpgsql security definer as $$
declare
  v_bonus integer := 100;
  v_cap   integer := 300;
  v_new_balance integer;
begin
  insert into public.user_credits (user_id, balance, week_start_balance, plan_start_date, plan_term_months, last_topped_up_at)
  values (p_user_id, least(v_bonus, v_cap), least(v_bonus, v_cap), now(), p_term_months, now())
  on conflict (user_id) do update
    set balance            = least(v_bonus, v_cap),
        week_start_balance = least(v_bonus, v_cap),
        plan_start_date    = now(),
        plan_term_months   = excluded.plan_term_months,
        last_topped_up_at  = now(),
        updated_at         = now();

  select balance into v_new_balance from public.user_credits where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
  values (p_user_id, v_bonus, 'bonus', 'plan_activation', 'Plan activation bonus', v_new_balance);
end;
$$;

-- Re-create weekly_credit_top_up to also reset week_start_balance
create or replace function public.weekly_credit_top_up()
returns void language plpgsql security definer as $$
declare
  rec record;
  v_add     integer := 100;
  v_cap     integer := 300;
  v_new_bal integer;
begin
  for rec in
    select uc.user_id, uc.balance
    from public.user_credits uc
    join public.profiles p on p.id = uc.user_id
    where p.tier = 'essential'
      and (uc.last_topped_up_at is null or uc.last_topped_up_at <= now() - interval '7 days')
  loop
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
