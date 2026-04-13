create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_slug text not null,
  amount_zar numeric(10,2) not null,
  status text not null,
  term_months integer,
  term_label text,
  payfast_m_payment_id text,
  payfast_payment_id text,
  payfast_payment_status text,
  payfast_amount_gross numeric(10,2),
  payfast_signature text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_user_id_created_at_idx
  on public.billing_events (user_id, created_at desc);

create unique index if not exists billing_events_payfast_payment_id_uidx
  on public.billing_events (payfast_payment_id)
  where payfast_payment_id is not null;

alter table public.billing_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'billing_events'
      and policyname = 'billing_events_select_own'
  ) then
    create policy "billing_events_select_own"
      on public.billing_events
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;
