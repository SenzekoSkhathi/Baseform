-- Preserve referral credits across monthly refills.
--
-- Previous logic reset every free user's balance to 20 on the 1st, which would
-- wipe any credits a user had earned through Invite a Friend. New rule:
--
--   balance >= 20  → leave alone (don't reduce earned credits)
--   balance <  20  → top up to 20
--
-- Net effect: the monthly grant doesn't roll over (a user who finished their
-- 20 still gets exactly 20 next month — no accumulation), but referral credits
-- they've earned and not yet spent are never touched.

create or replace function public.monthly_credit_top_up()
returns void language plpgsql security definer as $$
declare
  rec        record;
  v_grant    integer := 20;
  v_new_bal  integer;
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
    v_new_bal := greatest(rec.balance, v_grant);
    v_delta   := v_new_bal - rec.balance;

    update public.user_credits
    set balance               = v_new_bal,
        week_start_balance    = 0,
        last_monthly_top_up_at = now(),
        updated_at            = now()
    where user_id = rec.user_id;

    -- Always log the cron tick so we can audit who was processed each month,
    -- even when delta is 0 (user had referral credits above the floor).
    insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
    values (
      rec.user_id,
      v_delta,
      'top_up',
      'monthly_top_up',
      case when v_delta > 0
        then 'Monthly free credits refill'
        else 'Monthly refill skipped — balance already above 20 (referral credits preserved)'
      end,
      v_new_bal
    );
  end loop;
end;
$$;

-- Apply the same floor semantics to the on-demand provisioner so brand-new
-- signups with an existing referral balance aren't clobbered either.
create or replace function public.ensure_free_user_credits(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_existing integer;
begin
  insert into public.user_credits (
    user_id, balance, week_start_balance, weekly_allowance,
    plan_start_date, plan_term_months, last_topped_up_at, last_monthly_top_up_at
  )
  values (p_user_id, 20, 0, 0, now(), 3, null, now())
  on conflict (user_id) do update
    set balance               = greatest(public.user_credits.balance, 20),
        last_monthly_top_up_at = coalesce(public.user_credits.last_monthly_top_up_at, now())
    where public.user_credits.balance < 20
       or public.user_credits.last_monthly_top_up_at is null;

  if (select 1 from public.credit_transactions
      where user_id = p_user_id and action = 'free_monthly_grant' limit 1) is null then
    select balance into v_existing from public.user_credits where user_id = p_user_id;
    insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
    values (p_user_id, 20, 'bonus', 'free_monthly_grant', 'Free plan monthly credits', v_existing);
  end if;
end;
$$;
