-- supabase/migrations/20261011_notif_updates.sql
-- Nouvelle catégorie de notifications sur l'appareil : « updates » (nouvelle
-- version de ZIK). Activée par défaut, comme amis, cartes et défi.

alter table public.profiles
  alter column notif_prefs
  set default '{"social": true, "cards": true, "challenge": true, "zikle": false, "updates": true}'::jsonb;

update public.profiles
  set notif_prefs = notif_prefs || '{"updates": true}'::jsonb
  where not (notif_prefs ? 'updates');
