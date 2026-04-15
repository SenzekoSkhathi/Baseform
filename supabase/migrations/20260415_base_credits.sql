-- Base Credits system
-- user_credits: tracks each essential-plan user's credit balance and top-up schedule
-- credit_transactions: immutable audit log of every credit movement

create table if not exists public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  plan_start_date timestamptz not null default now(),
  plan_term_months integer not null check (plan_term_months in (3, 6, 9)),
  last_topped_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_credits_user_id_key unique (user_id)
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('bonus', 'top_up', 'usage')),
  action text,
  description text,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_created_at_idx
  on public.credit_transactions (user_id, created_at desc);

-- RLS

alter table public.user_credits enable row level security;
alter table public.credit_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_credits' and policyname = 'user_credits_select_own'
  ) then
    create policy "user_credits_select_own"
      on public.user_credits for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_transactions' and policyname = 'credit_transactions_select_own'
  ) then
    create policy "credit_transactions_select_own"
      on public.credit_transactions for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

-- updated_at trigger

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_credits_set_updated_at on public.user_credits;
create trigger user_credits_set_updated_at
  before update on public.user_credits
  for each row execute function public.set_updated_at();

-- initialize_user_credits: called when a payment completes.
-- Creates the credits row (or resets it on re-purchase) and grants the 100 bonus.
-- Cap is enforced at 300 on every credit grant.

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
  insert into public.user_credits (user_id, balance, plan_start_date, plan_term_months, last_topped_up_at)
  values (p_user_id, least(v_bonus, v_cap), now(), p_term_months, now())
  on conflict (user_id) do update
    set balance          = least(v_bonus, v_cap),
        plan_start_date  = now(),
        plan_term_months = excluded.plan_term_months,
        last_topped_up_at = now(),
        updated_at       = now();

  select balance into v_new_balance from public.user_credits where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
  values (p_user_id, v_bonus, 'bonus', 'plan_activation', 'Plan activation bonus', v_new_balance);
end;
$$;

-- weekly_credit_top_up: adds 100 credits to every user whose last top-up was
-- 7+ days ago, capping the balance at 300.

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
    set balance          = v_new_bal,
        last_topped_up_at = now(),
        updated_at       = now()
    where user_id = rec.user_id;

    insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
    values (rec.user_id, v_new_bal - rec.balance, 'top_up', 'weekly_top_up', 'Weekly credit top-up', v_new_bal);
  end loop;
end;
$$;

-- deduct_credits: atomically deducts credits and logs the transaction.
-- Returns false if the user has insufficient credits or no credits row.

create or replace function public.deduct_credits(
  p_user_id  uuid,
  p_amount   integer,
  p_action   text,
  p_description text default null
)
returns boolean language plpgsql security definer as $$
declare
  v_current_balance integer;
  v_new_balance     integer;
begin
  select balance into v_current_balance
  from public.user_credits
  where user_id = p_user_id
  for update;

  if not found or v_current_balance < p_amount then
    return false;
  end if;

  v_new_balance := v_current_balance - p_amount;

  update public.user_credits
  set balance    = v_new_balance,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, type, action, description, balance_after)
  values (p_user_id, -p_amount, 'usage', p_action, p_description, v_new_balance);

  return true;
end;
$$;

-- To schedule the weekly top-up, enable pg_cron in Supabase Dashboard → Database → Extensions,
-- then run this once in the SQL editor:
--
--   select cron.schedule(
--     'weekly-credit-top-up',
--     '0 0 * * 1',
--     $$select public.weekly_credit_top_up();$$
--   );
