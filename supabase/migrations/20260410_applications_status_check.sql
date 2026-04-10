-- Align applications.status values with the statuses used by the app.
-- This fixes inserts that use status = 'planning'.

-- Ensure status has a sensible default for new rows.
ALTER TABLE public.applications
  ALTER COLUMN status SET DEFAULT 'planning';

-- Normalize legacy status values before enforcing the new check.
UPDATE public.applications
SET status = CASE lower(trim(status))
  WHEN 'saved' THEN 'planning'
  WHEN 'applied' THEN 'submitted'
  WHEN 'inprogress' THEN 'in_progress'
  WHEN 'in-progress' THEN 'in_progress'
  WHEN 'not_started' THEN 'planning'
  ELSE lower(trim(status))
END;

UPDATE public.applications
SET status = 'planning'
WHERE status IS NULL
   OR status NOT IN ('planning', 'in_progress', 'submitted', 'accepted', 'rejected', 'waitlisted');

-- Drop any existing status-only check constraints to avoid conflicts.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = rel.oid
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'applications'
      AND con.contype = 'c'
      AND att.attname = 'status'
      AND att.attnum = ANY (con.conkey)
      AND cardinality(con.conkey) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS %I', rec.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('planning', 'in_progress', 'submitted', 'accepted', 'rejected', 'waitlisted'));