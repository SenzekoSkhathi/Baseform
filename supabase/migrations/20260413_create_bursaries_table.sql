-- Create bursaries table and enable RLS for admin-managed bursary content.
-- This table tracks bursary opportunities that admins can manage and students can discover.

CREATE TABLE IF NOT EXISTS public.bursaries (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sponsor text,
  description text,
  minimum_aps numeric DEFAULT 0,
  amount_min numeric,
  amount_max numeric,
  closing_date date,
  website text,
  provinces_eligible text[] DEFAULT '{}',
  fields_of_study text[] DEFAULT '{}',
  requires_financial_need boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bursaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read bursaries" ON public.bursaries;
CREATE POLICY "Public can read bursaries"
  ON public.bursaries FOR SELECT
  USING (true);

-- Only admins can insert/update/delete bursaries via the admin API with requireAdminGuard()
