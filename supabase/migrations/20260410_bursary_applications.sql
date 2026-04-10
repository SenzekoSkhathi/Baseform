-- Bursary applications tracker
-- Replaces localStorage-based tracking with a persistent DB table.

create table if not exists public.bursary_applications (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references auth.users(id) on delete cascade,
  bursary_id  text not null,          -- matches the bursary.id from the bursaries table
  bursary_name text not null,         -- denormalised for display without a join
  status      text not null check (status in ('saved', 'applied')),
  updated_at  timestamptz not null default now(),

  unique (student_id, bursary_id)
);

-- Row-level security: students can only see and modify their own rows
alter table public.bursary_applications enable row level security;

create policy "students can read own bursary applications"
  on public.bursary_applications for select
  using (auth.uid() = student_id);

create policy "students can insert own bursary applications"
  on public.bursary_applications for insert
  with check (auth.uid() = student_id);

create policy "students can update own bursary applications"
  on public.bursary_applications for update
  using (auth.uid() = student_id);

create policy "students can delete own bursary applications"
  on public.bursary_applications for delete
  using (auth.uid() = student_id);
