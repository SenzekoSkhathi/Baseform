-- Audit log for every PayFast ITN that hits /api/payments/payfast/notify.
-- If a payment shows up in PayFast but no row appears here, the webhook never
-- reached the server (bad notify_url, network issue, or PayFast didn't try).
-- If a row appears with outcome='rejected', the `reason` column shows why.

create table if not exists public.payfast_itn_log (
  id uuid primary key default gen_random_uuid(),
  pf_payment_id text,
  m_payment_id text,
  payment_status text,
  amount_gross numeric(10,2),
  custom_str1 text,
  custom_str2 text,
  custom_str3 text,
  outcome text not null check (outcome in ('accepted', 'rejected')),
  reason text,
  source_ip text,
  raw_payload jsonb,
  received_at timestamptz not null default now()
);

create index if not exists payfast_itn_log_received_at_idx
  on public.payfast_itn_log (received_at desc);

create index if not exists payfast_itn_log_pf_payment_id_idx
  on public.payfast_itn_log (pf_payment_id);

alter table public.payfast_itn_log enable row level security;
-- No policies: only the service role (admin/server) reads or writes.
