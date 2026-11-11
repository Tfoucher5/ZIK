-- Phase 4 du plan : schémas par domaine, premier lot (social et ops).
-- social : follows, friendships, notifications, notification_once, push_subscriptions.
--   Exposé à l'API, protégé par les RLS (les politiques suivent la table).
-- ops : admin_audit_log, reports, prospects, prospect_replies, visit_sources, site_settings.
--   Serveur seulement : pas d'usage du schéma pour anon et authenticated, politiques retirées.
-- Une vue security_invoker garde chaque ancien nom dans public le temps que
-- le code en prod passe sur .schema("social") / .schema("ops") ; une migration
-- suivante les supprime.
-- Les 6 fonctions admin_* qui lisent ces tables passent en security invoker
-- (seul service_role les exécute), search_path vide, noms qualifiés.
-- Prérequis hors migration : social et ops dans « Exposed schemas » (Settings > API).
-- Pour défaire : drop view des 11 vues public.*, alter table <schéma>.<table>
-- set schema public, recréer les politiques et fonctions de
-- 20261111130425_rls_index_search_path.sql et 20261102220000_baseline.sql.

-- ── social ───────────────────────────────────────────────────────────────────

create schema if not exists social;
revoke all on schema social from public;
grant usage on schema social to anon, authenticated, service_role;

alter table public.follows set schema social;
alter table public.friendships set schema social;
alter table public.notifications set schema social;
alter table public.notification_once set schema social;
alter table public.push_subscriptions set schema social;

revoke all on social.follows, social.friendships, social.notifications,
  social.notification_once, social.push_subscriptions from public, anon, authenticated;
grant select on social.follows, social.friendships to anon, authenticated;
grant insert, delete on social.follows to authenticated;
grant insert, update, delete on social.friendships to authenticated;
grant select, update, delete on social.notifications to authenticated;
grant select, insert, update, delete on social.follows, social.friendships,
  social.notifications, social.notification_once, social.push_subscriptions to service_role;

revoke all on sequence social.follows_id_seq, social.friendships_id_seq,
  social.notifications_id_seq from public, anon, authenticated;
grant usage on sequence social.follows_id_seq, social.friendships_id_seq to authenticated;
grant usage, select on sequence social.follows_id_seq, social.friendships_id_seq,
  social.notifications_id_seq to service_role;

-- ── ops ──────────────────────────────────────────────────────────────────────

create schema if not exists ops;
revoke usage on schema ops from public, anon, authenticated;
grant usage on schema ops to service_role;

alter table public.admin_audit_log set schema ops;
alter table public.reports set schema ops;
alter table public.prospects set schema ops;
alter table public.prospect_replies set schema ops;
alter table public.visit_sources set schema ops;
alter table public.site_settings set schema ops;

-- La protection passe par les droits du schéma, plus par les politiques.
drop policy if exists "no delete" on ops.admin_audit_log;
drop policy if exists "no update" on ops.admin_audit_log;
drop policy if exists reports_insert on ops.reports;
drop policy if exists reports_select_admin on ops.reports;
drop policy if exists reports_update_admin on ops.reports;
drop policy if exists site_settings_select on ops.site_settings;

revoke all on ops.admin_audit_log, ops.reports, ops.prospects, ops.prospect_replies,
  ops.visit_sources, ops.site_settings from public, anon, authenticated;
grant select, insert, update, delete on ops.admin_audit_log, ops.reports, ops.prospects,
  ops.prospect_replies, ops.visit_sources, ops.site_settings to service_role;
revoke all on sequence ops.prospects_id_seq, ops.prospect_replies_id_seq
  from public, anon, authenticated;
grant usage, select on sequence ops.prospects_id_seq, ops.prospect_replies_id_seq
  to service_role;

-- ── Vues de compatibilité (à supprimer après la mise en prod du code) ────────

