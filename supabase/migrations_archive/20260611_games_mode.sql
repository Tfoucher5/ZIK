-- Mode de jeu par partie (classic | qcm) pour séparer les statistiques
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'classic';

-- Backfill : les parties jouées dans des rooms persistantes en mode QCM
UPDATE public.games g
SET mode = 'qcm'
FROM public.rooms r
WHERE r.code = g.room_id AND r.game_mode = 'qcm';
