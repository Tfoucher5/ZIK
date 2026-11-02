-- Réglages du site (mode maintenance, etc.)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_select ON public.site_settings;
CREATE POLICY site_settings_select ON public.site_settings FOR SELECT USING (true);
-- Pas de policy d'écriture : modifications uniquement via service role (interface admin)

INSERT INTO public.site_settings (key, value)
VALUES ('maintenance', '{"enabled": false, "message": ""}')
ON CONFLICT (key) DO NOTHING;
