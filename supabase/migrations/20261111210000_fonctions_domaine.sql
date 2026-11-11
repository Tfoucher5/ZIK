-- Phase 4 : fonctions de public rangées dans le schéma de leur domaine.
-- ops : statistiques admin, sondes et journal d'erreurs, vue admin_user_activity.
-- social : admin_broadcast_notification. play : admin_schedule_weekly_challenge.
-- Toutes en security invoker, noms qualifiés, appelées par le serveur seulement,
-- sauf ops.admin_weekly_kpis (security definer : service_role ne lit pas auth.users).
-- Les anciennes public.* restent le temps que le code arrive en prod ; elles
-- partent avec les vues de compatibilité.
-- Fonctions jamais appelées (code, routine hebdo, triggers, politiques), supprimées.
--
-- Retour arrière : recréer les fonctions supprimées depuis
-- 20261102220000_baseline.sql, drop des fonctions ops/social/play créées ici.

drop function if exists public.admin_at_risk_users(integer);
drop function if exists public.admin_churn_summary();
drop function if exists public.admin_guest_ratio_7d();
drop function if exists public.admin_retention_j7();
drop function if exists public.admin_retention_levers();
drop function if exists public.admin_return_frequency(integer);
drop function if exists public.admin_return_gap(integer);
drop function if exists public.admin_site_totals();
drop function if exists public.admin_zikle_7d();
drop function if exists public.admin_zikle_today();
drop function if exists public.count_active_players_7d();
drop function if exists public.health_availability(integer);
drop function if exists public.get_my_role();

-- ── Vue d'activité des joueurs ────────────────────────────────────────────
create view ops.admin_user_activity with (security_invoker = true) as
  select gp.user_id,
         (g.started_at at time zone 'Europe/Paris')::date as day,
         'blindtest'::text as activity
    from play.game_players gp
    join play.games g on g.id = gp.game_id
   where gp.user_id is not null
  union all
  select dr.user_id, dr.date as day, 'zikle'::text as activity
    from play.daily_results dr
   where dr.user_id is not null
  union all
  select wc.user_id,
         (wc.updated_at at time zone 'Europe/Paris')::date as day,
         'defi'::text as activity
    from play.weekly_challenge_contributions wc
   where wc.user_id is not null;

revoke all on ops.admin_user_activity from public, anon, authenticated;
grant select on ops.admin_user_activity to service_role;

-- ── Statistiques admin ────────────────────────────────────────────────────
create or replace function ops.admin_active_players_per_day(p_days integer)
returns table(day date, n integer)
language sql
set search_path = ''
as $$
  select d.day::date, count(distinct coalesce(gp.user_id::text, gp.username))::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join play.games g
    on (g.started_at at time zone 'Europe/Paris')::date = d.day::date
  left join play.game_players gp on gp.game_id = g.id
  group by d.day order by d.day;
$$;

create or replace function ops.admin_activity_breakdown(p_weeks integer)
returns table(week date, new_users integer, returning_users integer, resurrected integer)
language sql
set search_path = ''
as $$
  with act as (
    select a.user_id, (date_trunc('week', a.day::timestamp))::date as wk
      from ops.admin_user_activity a
     group by 1, 2
  ),
  first_wk as (
    select act.user_id, min(act.wk) as fw from act group by act.user_id
  ),
  weeks as (
    select generate_series(
      (date_trunc('week', now() at time zone 'Europe/Paris'))::date - ((p_weeks - 1) * 7),
      (date_trunc('week', now() at time zone 'Europe/Paris'))::date,
      interval '7 days'
    )::date as wk
  )
  select w.wk,
         count(a.user_id) filter (where f.fw = w.wk)::int,
         count(a.user_id) filter (
           where f.fw < w.wk
             and exists (select 1 from act p
                          where p.user_id = a.user_id and p.wk = w.wk - 7)
         )::int,
         count(a.user_id) filter (
           where f.fw < w.wk
             and not exists (select 1 from act p
                              where p.user_id = a.user_id and p.wk = w.wk - 7)
         )::int
    from weeks w
    left join act a on a.wk = w.wk
    left join first_wk f on f.user_id = a.user_id
   group by w.wk
   order by w.wk;
$$;