create view public.follows with (security_invoker = true) as select * from social.follows;
create view public.friendships with (security_invoker = true) as select * from social.friendships;
create view public.notifications with (security_invoker = true) as select * from social.notifications;
create view public.notification_once with (security_invoker = true) as select * from social.notification_once;
create view public.push_subscriptions with (security_invoker = true) as select * from social.push_subscriptions;
create view public.admin_audit_log with (security_invoker = true) as select * from ops.admin_audit_log;
create view public.reports with (security_invoker = true) as select * from ops.reports;
create view public.prospects with (security_invoker = true) as select * from ops.prospects;
create view public.prospect_replies with (security_invoker = true) as select * from ops.prospect_replies;
create view public.visit_sources with (security_invoker = true) as select * from ops.visit_sources;
create view public.site_settings with (security_invoker = true) as select * from ops.site_settings;

revoke all on public.follows, public.friendships, public.notifications,
  public.notification_once, public.push_subscriptions, public.admin_audit_log,
  public.reports, public.prospects, public.prospect_replies, public.visit_sources,
  public.site_settings from public, anon, authenticated;
grant select on public.follows, public.friendships to anon, authenticated;
grant insert, delete on public.follows to authenticated;
grant insert, update, delete on public.friendships to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.follows, public.friendships,
  public.notifications, public.notification_once, public.push_subscriptions,
  public.admin_audit_log, public.reports, public.prospects, public.prospect_replies,
  public.visit_sources, public.site_settings to service_role;

-- ── Fonctions admin_* : noms qualifiés, appelées par le serveur seulement ────

create or replace function public.admin_broadcast_notification(p_type text, p_payload jsonb)
 returns integer
 language sql
 security invoker
 set search_path = ''
as $function$
  with ins as (
    insert into social.notifications (user_id, type, payload)
    select id, p_type, p_payload from public.profiles
    returning 1
  )
  select count(*)::int from ins;
$function$;

create or replace function public.admin_pulse(p_days integer default 30)
 returns table(north_7d bigint, north_prev_7d bigint, activation_cohort bigint, activation_played bigint, return_cohort bigint, return_back bigint, salon_guests bigint, salon_invite_hosts bigint, visits bigint, visits_social bigint)
 language sql
 security invoker
 set search_path = ''
as $function$
  with multi as (
    select g.started_at
    from public.games g
    join public.game_players gp on gp.game_id = g.id
    where g.ended_at is not null
      and g.started_at >= now() - interval '14 days'
    group by g.id, g.started_at
    having count(gp.id) >= 2
    union all
    select started_at
    from public.games
    where source = 'salon'
      and ended_at is not null
      and player_count >= 2
      and started_at >= now() - interval '14 days'
  ),
  signups as (
    select id from public.profiles
    where created_at >= now() - make_interval(days => p_days)
  ),
  first_play as (
    select gp.user_id, min(g.started_at) as first_at
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    where gp.user_id is not null
    group by gp.user_id
  ),
  newcomers as (
    select user_id, first_at from first_play
    where first_at >= now() - make_interval(days => p_days + 7)
      and first_at < now() - interval '7 days'
  ),
  salons as (
    select player_count, origin from public.games
    where source = 'salon'
      and started_at >= now() - make_interval(days => p_days)
  ),
  visits as (
    select medium from ops.visit_sources
    where created_at >= now() - make_interval(days => p_days)
  )
  select
    (select count(*) from multi where started_at >= now() - interval '7 days'),
    (select count(*) from multi where started_at < now() - interval '7 days'),
    (select count(*) from signups),
    (select count(*) from signups s
      where exists (select 1 from public.game_players gp where gp.user_id = s.id)
         or exists (select 1 from public.daily_results dr where dr.user_id = s.id)),
    (select count(*) from newcomers),
    (select count(*) from newcomers n
      where exists (
        select 1 from public.game_players gp
        join public.games g on g.id = gp.game_id
        where gp.user_id = n.user_id
          and g.started_at >= date_trunc('day', n.first_at) + interval '1 day'
          and g.started_at < date_trunc('day', n.first_at) + interval '8 days'
      )),
    (select coalesce(sum(greatest(player_count - 1, 0)), 0) from salons),
    (select count(*) from salons where origin = 'invite'),
    (select count(*) from visits),
    (select count(*) from visits where medium = 'social');
$function$;

