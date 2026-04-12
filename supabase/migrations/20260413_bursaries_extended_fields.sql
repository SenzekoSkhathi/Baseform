-- Add richer bursary source fields so imported SA Bursaries records can keep
-- the article page, application links, and extracted eligibility details.

ALTER TABLE public.bursaries
  ADD COLUMN IF NOT EXISTS detail_page_url text,
  ADD COLUMN IF NOT EXISTS application_links text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS funding_value text,
  ADD COLUMN IF NOT EXISTS eligibility_requirements text,
  ADD COLUMN IF NOT EXISTS application_instructions text,
  ADD COLUMN IF NOT EXISTS source_category text,
  ADD COLUMN IF NOT EXISTS last_scraped_at timestamptz;