create or replace function ops.admin_dau_wau_mau()
returns table(dau integer, wau integer, mau integer)
language sql
set search_path = ''
as $$
  select count(distinct a.user_id) filter (
           where a.day = (now() at time zone 'Europe/Paris')::date)::int,
         count(distinct a.user_id) filter (
           where a.day > (now() at time zone 'Europe/Paris')::date - 7)::int,
         count(distinct a.user_id)::int
    from ops.admin_user_activity a
   where a.day > (now() at time zone 'Europe/Paris')::date - 30;
$$;

create or replace function ops.admin_games_per_day(p_days integer)
returns table(day date, n integer)
language sql
set search_path = ''
as $$
  select d.day::date, count(g.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join play.games g
    on (g.started_at at time zone 'Europe/Paris')::date = d.day::date
  group by d.day order by d.day;
$$;

create or replace function ops.admin_pulse(p_days integer default 30)
returns table(north_7d bigint, north_prev_7d bigint, activation_cohort bigint, activation_played bigint, return_cohort bigint, return_back bigint, salon_guests bigint, salon_invite_hosts bigint, visits bigint, visits_social bigint)
language sql
set search_path = ''
as $$
  with multi as (
    select g.started_at
    from play.games g
    join play.game_players gp on gp.game_id = g.id
    where g.ended_at is not null
      and g.started_at >= now() - interval '14 days'
    group by g.id, g.started_at
    having count(gp.id) >= 2
    union all
    select started_at
    from play.games
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
    from play.game_players gp
    join play.games g on g.id = gp.game_id
    where gp.user_id is not null
    group by gp.user_id
  ),
  newcomers as (
    select user_id, first_at from first_play
    where first_at >= now() - make_interval(days => p_days + 7)
      and first_at < now() - interval '7 days'
  ),
  salons as (
    select player_count, origin from play.games
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
      where exists (select 1 from play.game_players gp where gp.user_id = s.id)
         or exists (select 1 from play.daily_results dr where dr.user_id = s.id)),
    (select count(*) from newcomers),
    (select count(*) from newcomers n
      where exists (
        select 1 from play.game_players gp
        join play.games g on g.id = gp.game_id
        where gp.user_id = n.user_id
          and g.started_at >= date_trunc('day', n.first_at) + interval '1 day'
          and g.started_at < date_trunc('day', n.first_at) + interval '8 days'
      )),
    (select coalesce(sum(greatest(player_count - 1, 0)), 0) from salons),
    (select count(*) from salons where origin = 'invite'),
    (select count(*) from visits),
    (select count(*) from visits where medium = 'social');
$$;

create or replace function ops.admin_retention_cohorts(p_activity text, p_weeks integer)
returns table(cohort_week date, cohort_size integer, w1 integer, w2 integer, w3 integer, w4 integer)
language sql
set search_path = ''
as $$
  with cohorts as (
    select p.id,
           (date_trunc('week', p.created_at at time zone 'Europe/Paris'))::date as wk
      from public.profiles p
     where (p.created_at at time zone 'Europe/Paris')::date
           >= (date_trunc('week', now() at time zone 'Europe/Paris'))::date - (p_weeks * 7)
  ),
  acts as (
    select a.user_id, (date_trunc('week', a.day::timestamp))::date as wk
      from ops.admin_user_activity a
     where a.activity = p_activity
     group by 1, 2
  )
  select c.wk,
         count(distinct c.id)::int,
         count(distinct c.id) filter (where a.wk = c.wk + 7)::int,
         count(distinct c.id) filter (where a.wk = c.wk + 14)::int,
         count(distinct c.id) filter (where a.wk = c.wk + 21)::int,
         count(distinct c.id) filter (where a.wk = c.wk + 28)::int
    from cohorts c
    left join acts a on a.user_id = c.id
   group by c.wk
   order by c.wk;
$$;

create or replace function ops.admin_signups_per_day(p_days integer)
returns table(day date, n integer)
language sql
set search_path = ''
as $$
  select d.day::date, count(p.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join public.profiles p
    on (p.created_at at time zone 'Europe/Paris')::date = d.day::date
  group by d.day order by d.day;
$$;

create or replace function ops.admin_traffic_daily(p_days integer default 30)
returns table(day date, n bigint)
language sql
set search_path = ''
as $$
  select d::date as day, count(v.id) as n
  from generate_series(
    (now() - make_interval(days => p_days - 1))::date,
    now()::date,
    interval '1 day'
  ) as d
  left join ops.visit_sources v
    on v.created_at >= d and v.created_at < d + interval '1 day'
  group by d
  order by d;
$$;

create or replace function ops.admin_traffic_landings(p_days integer default 30, p_limit integer default 10)
returns table(landing_path text, n bigint)
language sql
set search_path = ''
as $$
  select coalesce(v.landing_path, '/') as landing_path, count(*) as n
  from ops.visit_sources v
  where v.created_at >= now() - make_interval(days => p_days)
  group by 1
  order by n desc
  limit p_limit;
$$;

create or replace function ops.admin_traffic_sources(p_days integer default 30)
returns table(source text, medium text, n bigint, first_seen timestamp with time zone, last_seen timestamp with time zone)
language sql
set search_path = ''
as $$
  select v.source, v.medium, count(*) as n,
         min(v.created_at) as first_seen, max(v.created_at) as last_seen
  from ops.visit_sources v
  where v.created_at >= now() - make_interval(days => p_days)
  group by v.source, v.medium
  order by n desc;
$$;

create or replace function ops.admin_weekly_kpis(p_weeks integer default 8)
returns table(week date, parties_lancees bigint, parties_finies bigint, rooms_multi bigint, salons_lances bigint, salons_finis bigint, salons_multi bigint, salons_joueurs_moy numeric, salons_depuis_invitation bigint, inscrits bigint, inscrits_salon_invite bigint, inscrits_salon_setup bigint, inscrits_room_guest bigint, parties_zikle bigint)
language sql
security definer
set search_path = ''
as $$
  with weeks as (
    select w::date as week
    from generate_series(
      date_trunc('week', now()) - make_interval(weeks => p_weeks - 1),
      date_trunc('week', now()),
      interval '1 week'
    ) w
  ),
  multi as (
    select date_trunc('week', g.started_at)::date as week, count(*) as n
    from (
      select g.id, g.started_at
      from play.games g
      join play.game_players gp on gp.game_id = g.id
      where g.ended_at is not null
        and g.started_at >= (select min(week) from weeks)
      group by g.id, g.started_at
      having count(gp.id) >= 2
    ) g
    group by 1
  ),
  g as (
    select
      date_trunc('week', started_at)::date as week,
      count(*) as lancees,
      count(*) filter (where ended_at is not null) as finies,
      count(*) filter (where source = 'salon') as s_lances,
      count(*) filter (where source = 'salon' and ended_at is not null) as s_finis,
      count(*) filter (where source = 'salon' and ended_at is not null and player_count >= 2) as s_multi,
      round(avg(player_count) filter (where source = 'salon' and ended_at is not null), 1) as s_moy,
      count(*) filter (where source = 'salon' and origin = 'invite') as s_invite
    from play.games
    where started_at >= (select min(week) from weeks)
    group by 1
  ),
  u as (
    select
      date_trunc('week', created_at)::date as week,
      count(*) as n,
      count(*) filter (where raw_user_meta_data->>'signup_ref' = 'salon-invite') as s_invite,
      count(*) filter (where raw_user_meta_data->>'signup_ref' = 'salon-setup') as s_setup,
      count(*) filter (where raw_user_meta_data->>'signup_ref' = 'room-guest') as r_guest
    from auth.users
    where created_at >= (select min(week) from weeks)
    group by 1
  ),
  z as (
    select date_trunc('week', created_at)::date as week, count(*) as n
    from play.daily_results
    where created_at >= (select min(week) from weeks)
    group by 1
  )
  select
    w.week,
    coalesce(g.lancees, 0),
    coalesce(g.finies, 0),
    coalesce(multi.n, 0),
    coalesce(g.s_lances, 0),
    coalesce(g.s_finis, 0),
    coalesce(g.s_multi, 0),
    g.s_moy,
    coalesce(g.s_invite, 0),
    coalesce(u.n, 0),
    coalesce(u.s_invite, 0),
    coalesce(u.s_setup, 0),
    coalesce(u.r_guest, 0),
    coalesce(z.n, 0)
  from weeks w
  left join g using (week)
  left join multi using (week)
  left join u using (week)
  left join z using (week)
  order by w.week;
$$;

create or replace function ops.admin_zikle_per_day(p_days integer)
returns table(day date, n integer)
language sql
set search_path = ''
as $$
  select d.day::date, count(dr.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join play.daily_results dr on dr.date = d.day::date
  group by d.day order by d.day;
$$;

-- ── Sondes et journal d'erreurs ───────────────────────────────────────────
create or replace function ops.db_stats()
returns table(size_bytes bigint, connections integer, max_connections integer)
language sql
set search_path = ''
as $$
  select pg_catalog.pg_database_size(pg_catalog.current_database()),
         (select count(*)::integer
            from pg_catalog.pg_stat_activity a
           where a.datname = pg_catalog.current_database()),
         pg_catalog.current_setting('max_connections')::integer;
$$;

create or replace function ops.health_history(p_days integer)
returns table(day date, probe text, level text)
language sql
stable
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

create or replace function ops.health_transitions(p_days integer)
returns table(probe text, level text, checked_at timestamp with time zone)
language sql
stable
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

create or replace function ops.purge_ops()
returns void
language sql
set search_path = ''
as $$
  delete from ops.health_checks where checked_at < now() - interval '30 days';
  delete from ops.errors where last_seen < now() - interval '30 days';
$$;

create or replace function ops.record_errors(p_rows jsonb)
returns void
language sql
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

create or replace function ops.record_health(p_rows jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into ops.health_checks (probe, level, value, detail)
  select r.probe, r.level, r.value, left(r.detail, 500)
  from jsonb_to_recordset(p_rows) as r(probe text, level text, value double precision, detail text);
$$;

-- ── Actions admin rangées dans le domaine qu'elles écrivent ───────────────
create or replace function social.admin_broadcast_notification(p_type text, p_payload jsonb)
returns integer
language sql
set search_path = ''
as $$
  with ins as (
    insert into social.notifications (user_id, type, payload)
    select id, p_type, p_payload from public.profiles
    returning 1
  )
  select count(*)::int from ins;
$$;

create or replace function play.admin_schedule_weekly_challenge(p_week_start date, p_type text, p_target integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  cur_start date := today - (extract(isodow from today)::int - 1);
begin
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'La semaine doit commencer un lundi';
  end if;
  if p_week_start <= cur_start then
    raise exception 'Seule une semaine à venir peut être programmée';
  end if;
  if p_type not in ('correct_answers','games_played','zikle_wins','cards_won') or p_target is null or p_target <= 0 then
    raise exception 'Type ou objectif invalide';
  end if;

  insert into play.weekly_challenges (week_start, week_end, type, target)
  values (p_week_start, p_week_start + 6, p_type, p_target)
  on conflict (week_start) do update
    set type = excluded.type, target = excluded.target
    where play.weekly_challenges.status = 'active'
      and play.weekly_challenges.current_value = 0;
end;
$$;

-- ── Droits : serveur seulement ────────────────────────────────────────────
revoke execute on function
  ops.admin_active_players_per_day(integer),
  ops.admin_activity_breakdown(integer),
  ops.admin_dau_wau_mau(),
  ops.admin_games_per_day(integer),
  ops.admin_pulse(integer),
  ops.admin_retention_cohorts(text, integer),
  ops.admin_signups_per_day(integer),
  ops.admin_traffic_daily(integer),
  ops.admin_traffic_landings(integer, integer),
  ops.admin_traffic_sources(integer),
  ops.admin_weekly_kpis(integer),
  ops.admin_zikle_per_day(integer),
  ops.db_stats(),
  ops.health_history(integer),
  ops.health_transitions(integer),
  ops.purge_ops(),
  ops.record_errors(jsonb),
  ops.record_health(jsonb),
  social.admin_broadcast_notification(text, jsonb),
  play.admin_schedule_weekly_challenge(date, text, integer)
from public, anon, authenticated;

grant execute on function
  ops.admin_active_players_per_day(integer),
  ops.admin_activity_breakdown(integer),
  ops.admin_dau_wau_mau(),
  ops.admin_games_per_day(integer),
  ops.admin_pulse(integer),
  ops.admin_retention_cohorts(text, integer),
  ops.admin_signups_per_day(integer),
  ops.admin_traffic_daily(integer),
  ops.admin_traffic_landings(integer, integer),
  ops.admin_traffic_sources(integer),
  ops.admin_weekly_kpis(integer),
  ops.admin_zikle_per_day(integer),
  ops.db_stats(),
  ops.health_history(integer),
  ops.health_transitions(integer),
  ops.purge_ops(),
  ops.record_errors(jsonb),
  ops.record_health(jsonb),
  social.admin_broadcast_notification(text, jsonb),
  play.admin_schedule_weekly_challenge(date, text, integer)
to service_role;
