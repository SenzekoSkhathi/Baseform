-- Align profiles.financial_need constraint with app payloads.
-- Allowed values: 'yes', 'no', or NULL.
-- Safe to run multiple times.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS financial_need text;

-- Normalize legacy values before enforcing constraint.
UPDATE public.profiles
SET financial_need = CASE
  WHEN lower(trim(financial_need)) IN ('true', '1', 'yes') THEN 'yes'
  WHEN lower(trim(financial_need)) IN ('false', '0', 'no') THEN 'no'
  WHEN trim(financial_need) = '' THEN NULL
  ELSE financial_need
END;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_financial_need_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_financial_need_check
  CHECK (financial_need IS NULL OR financial_need IN ('yes', 'no'));
