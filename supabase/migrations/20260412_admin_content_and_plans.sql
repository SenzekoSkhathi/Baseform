-- Admin-managed plans and editable frontend content settings.

CREATE TABLE IF NOT EXISTS public.admin_pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price text NOT NULL,
  period text NOT NULL DEFAULT '/month',
  tagline text NOT NULL DEFAULT '',
  features text[] NOT NULL DEFAULT '{}',
  available boolean NOT NULL DEFAULT true,
  recommended boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL,
  occurred_on date NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  current_value numeric NOT NULL,
  threshold_value numeric NOT NULL,
  unit text NOT NULL,
  range_label text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_key, occurred_on)
);

ALTER TABLE public.admin_pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alert_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read pricing plans" ON public.admin_pricing_plans;
CREATE POLICY "Public can read pricing plans"
  ON public.admin_pricing_plans FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read site settings" ON public.admin_site_settings;
CREATE POLICY "Public can read site settings"
  ON public.admin_site_settings FOR SELECT
  USING (true);

-- Alert history is admin-only and accessed with the service role in server routes.

INSERT INTO public.admin_pricing_plans (slug, name, price, period, tagline, features, available, recommended, sort_order)
VALUES
  ('free', 'Free', 'R0', '/month', 'Get started', ARRAY[
    'APS score calculator',
    'See matched universities',
    'Track up to 3 applications'
  ], true, false, 0),
  ('essential', 'Essential', 'R59', '/month', 'Most popular', ARRAY[
    'Everything in Free',
    'Unlimited application tracking',
    'Bursary matching and discovery',
    'Document vault (upload and store)',
    'AI Coach guidance',
    'Deadline reminders'
  ], true, true, 1),
  ('pro', 'Pro', 'R129', '/month', 'Coming soon', ARRAY[
    'Everything in Essential',
    'Auto-fill application forms',
    'Email status monitoring',
    'Priority support'
  ], false, false, 2),
  ('ultra', 'Ultra', 'R249', '/month', 'Coming soon', ARRAY[
    'Everything in Pro',
    'WhatsApp guidance bot',
    'Personal application advisor',
    'Application review and feedback'
  ], false, false, 3)
ON CONFLICT (slug) DO NOTHING;

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
  ]), 'Homepage stats cards'),
  ('admin_alert_thresholds', jsonb_build_object(
    'tokenCostSpikeZarPerDay', 150,
    'storageGrowthBytesPerDay', 157286400,
    'failedEmailScanRatePercent', 20,
    'failedEmailScanMinVolume', 20,
    'aiCostPer1kTokensZar', 0.08
  ), 'Admin operational alert thresholds')
ON CONFLICT (key) DO NOTHING;
