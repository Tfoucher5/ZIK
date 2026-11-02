-- Mode salon : vidéo YouTube trouvée automatiquement pour un titre, gardée en
-- mémoire. Le 30/10, la recherche YouTube ne répondait plus et les parties
-- s'arrêtaient : un titre déjà joué n'a plus besoin d'être recherché.
-- youtube_id / youtube_start restent le choix de l'admin et passent avant.
-- Colonnes nullables sans défaut : ajout instantané, sans réécrire la table.

alter table public.tracks add column if not exists video_cache_id text;
alter table public.tracks add column if not exists video_cache_duration integer;
alter table public.tracks add column if not exists video_cache_at timestamptz;
