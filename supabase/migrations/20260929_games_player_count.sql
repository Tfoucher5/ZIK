-- Parties du mode salon (source = 'salon').
-- Elles n'ont pas de lignes game_players (invités sans compte, hors
-- classements) : player_count est la seule trace de leur taille.
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS player_count integer;

-- games.source est renseigné par le site ('web') et le bot ('discord'). Si une
-- contrainte limite ses valeurs, on la remplace pour accepter 'salon'.
DO $$
DECLARE
  c record;
  found boolean := false;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.games'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE public.games DROP CONSTRAINT %I', c.conname);
    found := true;
  END LOOP;
  IF found THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_source_check CHECK (source IN ('web', 'discord', 'salon'));
  END IF;
END $$;
