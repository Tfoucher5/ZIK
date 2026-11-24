-- Identifiant Deezer sûr de chaque titre, pour l'extrait joué en soirée.
-- deezer_checked_at : recherche déjà faite (trouvé ou non), pour ne pas la
-- refaire à chaque passage du remplissage.
-- Pour défaire : drop index catalog.tracks_deezer_unchecked_idx;
--   alter table catalog.tracks drop column deezer_id, drop column deezer_checked_at;
alter table catalog.tracks
  add column if not exists deezer_id text,
  add column if not exists deezer_checked_at timestamptz;

-- Un external_id numérique est déjà traité comme un id Deezer par le jeu
update catalog.tracks
   set deezer_id = external_id,
       deezer_checked_at = now()
 where external_id ~ '^\d+$'
   and deezer_id is null;

create index if not exists tracks_deezer_unchecked_idx
  on catalog.tracks (created_at)
  where deezer_id is null and deezer_checked_at is null;
