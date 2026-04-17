-- Grade 11 Pro recurring subscription support (PayFast subscription_type=1)
-- Adds subscription tracking columns to profiles. Subscription auto-stops
-- at end of November each year (Grade 11 academic year end).

alter table profiles
  add column if not exists subscription_token text,
  add column if not exists subscription_status text
    check (subscription_status in ('active', 'cancelled', 'completed', 'past_due')),
  add column if not exists plan_expires_at timestamptz,
  add column if not exists subscription_cycles_total integer,
  add column if not exists subscription_cycles_remaining integer,
  add column if not exists next_billing_date date;

-- Fast lookup by token (used by ITN webhook to identify recurring payments)
create index if not exists profiles_subscription_token_idx
  on profiles (subscription_token)
  where subscription_token is not null;

-- Fast lookup of expiring subscriptions (for access guards / reminder emails)
create index if not exists profiles_plan_expires_at_idx
  on profiles (plan_expires_at)
  where plan_expires_at is not null;

comment on column profiles.subscription_token is 'PayFast recurring auth token — one per active subscription.';
comment on column profiles.subscription_status is 'active | cancelled | completed | past_due. Cancelled users keep access until plan_expires_at.';
comment on column profiles.plan_expires_at is 'When paid access ends. Extended by ~31 days on each successful ITN.';
comment on column profiles.subscription_cycles_total is 'Total billing cycles at signup (e.g. 10 for Feb->Nov).';
comment on column profiles.subscription_cycles_remaining is 'Cycles left; decremented on each successful ITN. 0 => completed.';
comment on column profiles.next_billing_date is 'Next scheduled PayFast charge date (for UI display).';
