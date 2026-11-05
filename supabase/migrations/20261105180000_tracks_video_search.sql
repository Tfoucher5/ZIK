-- Date de la dernière recherche de vidéo d'un titre, par la tâche de fond qui
-- résout les vidéos hors partie (plan, phase 3 : aucun appel YouTube pendant une
-- partie). Un titre sans résultat n'est pas recherché en boucle.
-- Pour défaire : drop index public.tracks_video_todo_idx;
--                alter table public.tracks drop column video_search_at;

alter table public.tracks
  add column if not exists video_search_at timestamp with time zone;

create index if not exists tracks_video_todo_idx
  on public.tracks (video_search_at nulls first, created_at desc)
  where youtube_id is null and video_cache_id is null;
