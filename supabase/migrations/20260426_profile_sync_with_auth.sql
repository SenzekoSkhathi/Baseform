-- Authoritative profile <-> auth.users sync.
--
-- Why: incomplete profiles were appearing in the admin console — rows existed
-- in public.profiles with only full_name set, missing email and onboarding
-- fields. Root cause: profile rows were sometimes created (by ambient triggers
-- or partial flows) without copying email from auth.users, and users could
-- abandon onboarding, leaving the row blank.
--
-- This migration:
--   1. Creates a definitive trigger that, on every auth.users insert,
--      upserts a public.profiles row with id, email, full_name (from metadata),
--      and tier='free' if not already present.
--   2. On auth.users email update, mirrors the new email into public.profiles.
--   3. Backfills any existing profile rows whose email is null/empty from
--      auth.users.email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, tier)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      ''
    ),
    'free'
  )
  on conflict (id) do update
    set email = coalesce(nullif(new.email, ''), public.profiles.email),
        full_name = coalesce(
          nullif(public.profiles.full_name, ''),
          nullif(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.raw_user_meta_data->>'name', ''),
          public.profiles.full_name
        );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();

-- One-time backfill: copy email from auth.users to any profile that is missing it.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '')
  and u.email is not null
  and u.email <> '';

-- Backfill missing full_name from auth metadata where possible.
update public.profiles p
set full_name = coalesce(
  nullif(u.raw_user_meta_data->>'full_name', ''),
  nullif(u.raw_user_meta_data->>'name', '')
)
from auth.users u
where p.id = u.id
  and (p.full_name is null or p.full_name = '')
  and (
    nullif(u.raw_user_meta_data->>'full_name', '') is not null
    or nullif(u.raw_user_meta_data->>'name', '') is not null
  );
