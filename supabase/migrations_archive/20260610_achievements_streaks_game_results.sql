-- Succès, séries de jeu (streaks) et résultats partageables
-- À appliquer sur le projet Supabase ZIK (additive : ne modifie aucune donnée existante)

-- 1. Streaks sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_played_date date,
  ADD COLUMN IF NOT EXISTS win_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_win_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_achievements text[] NOT NULL DEFAULT '{}';

-- 2. Définitions des succès
CREATE TABLE IF NOT EXISTS public.achievements (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL,
  icon        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('one_time','tiered')),
  tiers       jsonb DEFAULT NULL,
  rarity      text NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  category    text NOT NULL CHECK (category IN ('streak','wins','score','social'))
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS achievements_select ON public.achievements;
CREATE POLICY achievements_select ON public.achievements FOR SELECT USING (true);

-- 3. Succès débloqués par utilisateur
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  tier           text DEFAULT NULL,
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id, tier)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_achievements_select ON public.user_achievements;
CREATE POLICY user_achievements_select ON public.user_achievements FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = user_id AND pr.is_private = false)
);
-- Pas de policy INSERT/UPDATE : écritures uniquement via service role (game.js)

-- 4. Résultats partageables
CREATE TABLE IF NOT EXISTS public.game_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  username        text NOT NULL,
  score           int NOT NULL,
  rank            int NOT NULL,
  total_players   int NOT NULL,
  room_name       text NOT NULL,
  room_emoji      text DEFAULT NULL,
  achievement_ids text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS game_results_select ON public.game_results;
CREATE POLICY game_results_select ON public.game_results FOR SELECT USING (true);

-- 5. Seed des succès
INSERT INTO public.achievements (id, name, description, icon, type, tiers, rarity, category) VALUES
  ('first_win',     'Première victoire', 'Gagne ta première partie multijoueur', '🏆', 'one_time', NULL, 'common', 'wins'),
  ('wins_count',    'Gagnant',           'Gagne des parties', '👑', 'tiered', '[{"level":"bronze","target":5,"rarity":"common"},{"level":"silver","target":25,"rarity":"rare"},{"level":"gold","target":100,"rarity":"epic"}]', 'common', 'wins'),
  ('podium_count',  'Sur le podium',     'Termine sur le podium', '🥉', 'tiered', '[{"level":"bronze","target":10,"rarity":"common"},{"level":"silver","target":50,"rarity":"rare"},{"level":"gold","target":200,"rarity":"epic"}]', 'common', 'wins'),
  ('streak_days',   'Assidu',            'Joue plusieurs jours d''affilée', '🔥', 'tiered', '[{"level":"bronze","target":3,"rarity":"rare"},{"level":"silver","target":7,"rarity":"epic"},{"level":"gold","target":30,"rarity":"legendary"}]', 'rare', 'streak'),
  ('win_streak',    'En feu',            'Enchaîne les victoires d''affilée', '⚡', 'tiered', '[{"level":"bronze","target":3,"rarity":"rare"},{"level":"silver","target":5,"rarity":"epic"},{"level":"gold","target":10,"rarity":"legendary"}]', 'rare', 'streak'),
  ('big_game',      'Machine à points',  'Marque 40 points dans une seule partie', '💯', 'one_time', NULL, 'rare', 'score'),
  ('perfect_game',  'Sans faute',        'Trouve artiste et titre sur toutes les manches d''une partie (5 manches minimum)', '🎯', 'one_time', NULL, 'rare', 'score'),
  ('score_total',   'Collectionneur',    'Cumule des points au total', '💰', 'tiered', '[{"level":"bronze","target":500,"rarity":"common"},{"level":"silver","target":2500,"rarity":"rare"},{"level":"gold","target":10000,"rarity":"epic"}]', 'common', 'score'),
  ('games_played',  'Vétéran',           'Joue des parties', '🎮', 'tiered', '[{"level":"bronze","target":10,"rarity":"common"},{"level":"silver","target":50,"rarity":"rare"},{"level":"gold","target":200,"rarity":"epic"}]', 'common', 'social'),
  ('early_adopter', 'Early Adopter',     'Compte créé avant le 1er juin 2026 — merci les précurseurs !', '🌟', 'one_time', NULL, 'legendary', 'social')
ON CONFLICT (id) DO NOTHING;

-- 6. RPC streaks (atomique, fuseau Europe/Paris)
CREATE OR REPLACE FUNCTION public.update_player_streaks(p_user_id uuid, p_won boolean)
RETURNS TABLE(current_streak int, best_streak int, win_streak int, best_win_streak int)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $function$
#variable_conflict use_column
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  prev_date date;
  prev_cur int;
  prev_win int;
  new_cur int;
  new_win int;
BEGIN
  SELECT p.last_played_date, p.current_streak, p.win_streak
    INTO prev_date, prev_cur, prev_win
    FROM public.profiles p WHERE p.id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF prev_date = today THEN
    new_cur := GREATEST(prev_cur, 1);
  ELSIF prev_date = today - 1 THEN
    new_cur := prev_cur + 1;
  ELSE
    new_cur := 1;
  END IF;

  IF p_won THEN new_win := prev_win + 1; ELSE new_win := 0; END IF;

  UPDATE public.profiles SET
    current_streak   = new_cur,
    best_streak      = GREATEST(profiles.best_streak, new_cur),
    win_streak       = new_win,
    best_win_streak  = GREATEST(profiles.best_win_streak, new_win),
    last_played_date = today
  WHERE id = p_user_id;

  RETURN QUERY
    SELECT p.current_streak, p.best_streak, p.win_streak, p.best_win_streak
    FROM public.profiles p WHERE p.id = p_user_id;
END;
$function$;
