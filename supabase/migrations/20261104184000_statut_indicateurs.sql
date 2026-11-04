-- Indicateurs des pages /statut et /admin/statut (plan, phase 2) : disponibilité
-- sur 30 jours, liste des incidents, taille et connexions de la base.
-- Lecture seule, réservé au serveur (service_role). Aucune table ajoutée.
--
-- Pour défaire (retirer d'abord les sondes et lectures qui les appellent) :
--   drop function public.health_availability(integer);
--   drop function public.health_transitions(integer);
--   drop function public.db_stats();

-- Nombre de mesures par sonde et par niveau
create or replace function public.health_availability(p_days integer)
returns table (probe text, level text, checks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select h.probe, h.level, count(*) as checks
  from ops.health_checks h
  where h.checked_at > now() - make_interval(days => least(greatest(p_days, 1), 90))
  group by 1, 2
  order by 1, 2;
$$;

-- Chaque changement de niveau d'une sonde, le plus récent d'abord : si l'API coupe
-- à son plafond de lignes, ce sont les plus anciens qui manquent
create or replace function public.health_transitions(p_days integer)
returns table (probe text, level text, checked_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.probe, t.level, t.checked_at
  from (
    select h.probe, h.level, h.checked_at,
           lag(h.level) over (partition by h.probe order by h.checked_at) as previous
    from ops.health_checks h
    where h.checked_at > now() - make_interval(days => least(greatest(p_days, 1), 90))
  ) t
  where t.previous is distinct from t.level
  order by t.checked_at desc;
$$;

-- Taille de la base (octets) et connexions, à comparer aux limites du plan
create or replace function public.db_stats()
returns table (size_bytes bigint, connections integer, max_connections integer)
language sql
security invoker
set search_path = ''
as $$
  select pg_catalog.pg_database_size(pg_catalog.current_database()),
         (select count(*)::integer
            from pg_catalog.pg_stat_activity a
           where a.datname = pg_catalog.current_database()),
         pg_catalog.current_setting('max_connections')::integer;
$$;

revoke execute on function public.health_availability(integer) from public, anon, authenticated;
revoke execute on function public.health_transitions(integer) from public, anon, authenticated;
revoke execute on function public.db_stats() from public, anon, authenticated;
grant execute on function public.health_availability(integer) to service_role;
grant execute on function public.health_transitions(integer) to service_role;
grant execute on function public.db_stats() to service_role;
