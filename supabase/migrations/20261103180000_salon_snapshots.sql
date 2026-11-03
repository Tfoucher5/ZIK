-- Instantané des salons ZIK Soirée (plan, phase 3 : « instantané des salons
-- dans Postgres »). L'état d'un salon vit en mémoire : un déploiement ou un
-- crash effaçait toutes les soirées ouvertes. Le serveur écrit l'état de chaque
-- salon (sans timers ni sockets) à chaque changement de phase et sur SIGTERM,
-- puis relit l'instantané quand un écran ou un téléphone rejoint un code absent
-- de la mémoire.
--
-- Le schéma salon n'est pas exposé à l'API : le serveur passe par trois
-- fonctions de public réservées à service_role (security invoker : c'est
-- service_role qui a les droits sur la table). Les instantanés contiennent la
-- clé de régie, aucun autre rôle n'y a accès.
--
-- Retour arrière :
--   drop function public.save_salon_snapshot(text, jsonb);
--   drop function public.load_salon_snapshot(text, integer);
--   drop function public.purge_salon_snapshots();
--   drop function public.delete_salon_snapshot(text);
--   drop table salon.snapshots;

create schema if not exists salon;
revoke usage on schema salon from public, anon, authenticated;
grant usage on schema salon to service_role;

create table if not exists salon.snapshots (
  code text primary key check (char_length(code) between 1 and 64),
  data jsonb not null,
  saved_at timestamptz not null default now()
);

alter table salon.snapshots enable row level security;
-- Aucune politique : seul service_role (qui contourne RLS) y touche
revoke all on salon.snapshots from public, anon, authenticated;
grant select, insert, update, delete on salon.snapshots to service_role;

create or replace function public.save_salon_snapshot(p_code text, p_data jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into salon.snapshots (code, data, saved_at)
  values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, saved_at = excluded.saved_at;
$$;

-- Instantané récent d'un salon (moins de p_max_age_seconds)
create or replace function public.load_salon_snapshot(p_code text, p_max_age_seconds integer)
returns table (code text, data jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.code, s.data from salon.snapshots s
  where s.code = p_code
    and s.saved_at > now() - make_interval(secs => p_max_age_seconds);
$$;

-- Appelée au démarrage du serveur : instantanés laissés par un crash
create or replace function public.purge_salon_snapshots()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from salon.snapshots where saved_at < now() - interval '1 day';
$$;

create or replace function public.delete_salon_snapshot(p_code text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from salon.snapshots where code = p_code;
$$;

revoke execute on function public.save_salon_snapshot(text, jsonb) from public, anon, authenticated;
revoke execute on function public.load_salon_snapshot(text, integer) from public, anon, authenticated;
revoke execute on function public.delete_salon_snapshot(text) from public, anon, authenticated;
revoke execute on function public.purge_salon_snapshots() from public, anon, authenticated;
grant execute on function public.save_salon_snapshot(text, jsonb) to service_role;
grant execute on function public.load_salon_snapshot(text, integer) to service_role;
grant execute on function public.delete_salon_snapshot(text) to service_role;
grant execute on function public.purge_salon_snapshots() to service_role;
