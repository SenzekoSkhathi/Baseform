-- Application roadmap: per-application checklist and activity log.

-- checklist: jsonb array of ticked item IDs, e.g. ["id_doc", "matric", "fee"]
alter table public.applications
  add column if not exists checklist jsonb not null default '[]'::jsonb;

-- Activity log: user-written timestamped entries per application
create table if not exists public.applications_activity (
  id uuid primary key default gen_random_uuid(),
  application_id bigint not null references public.applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists applications_activity_application_id_idx
  on public.applications_activity (application_id, created_at desc);

create index if not exists applications_activity_user_id_idx
  on public.applications_activity (user_id);

alter table public.applications_activity enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'applications_activity'
      and policyname = 'applications_activity_own'
  ) then
    create policy "applications_activity_own"
      on public.applications_activity
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