create or replace function public.admin_retention_levers()
 returns table(lever text, with_n integer, with_retained integer, without_n integer, without_retained integer)
 language sql
 security invoker
 set search_path = ''
as $function$
  with base as (
    select p.id, (p.created_at at time zone 'Europe/Paris')::date as d0
      from public.profiles p
     where p.created_at < now() - interval '37 days'
  ),
  flags as (
    select b.id,
      exists (select 1 from public.daily_results dr
               where dr.user_id = b.id and dr.date between b.d0 and b.d0 + 7) as f_zikle,
      exists (select 1 from public.game_players gp
                join public.games g on g.id = gp.game_id
               where gp.user_id = b.id
                 and (g.started_at at time zone 'Europe/Paris')::date between b.d0 and b.d0 + 7
                 and (select count(*) from public.game_players x where x.game_id = g.id) >= 2) as f_multi,
      exists (select 1 from public.user_achievements ua
               where ua.user_id = b.id
                 and (ua.unlocked_at at time zone 'Europe/Paris')::date between b.d0 and b.d0 + 7) as f_ach,
      (exists (select 1 from social.follows f
                where f.follower_id = b.id
                  and (f.created_at at time zone 'Europe/Paris')::date between b.d0 and b.d0 + 7)
       or exists (select 1 from public.weekly_challenge_contributions wc
                   where wc.user_id = b.id
                     and (wc.updated_at at time zone 'Europe/Paris')::date between b.d0 and b.d0 + 7)) as f_social,
      exists (select 1 from public.admin_user_activity a
               where a.user_id = b.id and a.day > b.d0 + 7 and a.day <= b.d0 + 37) as retained
      from base b
  )
  select 'zikle'::text, count(*) filter (where f_zikle)::int,
         count(*) filter (where f_zikle and retained)::int,
         count(*) filter (where not f_zikle)::int,
         count(*) filter (where not f_zikle and retained)::int from flags
  union all
  select 'multijoueur', count(*) filter (where f_multi)::int,
         count(*) filter (where f_multi and retained)::int,
         count(*) filter (where not f_multi)::int,
         count(*) filter (where not f_multi and retained)::int from flags
  union all
  select 'succes', count(*) filter (where f_ach)::int,
         count(*) filter (where f_ach and retained)::int,
         count(*) filter (where not f_ach)::int,
         count(*) filter (where not f_ach and retained)::int from flags
  union all
  select 'social', count(*) filter (where f_social)::int,
         count(*) filter (where f_social and retained)::int,
         count(*) filter (where not f_social)::int,
         count(*) filter (where not f_social and retained)::int from flags;
$function$;

create or replace function public.admin_traffic_daily(p_days integer default 30)
 returns table(day date, n bigint)
 language sql
 security invoker
 set search_path = ''
as $function$
  select
    d::date as day,
    count(v.id) as n
  from generate_series(
    (now() - make_interval(days => p_days - 1))::date,
    now()::date,
    interval '1 day'
  ) as d
  left join ops.visit_sources v
    on v.created_at >= d and v.created_at < d + interval '1 day'
  group by d
  order by d;
$function$;

create or replace function public.admin_traffic_landings(p_days integer default 30, p_limit integer default 10)
 returns table(landing_path text, n bigint)
 language sql
 security invoker
 set search_path = ''
as $function$
  select
    coalesce(v.landing_path, '/') as landing_path,
    count(*) as n
  from ops.visit_sources v
  where v.created_at >= now() - make_interval(days => p_days)
  group by 1
  order by n desc
  limit p_limit;
$function$;

create or replace function public.admin_traffic_sources(p_days integer default 30)
 returns table(source text, medium text, n bigint, first_seen timestamp with time zone, last_seen timestamp with time zone)
 language sql
 security invoker
 set search_path = ''
as $function$
  select
    v.source,
    v.medium,
    count(*) as n,
    min(v.created_at) as first_seen,
    max(v.created_at) as last_seen
  from ops.visit_sources v
  where v.created_at >= now() - make_interval(days => p_days)
  group by v.source, v.medium
  order by n desc;
$function$;

notify pgrst, 'reload schema';
