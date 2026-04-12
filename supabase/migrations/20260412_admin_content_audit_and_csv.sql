-- Admin content audit trail plus CSV/import support for plans and site settings.

CREATE TABLE IF NOT EXISTS public.admin_content_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_key text NOT NULL,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  admin_user_id uuid NOT NULL,
  admin_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_content_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_content_audit_log_created_at_idx
  ON public.admin_content_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_content_audit_log_entity_type_idx
  ON public.admin_content_audit_log (entity_type, entity_key);

-- Guardrails for critical homepage settings. These stay editable but are protected from accidental deletion.

INSERT INTO public.admin_site_settings (key, value, description)
VALUES
  ('home_subtitle', to_jsonb('Baseform helps you calculate APS, find matching universities and bursaries, and manage your whole application journey in one powerful dashboard.'::text), 'Homepage hero subtitle'),
  ('home_features', to_jsonb(ARRAY[
    'Instant APS score calculator',
    'Match to unis and bursaries you qualify for',
    'Track every application in one timeline',
    'Deadline reminders before it is too late'
  ]::text[]), 'Homepage feature bullet list'),
  ('home_stats', to_jsonb(ARRAY[
    jsonb_build_object('value','26+','label','Universities','icon','graduation-cap','color','text-orange-500'),
    jsonb_build_object('value','R2M+','label','Bursaries tracked','icon','trophy','color','text-amber-500'),
    jsonb_build_object('value','24/7','label','Planning support','icon','clock','color','text-emerald-500')
  ]), 'Homepage stats cards')
ON CONFLICT (key) DO NOTHING;
