-- supabase/migrations/20260826_tracks_youtube_id.sql
-- Épingler la vidéo YouTube d'un titre.
--
-- Le jeu cherche sa source audio avec `ytsearch5` et retient un résultat selon
-- une heuristique — chaîne « - Topic » sinon le premier — qui sert parfois une
-- reprise, un live ou une version tronquée à la place du morceau attendu.
-- Aucune colonne ne permettait de corriger ce choix : `external_id` porte
-- l'identifiant Deezer et `refreshExpiredPreviews` s'en sert pour rafraîchir les
-- extraits, il n'est donc pas détournable.
--
-- Additive et nullable : tant que la colonne est vide, le comportement actuel
-- est inchangé pour les titres du catalogue. `core.js` ne consultera YouTube que
-- si elle est nulle.

alter table public.tracks
  add column if not exists youtube_id text;

comment on column public.tracks.youtube_id is
  'Identifiant de vidéo YouTube épinglé manuellement. Quand il est renseigné, le jeu l''utilise directement au lieu de chercher via ytsearch.';
