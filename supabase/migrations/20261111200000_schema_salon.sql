-- Phase 4 du plan : schémas par domaine, lot salon.
-- salon : salon_players (joueurs d'une partie de soirée, lus par leur joueur)
--   et pro_subscriptions (abonnement Pro, lu par son titulaire, écrit par le
--   serveur seulement), à côté de snapshots. RLS gardées. Les droits d'écriture
--   d'anon et authenticated sur pro_subscriptions (bloqués par RLS faute de
--   politique) sont retirés.
-- Fonctions des instantanés recréées dans salon (mêmes noms, service_role
-- seulement). Les anciennes public.* restent pour le code encore en prod et
-- partent avec les vues de compatibilité.
-- Lien entre schémas : salon.games(salon.salon_players) (partie d'une ligne de
--   soirée, play.games), déplacé depuis public ; recréé sur la vue de
--   compatibilité pour l'ancien code.
-- snapshots contient la clé de régie : aucun droit pour anon ni authenticated,
-- RLS sans politique ; l'exposition du schéma ne l'ouvre pas.
-- Prérequis hors migration : salon dans « Exposed schemas » (Settings > Data API).
-- Pour défaire : drop des vues public.salon_players, public.pro_subscriptions,
-- de public.games(public.salon_players) et des fonctions salon.*_snapshot*,
-- alter table salon.<table> set schema public, alter function
-- salon.games(salon.salon_players) set schema public, droits de
-- 20261109183419_mes_soirees.sql et 20261102220000_baseline.sql, usage du
-- schéma salon réservé à service_role.

grant usage on schema salon to anon, authenticated;

alter table public.salon_players set schema salon;
alter table public.pro_subscriptions set schema salon;

revoke all on salon.salon_players, salon.pro_subscriptions
  from public, anon, authenticated;
revoke all on sequence salon.salon_players_id_seq from public, anon, authenticated;
grant select on salon.salon_players, salon.pro_subscriptions to authenticated;
grant select, insert, update, delete on salon.salon_players,
  salon.pro_subscriptions to service_role;

-- ── Fonction de lien ─────────────────────────────────────────────────────────

alter function public.games(salon.salon_players) set schema salon;

-- ── Fonctions du domaine ─────────────────────────────────────────────────────

create or replace function salon.save_salon_snapshot(p_code text, p_data jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into salon.snapshots (code, data, saved_at)
  values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, saved_at = excluded.saved_at;
$$;

create or replace function salon.load_salon_snapshot(p_code text, p_max_age_seconds integer)
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

create or replace function salon.purge_salon_snapshots()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from salon.snapshots where saved_at < now() - interval '1 day';
$$;

create or replace function salon.delete_salon_snapshot(p_code text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from salon.snapshots where code = p_code;
$$;

revoke execute on function salon.save_salon_snapshot(text, jsonb),
  salon.load_salon_snapshot(text, integer), salon.delete_salon_snapshot(text),
  salon.purge_salon_snapshots()
  from public, anon, authenticated;
grant execute on function salon.save_salon_snapshot(text, jsonb),
  salon.load_salon_snapshot(text, integer), salon.delete_salon_snapshot(text),
  salon.purge_salon_snapshots()
  to service_role;

-- ── Vues de compatibilité (code encore en prod, supprimées plus tard) ────────

create view public.salon_players with (security_invoker = true) as select * from salon.salon_players;
create view public.pro_subscriptions with (security_invoker = true) as select * from salon.pro_subscriptions;

revoke all on public.salon_players, public.pro_subscriptions
  from public, anon, authenticated;
grant select on public.salon_players, public.pro_subscriptions to authenticated;
grant select, insert, update, delete on public.salon_players,
  public.pro_subscriptions to service_role;

-- Partie d'une ligne de soirée lue par l'ancien code (navigateur et admin).
create or replace function public.games(public.salon_players)
  returns setof play.games rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from play.games where id = $1.game_id $$;

revoke execute on function public.games(public.salon_players) from public, anon, authenticated;
grant execute on function public.games(public.salon_players) to authenticated, service_role;
