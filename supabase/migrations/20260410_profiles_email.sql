-- Add email column to profiles, synced from auth.users.
-- The deadline notifier and guardian notifications read profiles.email to send reminders.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill from auth.users for any existing rows.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;
