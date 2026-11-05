-- Dernière vidéo refusée par une TV (intégration interdite, vidéo retirée) : la
-- tâche de fond ne la propose plus pour ce titre (plan, phase 3).
-- Pour défaire : alter table public.tracks drop column video_refused_id;

alter table public.tracks
  add column if not exists video_refused_id text;
