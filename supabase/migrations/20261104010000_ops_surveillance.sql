-- Surveillance maison (plan, phase 2 : « sondes toutes les 60 s, tables
-- ops.health_checks et ops.errors avec purge à 30 jours »).
-- Le serveur note l'état de ses sondes (base, Deezer, YouTube, boucle
-- d'événements, mémoire, erreurs, titres sans média) à chaque changement
-- d'état et toutes les 5 minutes, et regroupe ses erreurs par empreinte.
--
-- Le schéma ops n'est pas exposé à l'API : le serveur passe par des fonctions
-- de public réservées à service_role (security invoker : c'est service_role
-- qui a les droits sur les tables).
--
-- Retour arrière :
--   drop function public.record_health(jsonb);
--   drop function public.record_errors(jsonb);
--   drop function public.purge_ops();
--   drop function public.health_history(integer);
--   drop schema ops cascade;

create schema if not exists ops;
revoke usage on schema ops from public, anon, authenticated;
grant usage on schema ops to service_role;

create table if not exists ops.health_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  probe text not null check (char_length(probe) between 1 and 40),
  level text not null check (level in ('ok', 'suspect', 'incident')),
  value double precision,
  detail text check (char_length(detail) <= 500)
);
create index if not exists health_checks_probe_checked_at_idx
  on ops.health_checks (probe, checked_at desc);
create index if not exists health_checks_checked_at_idx
  on ops.health_checks (checked_at);

create table if not exists ops.errors (
  fingerprint text primary key check (char_length(fingerprint) between 1 and 64),
  level text not null check (level in ('error', 'warn')),
  message text not null check (char_length(message) <= 2000),
  count integer not null default 1 check (count > 0),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists errors_last_seen_idx on ops.errors (last_seen);

alter table ops.health_checks enable row level security;
alter table ops.errors enable row level security;
-- Aucune politique : seul service_role (qui contourne RLS) y touche
revoke all on ops.health_checks, ops.errors from public, anon, authenticated;
grant select, insert, delete on ops.health_checks to service_role;
grant select, insert, update, delete on ops.errors to service_role;

-- p_rows : [{ probe, level, value, detail }]
create or replace function public.record_health(p_rows jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into ops.health_checks (probe, level, value, detail)
  select r.probe, r.level, r.value, left(r.detail, 500)
  from jsonb_to_recordset(p_rows) as r(probe text, level text, value double precision, detail text);
$$;

-- p_rows : [{ fingerprint, level, message, count, first_seen, last_seen }]
create or replace function public.record_errors(p_rows jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into ops.errors as e (fingerprint, level, message, count, first_seen, last_seen)
  select r.fingerprint, r.level, left(r.message, 2000), r.count, r.first_seen, r.last_seen
  from jsonb_to_recordset(p_rows)
    as r(fingerprint text, level text, message text, count integer, first_seen timestamptz, last_seen timestamptz)
  on conflict (fingerprint) do update
    set count = e.count + excluded.count,
        last_seen = greatest(e.last_seen, excluded.last_seen),
        message = excluded.message;
$$;

-- Appelée au démarrage puis chaque jour par le serveur : 30 jours d'historique
create or replace function public.purge_ops()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from ops.health_checks where checked_at < now() - interval '30 days';
  delete from ops.errors where last_seen < now() - interval '30 days';
$$;

-- Pages /statut et /admin/statut : pire niveau de chaque sonde par jour
-- (heure de Paris) sur les p_days derniers jours
create or replace function public.health_history(p_days integer)
returns table (day date, probe text, level text)
language sql
stable
security invoker
set search_path = ''
as $$
  select (h.checked_at at time zone 'Europe/Paris')::date as day,
         h.probe,
         (array['ok', 'suspect', 'incident'])[
           max(array_position(array['ok', 'suspect', 'incident'], h.level))
         ] as level
  from ops.health_checks h
  where h.checked_at > now() - make_interval(days => least(greatest(p_days, 1), 90))
  group by 1, 2
  order by 1, 2;
$$;

revoke execute on function public.record_health(jsonb) from public, anon, authenticated;
revoke execute on function public.record_errors(jsonb) from public, anon, authenticated;
revoke execute on function public.purge_ops() from public, anon, authenticated;
revoke execute on function public.health_history(integer) from public, anon, authenticated;
grant execute on function public.record_health(jsonb) to service_role;
grant execute on function public.record_errors(jsonb) to service_role;
grant execute on function public.purge_ops() to service_role;
grant execute on function public.health_history(integer) to service_role;
