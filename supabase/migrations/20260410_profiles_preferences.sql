-- Persist user notification and product preferences on profiles.
-- Safe to run multiple times.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{"deadlineAlerts": true, "statusUpdates": true, "weeklySummary": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"deadline_alerts": true, "status_updates": true, "weekly_summary": false}'::jsonb;

UPDATE public.profiles
SET preferences = '{"deadlineAlerts": true, "statusUpdates": true, "weeklySummary": false}'::jsonb
WHERE preferences IS NULL;

UPDATE public.profiles
SET notification_prefs = jsonb_build_object(
  'deadline_alerts', COALESCE((preferences->>'deadlineAlerts')::boolean, true),
  'status_updates', COALESCE((preferences->>'statusUpdates')::boolean, true),
  'weekly_summary', COALESCE((preferences->>'weeklySummary')::boolean, false)
)
WHERE notification_prefs IS NULL
   OR notification_prefs = '{"deadline_alerts": true, "status_updates": true, "weekly_summary": false}'::jsonb;