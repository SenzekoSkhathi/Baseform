-- Add 'admin' tier to the profiles table tier constraint.
-- This enables admin users to be assigned the 'admin' tier in the database.
-- Safe to run multiple times.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('free', 'essential', 'pro', 'ultra', 'admin', 'disabled'));
