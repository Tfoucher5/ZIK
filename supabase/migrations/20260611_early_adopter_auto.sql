-- early_adopter automatique : compte créé avant le 1er juin 2026 (heure de Paris)

UPDATE public.achievements
SET description = 'Compte créé avant le 1er juin 2026 — merci les précurseurs !'
WHERE id = 'early_adopter';

-- Unicité aussi pour les succès one_time (tier NULL) :
-- l'UNIQUE classique traite les NULL comme distincts, NULLS NOT DISTINCT corrige ça.
ALTER TABLE public.user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_user_id_achievement_id_tier_key;
ALTER TABLE public.user_achievements
  ADD CONSTRAINT user_achievements_user_id_achievement_id_tier_key
  UNIQUE NULLS NOT DISTINCT (user_id, achievement_id, tier);

-- Backfill : tous les comptes précurseurs existants reçoivent le succès immédiatement
INSERT INTO public.user_achievements (user_id, achievement_id)
SELECT id, 'early_adopter'
FROM public.profiles
WHERE created_at < '2026-06-01T00:00:00+02:00'
ON CONFLICT DO NOTHING;
