-- Stores Web Push subscriptions per user.
-- One row per browser/device. Multiple subscriptions per user are allowed
-- (user may use the app on phone + desktop).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'push_subscriptions_select_own'
  ) then
    create policy "push_subscriptions_select_own"
      on public.push_subscriptions for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;
