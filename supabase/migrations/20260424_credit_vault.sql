-- Credit vault: admin-only record of Base Credits purchased (via token top-ups).
-- The vault shrinks automatically as users consume credits (credit_transactions.type = 'usage'),
-- since that is when a backing token is actually burned against the AI provider.

create table if not exists public.credit_vault_deposits (
  id uuid primary key default gen_random_uuid(),
  credits_added integer not null check (credits_added > 0),
  tokens_purchased bigint,
  zar_cost numeric(12, 2),
  zar_per_1k_tokens numeric(10, 4),
  avg_tokens_per_credit integer,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists credit_vault_deposits_created_at_idx
  on public.credit_vault_deposits (created_at desc);

alter table public.credit_vault_deposits enable row level security;

-- No select/insert policies: only the service role (admin API) may touch this table.

create or replace function public.get_credit_vault_balance()
returns table (
  total_deposited bigint,
  total_used      bigint,
  remaining       bigint
) language sql security definer as $$
  select
    coalesce((select sum(credits_added)::bigint from public.credit_vault_deposits), 0) as total_deposited,
    coalesce((select sum(-amount)::bigint from public.credit_transactions where type = 'usage'), 0) as total_used,
    coalesce((select sum(credits_added)::bigint from public.credit_vault_deposits), 0)
      - coalesce((select sum(-amount)::bigint from public.credit_transactions where type = 'usage'), 0) as remaining;
$$;
