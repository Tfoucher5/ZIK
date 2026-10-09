-- supabase/migrations/20261009b_admin_pilotage.sql
-- Nouvelle admin : file des titres à réparer, départ des vidéos de salon,
-- suivi des hôtes de salon et notifications à tous les joueurs.

-- 1. Moment de départ choisi à la main pour la vidéo épinglée (en secondes).
alter table public.tracks
  add column if not exists youtube_start integer
    check (youtube_start is null or youtube_start >= 0);

-- 2. Salons : qui reçoit, et combien de joueurs la limite gratuite a refusés.
alter table public.games
  add column if not exists host_id uuid references auth.users (id) on delete set null,
  add column if not exists limit_hits integer not null default 0;

create index if not exists games_host_idx on public.games (host_id)
  where host_id is not null;

-- 3. Titres à réparer. Une seule ligne ouverte par titre et par type de
-- problème : un nouveau signalement incrémente le compteur.
create table if not exists public.track_issues (
  id bigint generated always as identity primary key,
  track_id uuid not null references public.tracks (id) on delete cascade,
  kind text not null check (kind in ('video', 'audio', 'answer')),
  source text not null check (source in ('auto', 'host', 'player')),
  note text,
  context jsonb not null default '{}'::jsonb,
  count integer not null default 1,
  status text not null default 'open'
    check (status in ('open', 'fixed', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists track_issues_open_idx
  on public.track_issues (track_id, kind) where status = 'open';

alter table public.track_issues enable row level security;
-- Aucune policy : seul le service role (serveur) y accède.

create or replace function public.report_track_issue(
  p_track uuid,
  p_kind text,
  p_source text,
  p_note text default null,
  p_context jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into track_issues (track_id, kind, source, note, context)
  values (p_track, p_kind, p_source, p_note, coalesce(p_context, '{}'::jsonb))
  on conflict (track_id, kind) where status = 'open'
  do update set
    count = track_issues.count + 1,
    updated_at = now(),
    -- Un signalement humain prime sur une détection automatique
    source = case when excluded.source = 'auto' then track_issues.source else excluded.source end,
    note = coalesce(excluded.note, track_issues.note),
    context = track_issues.context || excluded.context;
$$;

revoke all on function public.report_track_issue(uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.report_track_issue(uuid, text, text, text, jsonb)
  to service_role;

-- Reprise des signalements de joueurs encore ouverts qui désignent un titre.
insert into public.track_issues (track_id, kind, source, note, context, created_at)
select distinct on (t.track_id, kind)
  t.track_id,
  kind,
  'player',
  nullif(r.message, ''),
  jsonb_build_object('report_id', r.id, 'room', r.room_id),
  r.created_at
from public.reports r
cross join lateral (
  select case r.subject
    when 'mauvaise-reponse' then 'answer'
    else 'audio'
  end as kind
) k
cross join lateral (
  select (elem ->> 'trackId')::uuid as track_id
  from jsonb_array_elements(coalesce(r.metadata -> 'tracks', '[]'::jsonb)) elem
  where elem ->> 'trackId' ~* '^[0-9a-f-]{36}$'
) t
where r.type = 'bug'
  and r.subject in ('audio', 'mauvaise-reponse')
  and r.status = 'pending'
  and exists (select 1 from public.tracks tr where tr.id = t.track_id)
order by t.track_id, kind, r.created_at desc
on conflict do nothing;

-- 4. Notifications envoyées par l'admin à tout le monde, et nouveautés.
alter table public.notifications alter column actor_id drop not null;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accept', 'room_invite', 'announcement', 'news'));

create or replace function public.admin_broadcast_notification(p_type text, p_payload jsonb)
returns integer
language sql
security definer
set search_path = public
as $$
  with ins as (
    insert into notifications (user_id, type, payload)
    select id, p_type, p_payload from profiles
    returning 1
  )
  select count(*)::int from ins;
$$;

revoke all on function public.admin_broadcast_notification(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_broadcast_notification(text, jsonb)
  to service_role;
