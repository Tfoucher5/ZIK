


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Ajouté au dump : un projet neuf ouvre toute nouvelle fonction à anon et
-- authenticated (tables, séquences, fonctions). Les droits réels ont leur
-- GRANT explicite plus bas, et les défauts de la prod sont remis à la fin.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";


CREATE SCHEMA IF NOT EXISTS "backup";


ALTER SCHEMA "backup" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_active_players_per_day"("p_days" integer) RETURNS TABLE("day" "date", "n" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select d.day::date, count(distinct coalesce(gp.user_id::text, gp.username))::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join games g
    on (g.started_at at time zone 'Europe/Paris')::date = d.day::date
  left join game_players gp on gp.game_id = g.id
  group by d.day order by d.day;
$$;


ALTER FUNCTION "public"."admin_active_players_per_day"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_activity_breakdown"("p_weeks" integer) RETURNS TABLE("week" "date", "new_users" integer, "returning_users" integer, "resurrected" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with act as (
    select a.user_id, (date_trunc('week', a.day::timestamp))::date as wk
      from admin_user_activity a
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


ALTER FUNCTION "public"."admin_activity_breakdown"("p_weeks" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_at_risk_users"("p_limit" integer) RETURNS TABLE("id" "uuid", "username" "text", "last_active" "date", "days_since" integer, "active_days" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with last_seen as (
    select a.user_id, max(a.day) as last_day, count(distinct a.day) as active_days
      from admin_user_activity a
     group by a.user_id
  ),
  today as (select (now() at time zone 'Europe/Paris')::date as d)
  select p.id, p.username, ls.last_day,
         (t.d - ls.last_day)::int, ls.active_days::int
    from last_seen ls
    join profiles p on p.id = ls.user_id
    cross join today t
   where ls.last_day <= t.d - 14 and ls.last_day > t.d - 30
   order by ls.active_days desc, ls.last_day desc
   limit p_limit;
$$;


ALTER FUNCTION "public"."admin_at_risk_users"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_broadcast_notification"("p_type" "text", "p_payload" "jsonb") RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ins as (
    insert into notifications (user_id, type, payload)
    select id, p_type, p_payload from profiles
    returning 1
  )
  select count(*)::int from ins;
$$;


ALTER FUNCTION "public"."admin_broadcast_notification"("p_type" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_churn_summary"() RETURNS TABLE("active_30d" integer, "churned" integer, "at_risk" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with last_seen as (
    select a.user_id, max(a.day) as last_day
      from admin_user_activity a
     group by a.user_id
  ),
  today as (select (now() at time zone 'Europe/Paris')::date as d)
  select count(*) filter (where ls.last_day > t.d - 30)::int,
         count(*) filter (where ls.last_day <= t.d - 30 and ls.last_day > t.d - 60)::int,
         count(*) filter (where ls.last_day <= t.d - 14 and ls.last_day > t.d - 30)::int
    from last_seen ls cross join today t;
$$;


ALTER FUNCTION "public"."admin_churn_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_dau_wau_mau"() RETURNS TABLE("dau" integer, "wau" integer, "mau" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(distinct a.user_id) filter (
           where a.day = (now() at time zone 'Europe/Paris')::date)::int,
         count(distinct a.user_id) filter (
           where a.day > (now() at time zone 'Europe/Paris')::date - 7)::int,
         count(distinct a.user_id)::int
    from admin_user_activity a
   where a.day > (now() at time zone 'Europe/Paris')::date - 30;
$$;


ALTER FUNCTION "public"."admin_dau_wau_mau"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_games_per_day"("p_days" integer) RETURNS TABLE("day" "date", "n" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select d.day::date, count(g.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join games g
    on (g.started_at at time zone 'Europe/Paris')::date = d.day::date
  group by d.day order by d.day;
$$;


ALTER FUNCTION "public"."admin_games_per_day"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_guest_ratio_7d"() RETURNS TABLE("guests" integer, "logged" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    count(distinct gp.username) filter (where gp.is_guest)::int,
    count(distinct gp.user_id) filter (where not gp.is_guest)::int
  from game_players gp
  join games g on g.id = gp.game_id
  where g.started_at >= now() - interval '7 days';
$$;


ALTER FUNCTION "public"."admin_guest_ratio_7d"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_pulse"("p_days" integer DEFAULT 30) RETURNS TABLE("north_7d" bigint, "north_prev_7d" bigint, "activation_cohort" bigint, "activation_played" bigint, "return_cohort" bigint, "return_back" bigint, "salon_guests" bigint, "salon_invite_hosts" bigint, "visits" bigint, "visits_social" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with multi as (
    select g.started_at
    from games g
    join game_players gp on gp.game_id = g.id
    where g.ended_at is not null
      and g.started_at >= now() - interval '14 days'
    group by g.id, g.started_at
    having count(gp.id) >= 2
    union all
    select started_at
    from games
    where source = 'salon'
      and ended_at is not null
      and player_count >= 2
      and started_at >= now() - interval '14 days'
  ),
  signups as (
    select id from profiles
    where created_at >= now() - make_interval(days => p_days)
  ),
  first_play as (
    select gp.user_id, min(g.started_at) as first_at
    from game_players gp
    join games g on g.id = gp.game_id
    where gp.user_id is not null
    group by gp.user_id
  ),
  newcomers as (
    select user_id, first_at from first_play
    where first_at >= now() - make_interval(days => p_days + 7)
      and first_at < now() - interval '7 days'
  ),
  salons as (
    select player_count, origin from games
    where source = 'salon'
      and started_at >= now() - make_interval(days => p_days)
  ),
  visits as (
    select medium from visit_sources
    where created_at >= now() - make_interval(days => p_days)
  )
  select
    (select count(*) from multi where started_at >= now() - interval '7 days'),
    (select count(*) from multi where started_at < now() - interval '7 days'),
    (select count(*) from signups),
    (select count(*) from signups s
      where exists (select 1 from game_players gp where gp.user_id = s.id)
         or exists (select 1 from daily_results dr where dr.user_id = s.id)),
    (select count(*) from newcomers),
    (select count(*) from newcomers n
      where exists (
        select 1 from game_players gp
        join games g on g.id = gp.game_id
        where gp.user_id = n.user_id
          and g.started_at >= date_trunc('day', n.first_at) + interval '1 day'
          and g.started_at < date_trunc('day', n.first_at) + interval '8 days'
      )),
    (select coalesce(sum(greatest(player_count - 1, 0)), 0) from salons),
    (select count(*) from salons where origin = 'invite'),
    (select count(*) from visits),
    (select count(*) from visits where medium = 'social');
$$;


ALTER FUNCTION "public"."admin_pulse"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_retention_cohorts"("p_activity" "text", "p_weeks" integer) RETURNS TABLE("cohort_week" "date", "cohort_size" integer, "w1" integer, "w2" integer, "w3" integer, "w4" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with cohorts as (
    select p.id,
           (date_trunc('week', p.created_at at time zone 'Europe/Paris'))::date as wk
      from profiles p
     where (p.created_at at time zone 'Europe/Paris')::date
           >= (date_trunc('week', now() at time zone 'Europe/Paris'))::date - (p_weeks * 7)
  ),
  acts as (
    select a.user_id, (date_trunc('week', a.day::timestamp))::date as wk
      from admin_user_activity a
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


ALTER FUNCTION "public"."admin_retention_cohorts"("p_activity" "text", "p_weeks" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_retention_j7"() RETURNS TABLE("cohort_size" integer, "retained" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with cohort as (
    select id, created_at from profiles
    where created_at >= now() - interval '14 days'
      and created_at <  now() - interval '7 days'
  )
  select
    (select count(*) from cohort)::int,
    (select count(distinct c.id) from cohort c
      join game_players gp on gp.user_id = c.id
      join games g on g.id = gp.game_id
      where g.started_at between c.created_at and c.created_at + interval '7 days'
    )::int;
$$;


ALTER FUNCTION "public"."admin_retention_j7"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_retention_levers"() RETURNS TABLE("lever" "text", "with_n" integer, "with_retained" integer, "without_n" integer, "without_retained" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with base as (
    select p.id, (p.created_at at time zone 'Europe/Paris')::date as d0
      from profiles p
     where p.created_at < now() - interval '37 days'
  ),
  flags as (
    select b.id,
      exists (select 1 from daily_results dr
               where dr.user_id = b.id and dr.date between b.d0 and b.d0 + 7) as f_zikle,
      exists (select 1 from game_players gp
                join games g on g.id = gp.game_id
               where gp.user_id = b.id
                 and (g.started_at at time zone 'Europe/Paris')::date between b.d0 and b.d0 + 7
                 and (select count(*) from game_players x where x.game_id = g.id) >= 2) as f_multi,
      exists (select 1 from user_achievements ua
               where ua.user_id = b.id
                 and (ua.unlocked_at at time zone 'Europe/Paris')::date between b.d0 and b.d0 + 7) as f_ach,
      (exists (select 1 from follows f
                where f.follower_id = b.id
                  and (f.created_at at time zone 'Europe/Paris')::date between b.d0 and b.d0 + 7)
       or exists (select 1 from weekly_challenge_contributions wc
                   where wc.user_id = b.id
                     and (wc.updated_at at time zone 'Europe/Paris')::date between b.d0 and b.d0 + 7)) as f_social,
      exists (select 1 from admin_user_activity a
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
$$;


ALTER FUNCTION "public"."admin_retention_levers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_return_frequency"("p_days" integer) RETURNS TABLE("bucket" "text", "lo" integer, "n" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with per_user as (
    select a.user_id, count(distinct a.day) as d
      from admin_user_activity a
     where a.day >= (now() at time zone 'Europe/Paris')::date - (p_days - 1)
     group by a.user_id
  )
  select b.bucket, b.lo, count(pu.user_id)::int
    from (values ('1 jour', 1, 1), ('2-3 jours', 2, 3), ('4-7 jours', 4, 7),
                 ('8-15 jours', 8, 15), ('16+ jours', 16, 1000000)
         ) as b(bucket, lo, hi)
    left join per_user pu on pu.d between b.lo and b.hi
   group by b.bucket, b.lo
   order by b.lo;
$$;


ALTER FUNCTION "public"."admin_return_frequency"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_return_gap"("p_days" integer) RETURNS numeric
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with days as (
    select distinct a.user_id, a.day
      from admin_user_activity a
     where a.day >= (now() at time zone 'Europe/Paris')::date - (p_days - 1)
  ),
  gaps as (
    select d.day - lag(d.day) over (partition by d.user_id order by d.day) as g
      from days d
  )
  select coalesce(percentile_cont(0.5) within group (order by g), 0)::numeric
    from gaps where g is not null;
$$;


ALTER FUNCTION "public"."admin_return_gap"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_schedule_weekly_challenge"("p_week_start" "date", "p_type" "text", "p_target" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  insert into public.weekly_challenges (week_start, week_end, type, target)
  values (p_week_start, p_week_start + 6, p_type, p_target)
  on conflict (week_start) do update
    set type = excluded.type, target = excluded.target
    where public.weekly_challenges.status = 'active'
      and public.weekly_challenges.current_value = 0;
end;
$$;


ALTER FUNCTION "public"."admin_schedule_weekly_challenge"("p_week_start" "date", "p_type" "text", "p_target" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_signups_per_day"("p_days" integer) RETURNS TABLE("day" "date", "n" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select d.day::date, count(p.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join profiles p
    on (p.created_at at time zone 'Europe/Paris')::date = d.day::date
  group by d.day order by d.day;
$$;


ALTER FUNCTION "public"."admin_signups_per_day"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_site_totals"() RETURNS TABLE("total_users" integer, "total_games" integer, "zikle_pool_size" integer, "zikle_days_played" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    (select count(*)::int from profiles),
    (select count(*)::int from games),
    (select count(*)::int from zikle_pool),
    (select count(distinct date)::int from daily_songs);
$$;


ALTER FUNCTION "public"."admin_site_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_traffic_daily"("p_days" integer DEFAULT 30) RETURNS TABLE("day" "date", "n" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    d::date as day,
    count(v.id) as n
  from generate_series(
    (now() - make_interval(days => p_days - 1))::date,
    now()::date,
    interval '1 day'
  ) as d
  left join public.visit_sources v
    on v.created_at >= d and v.created_at < d + interval '1 day'
  group by d
  order by d;
$$;


ALTER FUNCTION "public"."admin_traffic_daily"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_traffic_landings"("p_days" integer DEFAULT 30, "p_limit" integer DEFAULT 10) RETURNS TABLE("landing_path" "text", "n" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    coalesce(v.landing_path, '/') as landing_path,
    count(*) as n
  from public.visit_sources v
  where v.created_at >= now() - make_interval(days => p_days)
  group by 1
  order by n desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."admin_traffic_landings"("p_days" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_traffic_sources"("p_days" integer DEFAULT 30) RETURNS TABLE("source" "text", "medium" "text", "n" bigint, "first_seen" timestamp with time zone, "last_seen" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    v.source,
    v.medium,
    count(*) as n,
    min(v.created_at) as first_seen,
    max(v.created_at) as last_seen
  from public.visit_sources v
  where v.created_at >= now() - make_interval(days => p_days)
  group by v.source, v.medium
  order by n desc;
$$;


ALTER FUNCTION "public"."admin_traffic_sources"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_weekly_kpis"("p_weeks" integer DEFAULT 8) RETURNS TABLE("week" "date", "parties_lancees" bigint, "parties_finies" bigint, "rooms_multi" bigint, "salons_lances" bigint, "salons_finis" bigint, "salons_multi" bigint, "salons_joueurs_moy" numeric, "salons_depuis_invitation" bigint, "inscrits" bigint, "inscrits_salon_invite" bigint, "inscrits_salon_setup" bigint, "inscrits_room_guest" bigint, "parties_zikle" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
      from games g
      join game_players gp on gp.game_id = g.id
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
    from games
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
    from daily_results
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


ALTER FUNCTION "public"."admin_weekly_kpis"("p_weeks" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_zikle_7d"() RETURNS TABLE("total_players" integer, "won_count" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(*)::int, count(*) filter (where won)::int
  from daily_results
  where date >= (now() at time zone 'Europe/Paris')::date - 6;
$$;


ALTER FUNCTION "public"."admin_zikle_7d"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_zikle_per_day"("p_days" integer) RETURNS TABLE("day" "date", "n" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select d.day::date, count(dr.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join daily_results dr on dr.date = d.day::date
  group by d.day order by d.day;
$$;


ALTER FUNCTION "public"."admin_zikle_per_day"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_zikle_today"() RETURNS TABLE("total_players" integer, "won_count" integer, "avg_attempts" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    count(*)::int,
    count(*) filter (where won)::int,
    coalesce(round(avg(attempts)::numeric, 1), 0)
  from daily_results
  where date = (now() at time zone 'Europe/Paris')::date;
$$;


ALTER FUNCTION "public"."admin_zikle_today"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attach_card_to_sets"("p_card_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  c record;
  v_set uuid;
begin
  select cards.id, cards.artist_id, cards.album_id,
         ar.name as artist_name, al.title as album_title,
         al.record_type, al.cover_url
    into c
    from cards
    join card_artists ar on ar.deezer_id = cards.artist_id
    left join card_albums al on al.deezer_id = cards.album_id
   where cards.id = p_card_id;
  if not found then return; end if;

  insert into card_sets (kind, key, name, cover_url)
  values ('artist', c.artist_id::text, c.artist_name, c.cover_url)
  on conflict (kind, key) do update set cover_url = coalesce(card_sets.cover_url, excluded.cover_url)
  returning id into v_set;
  insert into card_set_items values (v_set, c.id) on conflict do nothing;

  if c.album_id is not null and c.record_type in ('album', 'ep') then
    insert into card_sets (kind, key, name, cover_url)
    values ('album', c.album_id::text, c.album_title, c.cover_url)
    on conflict (kind, key) do update set name = excluded.name
    returning id into v_set;
    insert into card_set_items values (v_set, c.id) on conflict do nothing;
  end if;

  update card_sets s
     set card_count = (select count(*) from card_set_items i where i.set_id = s.id)
   where s.id in (select set_id from card_set_items where card_id = c.id);
end;
$$;


ALTER FUNCTION "public"."attach_card_to_sets"("p_card_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."card_settle"("p_user_id" "uuid", "p_grant_ids" bigint[], "p_keep" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  g record;
  v_new boolean;
  v_visible timestamptz;
  v_cards jsonb := '[]'::jsonb;
  v_sets jsonb := '[]'::jsonb;
  s record;
begin
  for g in
    select * from card_grants
     where id = any(p_grant_ids) and user_id = p_user_id and status = 'pending'
     order by id
     for update
  loop
    if not p_keep then
      update card_grants set status = 'lost', settled_at = now() where id = g.id;
      continue;
    end if;

    v_visible := case when g.delayed
      then greatest(now(), (select created_at + interval '24 hours' from profiles where id = p_user_id))
      else now() end;

    insert into user_cards (user_id, card_id, visible_at)
    values (p_user_id, g.card_id, v_visible)
    on conflict (user_id, card_id) do nothing;
    v_new := found;

    update card_grants set status = 'granted', settled_at = now() where id = g.id;
    update cards set first_owner_id = p_user_id, first_owned_at = now()
     where id = g.card_id and first_owner_id is null;

    v_cards := v_cards || jsonb_build_object('card_id', g.card_id, 'is_new', v_new);

    if v_new then
      for s in
        select cs.id, cs.kind, cs.name
          from card_set_items i
          join card_sets cs on cs.id = i.set_id
         where i.card_id = g.card_id
           and cs.card_count >= 3
           and not exists (select 1 from user_card_sets u where u.user_id = p_user_id and u.set_id = cs.id)
           and not exists (
             select 1 from card_set_items i2
              where i2.set_id = cs.id
                and not exists (select 1 from user_cards uc where uc.user_id = p_user_id and uc.card_id = i2.card_id)
           )
      loop
        insert into user_card_sets (user_id, set_id) values (p_user_id, s.id) on conflict do nothing;
        v_sets := v_sets || jsonb_build_object('id', s.id, 'kind', s.kind, 'name', s.name);
      end loop;
    end if;
  end loop;

  return jsonb_build_object('cards', v_cards, 'sets', v_sets);
end;
$$;


ALTER FUNCTION "public"."card_settle"("p_user_id" "uuid", "p_grant_ids" bigint[], "p_keep" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cards_after_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform attach_card_to_sets(new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."cards_after_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cards_collectors"() RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "score" integer, "cards" integer, "sets" integer, "rank" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with owned as (
    select uc.user_id,
           sum(case c.rarity
                 when 'common' then 1 when 'uncommon' then 2 when 'rare' then 4
                 when 'epic' then 8 when 'legendary' then 16 when 'mythic' then 32
               end)::int as score,
           count(*)::int as cards
      from user_cards uc
      join cards c on c.id = uc.card_id
     where uc.visible_at <= now()
     group by uc.user_id
  ),
  done as (
    select ucs.user_id, count(*)::int as sets
      from user_card_sets ucs
      join card_sets s on s.id = ucs.set_id
     where s.card_count >= 3
     group by ucs.user_id
  )
  select o.user_id, p.username, p.avatar_url, o.score, o.cards,
         coalesce(d.sets, 0),
         (rank() over (order by o.score desc, o.cards desc))::int
    from owned o
    join profiles p on p.id = o.user_id
    left join done d on d.user_id = o.user_id
   where p.username is not null;
$$;


ALTER FUNCTION "public"."cards_collectors"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cards_leaderboard"("p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 20) RETURNS TABLE("username" "text", "avatar_url" "text", "score" integer, "cards" integer, "sets" integer, "rank" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select username, avatar_url, score, cards, sets, rank
    from cards_collectors()
   order by rank, username
  offset greatest(p_offset, 0)
   limit least(greatest(p_limit, 1), 50);
$$;


ALTER FUNCTION "public"."cards_leaderboard"("p_offset" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cards_leaderboard_my_rank"("p_user_id" "uuid") RETURNS TABLE("username" "text", "avatar_url" "text", "score" integer, "cards" integer, "sets" integer, "rank" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select username, avatar_url, score, cards, sets, rank
    from cards_collectors()
   where user_id = p_user_id;
$$;


ALTER FUNCTION "public"."cards_leaderboard_my_rank"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cards_showcase"("p_user_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "by_rarity" "jsonb", "best" "uuid"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with owned as (
    select uc.user_id, c.id, c.rarity, c.deezer_rank,
           array_position(array['mythic','legendary','epic','rare','uncommon','common'], c.rarity) as tier
      from user_cards uc
      join cards c on c.id = uc.card_id
     where uc.user_id = any(p_user_ids)
       and uc.visible_at <= now()
  ),
  counts as (
    select o.user_id, jsonb_object_agg(o.rarity, o.n) as by_rarity
      from (select user_id, rarity, count(*)::int as n from owned group by user_id, rarity) o
     group by o.user_id
  ),
  ranked as (
    select o.user_id, o.id,
           row_number() over (partition by o.user_id order by o.tier, o.deezer_rank desc) as pos
      from owned o
      join profiles p on p.id = o.user_id
     where not coalesce(p.is_private, false)
  )
  select c.user_id, c.by_rarity,
         coalesce((select array_agg(r.id order by r.pos) from ranked r
                    where r.user_id = c.user_id and r.pos <= 3), '{}')
    from counts c;
$$;


ALTER FUNCTION "public"."cards_showcase"("p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_active_players_7d"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT COUNT(DISTINCT
    CASE
      WHEN gp.user_id IS NOT NULL THEN gp.user_id::text
      ELSE 'guest_' || gp.username
    END
  )::integer
  FROM game_players gp
  JOIN games g ON g.id = gp.game_id
  WHERE g.started_at >= NOW() - INTERVAL '7 days';
$$;


ALTER FUNCTION "public"."count_active_players_7d"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_room_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  tries  int  := 0;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE rooms.code = v_code);
    tries := tries + 1;
    IF tries > 100 THEN RAISE EXCEPTION 'Cannot generate unique room code'; END IF;
  END LOOP;
  RETURN v_code;
END;
$$;


ALTER FUNCTION "public"."generate_room_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_covers_by_playlists"("pids" "uuid"[], "max_per_playlist" integer DEFAULT 9) RETURNS json
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(json_object_agg(playlist_id, covers), '{}'::json)
  FROM (
    SELECT playlist_id, array_agg(cover_url ORDER BY rn) AS covers
    FROM (
      SELECT
        playlist_id, cover_url,
        ROW_NUMBER() OVER (PARTITION BY playlist_id ORDER BY id) AS rn
      FROM custom_playlist_tracks
      WHERE playlist_id = ANY(pids)
        AND cover_url IS NOT NULL
        AND cover_url != ''
    ) t
    WHERE rn <= max_per_playlist
    GROUP BY playlist_id
  ) agg;
$$;


ALTER FUNCTION "public"."get_covers_by_playlists"("pids" "uuid"[], "max_per_playlist" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Dériver un username depuis les métadonnées (email/username/name)
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    REGEXP_REPLACE(
      LOWER(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))),
      '[^a-z0-9_-]', '', 'g'
    )
  );
  -- S'assurer que le username fait entre 3 et 20 caractères
  base_username := SUBSTRING(base_username FROM 1 FOR 20);
  IF LENGTH(base_username) < 3 THEN base_username := 'user'; END IF;
  final_username := base_username;

  -- Unicité du username (ajouter suffix si déjà pris)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := SUBSTRING(base_username FROM 1 FOR 17) || counter::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_weekly_challenge"("p_type" "text", "p_user_id" "uuid", "p_amount" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  wk_start date := today - (extract(isodow from today)::int - 1);
  cid uuid;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then return; end if;

  select id into cid from public.weekly_challenges
  where week_start = wk_start and type = p_type and status = 'active';
  if cid is null then return; end if; -- semaine pas encore "picked", ou type différent cette semaine : no-op silencieux

  insert into public.weekly_challenge_contributions (challenge_id, user_id, amount)
  values (cid, p_user_id, p_amount)
  on conflict (challenge_id, user_id) do update
    set amount = weekly_challenge_contributions.amount + excluded.amount,
        updated_at = now();

  update public.weekly_challenges set current_value = current_value + p_amount where id = cid;
end;
$$;


ALTER FUNCTION "public"."increment_weekly_challenge"("p_type" "text", "p_user_id" "uuid", "p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leaderboard_score"("p_mode" "text", "p_rooms" "text", "p_period" "text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("username" "text", "avatar_url" "text", "total_score" bigint, "games_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select pr.username,
         pr.avatar_url,
         sum(gp.score)::bigint,
         count(distinct gp.game_id)::bigint
    from game_players gp
    join games g on g.id = gp.game_id
    join profiles pr on pr.id = gp.user_id
    left join rooms r on r.code = g.room_id
   where gp.is_guest = false
     and gp.user_id is not null
     and (case when p_mode = 'qcm' then g.mode = 'qcm' else g.mode <> 'qcm' end)
     and (p_rooms <> 'officielles' or r.is_official is true)
     and (
       p_period = 'alltime'
       or coalesce(g.ended_at, g.started_at) >=
          date_trunc(
            case when p_period = 'mois' then 'month' else 'week' end,
            now() at time zone 'Europe/Paris'
          ) at time zone 'Europe/Paris'
     )
   group by pr.id, pr.username, pr.avatar_url
   order by sum(gp.score) desc
   limit p_limit offset p_offset;
$$;


ALTER FUNCTION "public"."leaderboard_score"("p_mode" "text", "p_rooms" "text", "p_period" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leaderboard_score_my_rank"("p_user_id" "uuid", "p_mode" "text", "p_rooms" "text", "p_period" "text") RETURNS TABLE("rank" bigint, "total_score" bigint, "games_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  with agg as (
    select gp.user_id                        as user_id,
           sum(gp.score)::bigint             as total_score,
           count(distinct gp.game_id)::bigint as games_count
      from game_players gp
      join games g on g.id = gp.game_id
      join profiles pr on pr.id = gp.user_id
      left join rooms r on r.code = g.room_id
     where gp.is_guest = false
       and gp.user_id is not null
       and (case when p_mode = 'qcm' then g.mode = 'qcm' else g.mode <> 'qcm' end)
       and (p_rooms <> 'officielles' or r.is_official is true)
       and (
         p_period = 'alltime'
         or coalesce(g.ended_at, g.started_at) >=
            date_trunc(
              case when p_period = 'mois' then 'month' else 'week' end,
              now() at time zone 'Europe/Paris'
            ) at time zone 'Europe/Paris'
       )
     group by gp.user_id
  ), ranked as (
    select agg.user_id,
           row_number() over (order by agg.total_score desc)::bigint as rank,
           agg.total_score,
           agg.games_count
      from agg
  )
  select ranked.rank, ranked.total_score, ranked.games_count
    from ranked
   where ranked.user_id = p_user_id;
$$;


ALTER FUNCTION "public"."leaderboard_score_my_rank"("p_user_id" "uuid", "p_mode" "text", "p_rooms" "text", "p_period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pick_daily_song"() RETURNS TABLE("date" "date", "track_id" "uuid", "is_new" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  existing uuid;
  picked uuid;
begin
  select ds.track_id into existing from public.daily_songs ds where ds.date = today;
  if existing is not null then
    return query select today, existing, false;
    return;
  end if;

  select zp.track_id into picked
  from public.zikle_pool zp
  where zp.track_id not in (
    select ds.track_id from public.daily_songs ds where ds.date > today - interval '365 days'
  )
  order by random()
  limit 1;

  if picked is null then
    return; -- pool épuisé ou pas encore alimenté : aucune ligne renvoyée
  end if;

  insert into public.daily_songs (date, track_id) values (today, picked)
    on conflict (date) do nothing;

  select ds.track_id into existing from public.daily_songs ds where ds.date = today;
  return query select today, existing, true;
end;
$$;


ALTER FUNCTION "public"."pick_daily_song"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pick_weekly_challenge"() RETURNS TABLE("id" "uuid", "week_start" "date", "week_end" "date", "type" "text", "target" integer, "current_value" integer, "status" "text", "top_contributor_id" "uuid", "top_contributor_amount" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  wk_start date := today - (extract(isodow from today)::int - 1);
  wk_end date := wk_start + 6;
  existing_id uuid;
  prev_row public.weekly_challenges%rowtype;
  top_row record;
  last_type text;
  types text[] := array['correct_answers','games_played','zikle_wins','cards_won'];
  targets int[] := array[5000, 300, 150, 500];
  next_idx int;
begin
  for prev_row in
    select * from public.weekly_challenges
    where status = 'active' and week_start < wk_start
    for update skip locked
  loop
    select c.user_id, c.amount into top_row
    from public.weekly_challenge_contributions c
    where c.challenge_id = prev_row.id
    order by c.amount desc, c.updated_at asc
    limit 1;

    update public.weekly_challenges set
      status = case when prev_row.current_value >= prev_row.target then 'success' else 'failed' end,
      top_contributor_id = top_row.user_id,
      top_contributor_amount = top_row.amount,
      closed_at = now()
    where id = prev_row.id;

    if prev_row.current_value >= prev_row.target then
      insert into public.user_achievements (user_id, achievement_id, tier, count)
      select c.user_id, 'weekly_challenge_hero', null, 1
      from public.weekly_challenge_contributions c
      where c.challenge_id = prev_row.id
      on conflict (user_id, achievement_id, tier) do update
        set count = public.user_achievements.count + 1,
            unlocked_at = now();
    end if;

    if top_row.user_id is not null then
      insert into public.user_achievements (user_id, achievement_id, tier, count)
      values (top_row.user_id, 'weekly_top_contributor', null, 1)
      on conflict (user_id, achievement_id, tier) do update
        set count = public.user_achievements.count + 1,
            unlocked_at = now();
    end if;
  end loop;

  select wc.id into existing_id from public.weekly_challenges wc where wc.week_start = wk_start;
  if existing_id is null then
    select type into last_type from public.weekly_challenges
    where week_start < wk_start order by week_start desc limit 1;
    if last_type is null then
      next_idx := floor(random() * array_length(types, 1))::int;
    else
      next_idx := coalesce(array_position(types, last_type), 0) % array_length(types, 1);
    end if;

    insert into public.weekly_challenges (week_start, week_end, type, target)
    values (wk_start, wk_end, types[next_idx + 1], targets[next_idx + 1])
    on conflict (week_start) do nothing;
  end if;

  return query
    select wc.id, wc.week_start, wc.week_end, wc.type, wc.target, wc.current_value,
           wc.status, wc.top_contributor_id, wc.top_contributor_amount
    from public.weekly_challenges wc where wc.week_start = wk_start;
end;
$$;


ALTER FUNCTION "public"."pick_weekly_challenge"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_round_stats"("p_track_id" "uuid", "p_exposed" integer, "p_found" integer) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  insert into track_stats (track_id, rounds_played, players_exposed, found_full, last_played_at)
  values (p_track_id, 1, p_exposed, p_found, now())
  on conflict (track_id) do update set
    rounds_played   = track_stats.rounds_played + 1,
    players_exposed = track_stats.players_exposed + excluded.players_exposed,
    found_full      = track_stats.found_full + excluded.found_full,
    last_played_at  = now();
$$;


ALTER FUNCTION "public"."record_round_stats"("p_track_id" "uuid", "p_exposed" integer, "p_found" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."report_track_issue"("p_track" "uuid", "p_kind" "text", "p_source" "text", "p_note" "text" DEFAULT NULL::"text", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  insert into track_issues (track_id, kind, source, note, context)
  values (p_track, p_kind, p_source, p_note, coalesce(p_context, '{}'::jsonb))
  on conflict (track_id, kind) where status = 'open'
  do update set
    count = track_issues.count + 1,
    updated_at = now(),
    source = case when excluded.source = 'auto' then track_issues.source else excluded.source end,
    note = coalesce(excluded.note, track_issues.note),
    context = track_issues.context || excluded.context;
$$;


ALTER FUNCTION "public"."report_track_issue"("p_track" "uuid", "p_kind" "text", "p_source" "text", "p_note" "text", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_tracks"("p_tracks" "jsonb") RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  rec record;
  v_id uuid;
  result uuid[] := '{}';
begin
  for rec in
    select * from jsonb_to_recordset(p_tracks) as x(
      artist text, title text, preview_url text, preview_expires_at timestamptz,
      cover_url text, external_id text, source text)
  loop
    insert into public.tracks (artist, title, preview_url, preview_expires_at, cover_url, external_id, source)
    values (rec.artist, rec.title, rec.preview_url, rec.preview_expires_at,
            rec.cover_url, rec.external_id, coalesce(rec.source, 'manual'))
    on conflict (norm_key) do update set
      preview_url = coalesce(public.tracks.preview_url, excluded.preview_url),
      preview_expires_at = case when public.tracks.preview_url is null then excluded.preview_expires_at else public.tracks.preview_expires_at end,
      cover_url = coalesce(public.tracks.cover_url, excluded.cover_url),
      external_id = coalesce(public.tracks.external_id, excluded.external_id)
    returning id into v_id;
    result := array_append(result, v_id);
  end loop;
  return result;
end;
$$;


ALTER FUNCTION "public"."resolve_tracks"("p_tracks" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rooms_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_room_code();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."rooms_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_discord_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.provider = 'discord' THEN
    UPDATE public.profiles
    SET
      discord_id       = NEW.identity_data->>'provider_id',
      discord_username = NEW.identity_data->>'full_name',
      discord_avatar   = NEW.identity_data->>'avatar_hash'
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_discord_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_player_stats"("p_user_id" "uuid", "p_score" integer, "p_rank" integer, "p_total_players" integer, "p_elo_change" integer DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  xp_gain integer;
BEGIN
  xp_gain := p_score * 10 + CASE
    WHEN p_rank = 1 THEN 100
    WHEN p_rank = 2 THEN 60
    WHEN p_rank = 3 THEN 30
    ELSE 10
  END;

  UPDATE public.profiles
  SET
    xp           = xp + xp_gain,
    elo          = GREATEST(0, elo + p_elo_change),
    games_played = games_played + 1,
    total_score  = total_score + p_score,
    level        = GREATEST(1, FLOOR(1 + POWER((xp + xp_gain) / 50.0, 0.4)))
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_player_stats"("p_user_id" "uuid", "p_score" integer, "p_rank" integer, "p_total_players" integer, "p_elo_change" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_player_stats_discord"("p_user_id" "uuid", "p_score" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_xp_gain int;
BEGIN
  v_xp_gain := GREATEST(1, p_score / 10);

  UPDATE public.profiles
  SET
    discord_games_played = discord_games_played + 1,
    total_score          = total_score + p_score,
    xp                   = xp + v_xp_gain,
    level                = GREATEST(1, FLOOR(POWER((xp + v_xp_gain) / 100.0, 0.6))::int)
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_player_stats_discord"("p_user_id" "uuid", "p_score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_player_streaks"("p_user_id" "uuid", "p_won" boolean) RETURNS TABLE("current_streak" integer, "best_streak" integer, "win_streak" integer, "best_win_streak" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  prev_date date;
  prev_cur int;
  prev_win int;
  new_cur int;
  new_win int;
BEGIN
  SELECT p.last_played_date, p.current_streak, p.win_streak
    INTO prev_date, prev_cur, prev_win
    FROM public.profiles p WHERE p.id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF prev_date = today THEN
    new_cur := GREATEST(prev_cur, 1);
  ELSIF prev_date = today - 1 THEN
    new_cur := prev_cur + 1;
  ELSE
    new_cur := 1;
  END IF;

  IF p_won THEN new_win := prev_win + 1; ELSE new_win := 0; END IF;

  UPDATE public.profiles SET
    current_streak   = new_cur,
    best_streak      = GREATEST(profiles.best_streak, new_cur),
    win_streak       = new_win,
    best_win_streak  = GREATEST(profiles.best_win_streak, new_win),
    last_played_date = today
  WHERE id = p_user_id;

  RETURN QUERY
    SELECT p.current_streak, p.best_streak, p.win_streak, p.best_win_streak
    FROM public.profiles p WHERE p.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_player_streaks"("p_user_id" "uuid", "p_won" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_playlist_track_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.custom_playlists SET track_count = track_count + 1, updated_at = NOW() WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.custom_playlists SET track_count = GREATEST(0, track_count - 1), updated_at = NOW() WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_playlist_track_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."weekly_leaderboard"() RETURNS TABLE("username" "text", "avatar_url" "text", "weekly_score" bigint, "games_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    p.username,
    p.avatar_url,
    SUM(gp.score) AS weekly_score,
    COUNT(DISTINCT gp.game_id) AS games_count
  FROM public.game_players gp
  JOIN public.games g ON g.id = gp.game_id
  JOIN public.profiles p ON p.id = gp.user_id
  LEFT JOIN public.rooms r ON r.code = g.room_id
  WHERE g.ended_at >= date_trunc('week', NOW() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'
    AND gp.is_guest = FALSE
    AND (r.game_mode IS NULL OR r.game_mode != 'qcm')
  GROUP BY p.username, p.avatar_url
  ORDER BY weekly_score DESC
  LIMIT 20;
$$;


ALTER FUNCTION "public"."weekly_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."weekly_leaderboard_by_room"("p_room_code" "text") RETURNS TABLE("username" "text", "avatar_url" "text", "weekly_score" bigint, "games_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    pr.username,
    pr.avatar_url,
    SUM(gp.score)::BIGINT   AS weekly_score,
    COUNT(DISTINCT g.id)::BIGINT AS games_count
  FROM game_players gp
  JOIN games        g  ON g.id = gp.game_id
  JOIN profiles     pr ON pr.id = gp.user_id
  WHERE
    g.room_id  = p_room_code
    AND gp.is_guest = FALSE
    AND g.ended_at IS NOT NULL
    AND g.ended_at >= date_trunc('week', NOW())
  GROUP BY pr.username, pr.avatar_url
  ORDER BY weekly_score DESC
  LIMIT 10;
$$;


ALTER FUNCTION "public"."weekly_leaderboard_by_room"("p_room_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."zikle_complete"("p_user_id" "uuid", "p_date" "date", "p_attempts" integer, "p_won" boolean, "p_solve_time_seconds" integer, "p_guesses" "jsonb") RETURNS TABLE("attempts" integer, "won" boolean, "solve_time_seconds" integer, "is_new" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
declare
  existing record;
  inserted record;
begin
  select dr.attempts, dr.won, dr.solve_time_seconds into existing
  from public.daily_results dr where dr.user_id = p_user_id and dr.date = p_date;

  if found then
    return query select existing.attempts, existing.won, existing.solve_time_seconds, false;
    return;
  end if;

  insert into public.daily_results (user_id, date, attempts, won, solve_time_seconds, guesses)
  values (p_user_id, p_date, p_attempts, p_won, p_solve_time_seconds, p_guesses)
  on conflict (user_id, date) do nothing
  returning attempts, won, solve_time_seconds into inserted;

  if inserted is null then
    select dr.attempts, dr.won, dr.solve_time_seconds into existing
    from public.daily_results dr where dr.user_id = p_user_id and dr.date = p_date;
    return query select existing.attempts, existing.won, existing.solve_time_seconds, false;
    return;
  end if;

  if p_won then
    update public.profiles set xp = xp + 10 where id = p_user_id;
  end if;

  return query select inserted.attempts, inserted.won, inserted.solve_time_seconds, true;
end;
$$;


ALTER FUNCTION "public"."zikle_complete"("p_user_id" "uuid", "p_date" "date", "p_attempts" integer, "p_won" boolean, "p_solve_time_seconds" integer, "p_guesses" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."zikle_leaderboard"("p_date" "date", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("username" "text", "attempts" integer, "won" boolean, "solve_time_seconds" integer, "rank" integer, "total" integer, "is_me" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ranked as (
    select
      p.username,
      dr.attempts,
      dr.won,
      dr.solve_time_seconds,
      rank() over (
        order by dr.won desc, dr.attempts asc, dr.solve_time_seconds asc nulls last
      )::int as rank,
      (count(*) over ())::int as total,
      coalesce(dr.user_id = p_user_id, false) as is_me
    from public.daily_results dr
    join public.profiles p on p.id = dr.user_id
    where dr.date = p_date
  )
  select username, attempts, won, solve_time_seconds, rank, total, is_me
  from ranked
  where rank <= p_limit or is_me
  order by rank;
$$;


ALTER FUNCTION "public"."zikle_leaderboard"("p_date" "date", "p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "backup"."cpt_20260705" (
    "id" "uuid",
    "playlist_id" "uuid",
    "artist" "text",
    "title" "text",
    "preview_url" "text",
    "cover_url" "text",
    "source" "text",
    "external_id" "text",
    "position" integer,
    "created_at" timestamp with time zone,
    "custom_artist" "text",
    "custom_title" "text",
    "custom_feats" "text"[],
    "preview_expires_at" timestamp with time zone
);


ALTER TABLE "backup"."cpt_20260705" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup"."track_answers_20260705" (
    "id" "uuid",
    "track_id" "uuid",
    "answer_type_id" integer,
    "value" "text"
);


ALTER TABLE "backup"."track_answers_20260705" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "type" "text" NOT NULL,
    "tiers" "jsonb",
    "rarity" "text" NOT NULL,
    "category" "text" NOT NULL,
    CONSTRAINT "achievements_category_check" CHECK (("category" = ANY (ARRAY['streak'::"text", 'wins'::"text", 'score'::"text", 'social'::"text", 'challenge'::"text"]))),
    CONSTRAINT "achievements_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'rare'::"text", 'epic'::"text", 'legendary'::"text"]))),
    CONSTRAINT "achievements_type_check" CHECK (("type" = ANY (ARRAY['one_time'::"text", 'tiered'::"text"])))
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_id" "uuid",
    "target_type" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "attempts" integer NOT NULL,
    "won" boolean NOT NULL,
    "solve_time_seconds" integer,
    "guesses" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_results_attempts_check" CHECK ((("attempts" >= 1) AND ("attempts" <= 6)))
);


ALTER TABLE "public"."daily_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "username" "text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "rank" integer,
    "is_guest" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."game_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "rounds" integer DEFAULT 10 NOT NULL,
    "mode" "text" DEFAULT 'classic'::"text" NOT NULL,
    "source" "text" DEFAULT 'web'::"text" NOT NULL,
    "player_count" integer,
    "origin" "text",
    "host_id" "uuid",
    "limit_hits" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_challenge_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."weekly_challenge_contributions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_user_activity" AS
 SELECT "gp"."user_id",
    (("g"."started_at" AT TIME ZONE 'Europe/Paris'::"text"))::"date" AS "day",
    'blindtest'::"text" AS "activity"
   FROM ("public"."game_players" "gp"
     JOIN "public"."games" "g" ON (("g"."id" = "gp"."game_id")))
  WHERE ("gp"."user_id" IS NOT NULL)
UNION ALL
 SELECT "dr"."user_id",
    "dr"."date" AS "day",
    'zikle'::"text" AS "activity"
   FROM "public"."daily_results" "dr"
  WHERE ("dr"."user_id" IS NOT NULL)
UNION ALL
 SELECT "wc"."user_id",
    (("wc"."updated_at" AT TIME ZONE 'Europe/Paris'::"text"))::"date" AS "day",
    'defi'::"text" AS "activity"
   FROM "public"."weekly_challenge_contributions" "wc"
  WHERE ("wc"."user_id" IS NOT NULL);


ALTER VIEW "public"."admin_user_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."answer_types" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."answer_types" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."answer_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."answer_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."answer_types_id_seq" OWNED BY "public"."answer_types"."id";



CREATE TABLE IF NOT EXISTS "public"."card_albums" (
    "deezer_id" bigint NOT NULL,
    "artist_id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "record_type" "text",
    "year" smallint,
    "genre" "text",
    "cover_url" "text",
    "cover_md_url" "text",
    "dominant_color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."card_albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_artists" (
    "deezer_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "nb_fan" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."card_artists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_grants" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "card_id" "uuid" NOT NULL,
    "game_id" "uuid",
    "room_id" "text" NOT NULL,
    "round" smallint NOT NULL,
    "mode" "text" NOT NULL,
    "answer_ms" integer NOT NULL,
    "active_accounts" smallint NOT NULL,
    "ip_hash" "text" NOT NULL,
    "delayed" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "settled_at" timestamp with time zone,
    CONSTRAINT "card_grants_mode_check" CHECK (("mode" = ANY (ARRAY['classic'::"text", 'qcm'::"text"]))),
    CONSTRAINT "card_grants_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'granted'::"text", 'lost'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."card_grants" OWNER TO "postgres";


ALTER TABLE "public"."card_grants" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."card_grants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."card_set_items" (
    "set_id" "uuid" NOT NULL,
    "card_id" "uuid" NOT NULL
);


ALTER TABLE "public"."card_set_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "text" NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "cover_url" "text",
    "card_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "card_sets_kind_check" CHECK (("kind" = ANY (ARRAY['artist'::"text", 'album'::"text", 'theme'::"text"])))
);


ALTER TABLE "public"."card_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_signals" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "grant_id" bigint,
    "reason" "text" NOT NULL,
    "details" "jsonb",
    "reviewed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."card_signals" OWNER TO "postgres";


ALTER TABLE "public"."card_signals" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."card_signals_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" integer NOT NULL,
    "deezer_track_id" bigint NOT NULL,
    "artist_id" bigint NOT NULL,
    "album_id" bigint,
    "title_key" "text" NOT NULL,
    "title" "text" NOT NULL,
    "artist" "text" NOT NULL,
    "year" smallint,
    "isrc" "text",
    "deezer_rank" integer NOT NULL,
    "rarity" "text" NOT NULL,
    "rarity_scale" smallint DEFAULT 1 NOT NULL,
    "rarity_locked_at" timestamp with time zone,
    "first_owner_id" "uuid",
    "first_owned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cards_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'uncommon'::"text", 'rare'::"text", 'epic'::"text", 'legendary'::"text", 'mythic'::"text"])))
);


ALTER TABLE "public"."cards" OWNER TO "postgres";


ALTER TABLE "public"."cards" ALTER COLUMN "number" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cards_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."custom_playlist_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "artist" "text",
    "title" "text",
    "preview_url" "text",
    "cover_url" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "external_id" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_artist" "text",
    "custom_title" "text",
    "custom_feats" "text"[],
    "preview_expires_at" timestamp with time zone,
    "track_id" "uuid" NOT NULL
);


ALTER TABLE "public"."custom_playlist_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "emoji" "text" DEFAULT '🎵'::"text" NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "track_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_official" boolean DEFAULT false NOT NULL,
    "linked_room_id" "text"
);


ALTER TABLE "public"."custom_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_songs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "track_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_songs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" bigint NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "follows_check" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


ALTER TABLE "public"."follows" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."follows_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" bigint NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "addressee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "friendships_check" CHECK (("requester_id" <> "addressee_id")),
    CONSTRAINT "friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text"])))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


ALTER TABLE "public"."friendships" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."friendships_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."game_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "username" "text" NOT NULL,
    "score" integer NOT NULL,
    "rank" integer NOT NULL,
    "total_players" integer NOT NULL,
    "room_name" "text" NOT NULL,
    "room_emoji" "text",
    "achievement_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."game_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_once" (
    "key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_once" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "actor_id" "uuid",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['friend_request'::"text", 'friend_accept'::"text", 'room_invite'::"text", 'card_up'::"text", 'card_mythic'::"text", 'card_set_near'::"text", 'announcement'::"text", 'news'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


ALTER TABLE "public"."notifications" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pro_subscriptions" (
    "user_id" "uuid" NOT NULL,
    "plan" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stripe_last_session" "text",
    CONSTRAINT "pro_subscriptions_plan_check" CHECK (("plan" = ANY (ARRAY['night'::"text", 'monthly'::"text", 'yearly'::"text", 'manual'::"text"]))),
    CONSTRAINT "pro_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text"])))
);


ALTER TABLE "public"."pro_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "xp" integer DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "elo" integer DEFAULT 1000 NOT NULL,
    "games_played" integer DEFAULT 0 NOT NULL,
    "total_score" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "best_streak" integer DEFAULT 0 NOT NULL,
    "last_played_date" "date",
    "win_streak" integer DEFAULT 0 NOT NULL,
    "best_win_streak" integer DEFAULT 0 NOT NULL,
    "featured_achievements" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "discord_id" "text",
    "discord_username" "text",
    "discord_avatar" "text",
    "discord_games_played" integer DEFAULT 0 NOT NULL,
    "notif_prefs" "jsonb" DEFAULT '{"cards": true, "zikle": false, "social": true, "updates": true, "challenge": true}'::"jsonb" NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prospect_replies" (
    "id" bigint NOT NULL,
    "prospect_id" bigint,
    "message_id" "text" NOT NULL,
    "received_at" timestamp with time zone NOT NULL,
    "from_email" "text" NOT NULL,
    "subject" "text",
    "excerpt" "text",
    "category" "text",
    "summary" "text",
    "suggested_reply" "text",
    "handled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prospect_replies_category_check" CHECK (("category" = ANY (ARRAY['stop'::"text", 'interested'::"text", 'question'::"text", 'feedback'::"text", 'not_interested'::"text", 'bounce'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."prospect_replies" OWNER TO "postgres";


ALTER TABLE "public"."prospect_replies" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."prospect_replies_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."prospects" (
    "id" bigint NOT NULL,
    "osm_id" "text",
    "kind" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "website" "text",
    "city" "text",
    "postcode" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "message_id" "text",
    "first_sent_at" timestamp with time zone,
    "followup_sent_at" timestamp with time zone,
    "replied_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prospects_kind_check" CHECK (("kind" = ANY (ARRAY['bar'::"text", 'camping'::"text", 'association'::"text"]))),
    CONSTRAINT "prospects_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'sent'::"text", 'followed_up'::"text", 'replied'::"text", 'interested'::"text", 'unsubscribed'::"text", 'bounced'::"text"])))
);


ALTER TABLE "public"."prospects" OWNER TO "postgres";


ALTER TABLE "public"."prospects" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."prospects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_success_at" timestamp with time zone
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reporter_id" "uuid",
    "reporter_name" "text",
    "reporter_email" "text",
    "reported_user_id" "uuid",
    "reported_username" "text",
    "room_id" "text",
    "subject" "text",
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "admin_note" "text",
    "admin_reply" "text",
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text", 'dismissed'::"text"]))),
    CONSTRAINT "reports_type_check" CHECK (("type" = ANY (ARRAY['bug'::"text", 'user'::"text", 'contact'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_playlists" (
    "room_id" "uuid" NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."room_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "emoji" "text" DEFAULT '🎵'::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "owner_id" "uuid" NOT NULL,
    "playlist_id" "uuid",
    "is_public" boolean DEFAULT true NOT NULL,
    "max_rounds" integer DEFAULT 10 NOT NULL,
    "round_duration" integer DEFAULT 30 NOT NULL,
    "break_duration" integer DEFAULT 7 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_active_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_official" boolean DEFAULT false NOT NULL,
    "auto_start" boolean DEFAULT false NOT NULL,
    "game_mode" "text" DEFAULT 'classic'::"text" NOT NULL,
    CONSTRAINT "rooms_break_duration_check" CHECK ((("break_duration" >= 3) AND ("break_duration" <= 15))),
    CONSTRAINT "rooms_game_mode_check" CHECK (("game_mode" = ANY (ARRAY['classic'::"text", 'qcm'::"text"]))),
    CONSTRAINT "rooms_max_rounds_check" CHECK ((("max_rounds" >= 3) AND ("max_rounds" <= 50))),
    CONSTRAINT "rooms_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 60))),
    CONSTRAINT "rooms_round_duration_check" CHECK ((("round_duration" >= 10) AND ("round_duration" <= 60)))
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."salon_players" (
    "id" bigint NOT NULL,
    "game_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "username" "text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "rank" integer,
    "team" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."salon_players" OWNER TO "postgres";


ALTER TABLE "public"."salon_players" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."salon_players_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."track_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "track_id" "uuid" NOT NULL,
    "answer_type_id" integer NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."track_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."track_issues" (
    "id" bigint NOT NULL,
    "track_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "source" "text" NOT NULL,
    "note" "text",
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "count" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "track_issues_kind_check" CHECK (("kind" = ANY (ARRAY['video'::"text", 'audio'::"text", 'answer'::"text"]))),
    CONSTRAINT "track_issues_source_check" CHECK (("source" = ANY (ARRAY['auto'::"text", 'host'::"text", 'player'::"text"]))),
    CONSTRAINT "track_issues_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'fixed'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."track_issues" OWNER TO "postgres";


ALTER TABLE "public"."track_issues" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."track_issues_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."track_stats" (
    "track_id" "uuid" NOT NULL,
    "rounds_played" integer DEFAULT 0 NOT NULL,
    "players_exposed" integer DEFAULT 0 NOT NULL,
    "found_full" integer DEFAULT 0 NOT NULL,
    "last_played_at" timestamp with time zone
);


ALTER TABLE "public"."track_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist" "text" NOT NULL,
    "title" "text" NOT NULL,
    "norm_key" "text" GENERATED ALWAYS AS ((("lower"("btrim"("artist")) || '|'::"text") || "lower"("btrim"("title")))) STORED,
    "preview_url" "text",
    "preview_expires_at" timestamp with time zone,
    "cover_url" "text",
    "external_id" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "youtube_id" "text",
    "card_id" "uuid",
    "card_checked_at" timestamp with time zone,
    "youtube_start" integer,
    "video_cache_id" "text",
    "video_cache_duration" integer,
    "video_cache_at" timestamp with time zone,
    CONSTRAINT "tracks_youtube_start_check" CHECK ((("youtube_start" IS NULL) OR ("youtube_start" >= 0)))
);


ALTER TABLE "public"."tracks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tracks"."youtube_id" IS 'Identifiant de vidéo YouTube épinglé manuellement. Quand il est renseigné, le jeu l''utilise directement au lieu de chercher via ytsearch.';



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "tier" "text",
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "count" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_card_sets" (
    "user_id" "uuid" NOT NULL,
    "set_id" "uuid" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_card_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_cards" (
    "user_id" "uuid" NOT NULL,
    "card_id" "uuid" NOT NULL,
    "copies" integer DEFAULT 1 NOT NULL,
    "first_obtained_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_obtained_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visible_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_cards_copies_check" CHECK (("copies" >= 1))
);


ALTER TABLE "public"."user_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visit_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" NOT NULL,
    "medium" "text" NOT NULL,
    "campaign" "text",
    "referrer_host" "text",
    "landing_path" "text"
);


ALTER TABLE "public"."visit_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_start" "date" NOT NULL,
    "week_end" "date" NOT NULL,
    "type" "text" NOT NULL,
    "target" integer NOT NULL,
    "current_value" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "top_contributor_id" "uuid",
    "top_contributor_amount" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    CONSTRAINT "weekly_challenges_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'success'::"text", 'failed'::"text"]))),
    CONSTRAINT "weekly_challenges_target_check" CHECK (("target" > 0)),
    CONSTRAINT "weekly_challenges_type_check" CHECK (("type" = ANY (ARRAY['correct_answers'::"text", 'games_played'::"text", 'zikle_wins'::"text", 'cards_won'::"text"])))
);


ALTER TABLE "public"."weekly_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zikle_pool" (
    "track_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."zikle_pool" OWNER TO "postgres";


ALTER TABLE ONLY "public"."answer_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."answer_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answer_types"
    ADD CONSTRAINT "answer_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."answer_types"
    ADD CONSTRAINT "answer_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_albums"
    ADD CONSTRAINT "card_albums_pkey" PRIMARY KEY ("deezer_id");



ALTER TABLE ONLY "public"."card_artists"
    ADD CONSTRAINT "card_artists_pkey" PRIMARY KEY ("deezer_id");



ALTER TABLE ONLY "public"."card_grants"
    ADD CONSTRAINT "card_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_set_items"
    ADD CONSTRAINT "card_set_items_pkey" PRIMARY KEY ("set_id", "card_id");



ALTER TABLE ONLY "public"."card_sets"
    ADD CONSTRAINT "card_sets_kind_key_key" UNIQUE ("kind", "key");



ALTER TABLE ONLY "public"."card_sets"
    ADD CONSTRAINT "card_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_signals"
    ADD CONSTRAINT "card_signals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_artist_id_title_key_key" UNIQUE ("artist_id", "title_key");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_number_key" UNIQUE ("number");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_playlist_tracks"
    ADD CONSTRAINT "custom_playlist_tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_playlist_tracks"
    ADD CONSTRAINT "custom_playlist_tracks_playlist_track_uniq" UNIQUE ("playlist_id", "track_id");



ALTER TABLE ONLY "public"."custom_playlists"
    ADD CONSTRAINT "custom_playlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_results"
    ADD CONSTRAINT "daily_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_results"
    ADD CONSTRAINT "daily_results_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."daily_songs"
    ADD CONSTRAINT "daily_songs_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."daily_songs"
    ADD CONSTRAINT "daily_songs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_id_addressee_id_key" UNIQUE ("requester_id", "addressee_id");



ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_results"
    ADD CONSTRAINT "game_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_once"
    ADD CONSTRAINT "notification_once_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pro_subscriptions"
    ADD CONSTRAINT "pro_subscriptions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_discord_id_key" UNIQUE ("discord_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."prospect_replies"
    ADD CONSTRAINT "prospect_replies_message_id_key" UNIQUE ("message_id");



ALTER TABLE ONLY "public"."prospect_replies"
    ADD CONSTRAINT "prospect_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prospects"
    ADD CONSTRAINT "prospects_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."prospects"
    ADD CONSTRAINT "prospects_osm_id_key" UNIQUE ("osm_id");



ALTER TABLE ONLY "public"."prospects"
    ADD CONSTRAINT "prospects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_playlists"
    ADD CONSTRAINT "room_playlists_pkey" PRIMARY KEY ("room_id", "playlist_id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."salon_players"
    ADD CONSTRAINT "salon_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."track_answers"
    ADD CONSTRAINT "track_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."track_issues"
    ADD CONSTRAINT "track_issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."track_stats"
    ADD CONSTRAINT "track_stats_pkey" PRIMARY KEY ("track_id");



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_norm_key_unique" UNIQUE ("norm_key");



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_tier_key" UNIQUE NULLS NOT DISTINCT ("user_id", "achievement_id", "tier");



ALTER TABLE ONLY "public"."user_card_sets"
    ADD CONSTRAINT "user_card_sets_pkey" PRIMARY KEY ("user_id", "set_id");



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_pkey" PRIMARY KEY ("user_id", "card_id");



ALTER TABLE ONLY "public"."visit_sources"
    ADD CONSTRAINT "visit_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_challenge_contributions"
    ADD CONSTRAINT "weekly_challenge_contributions_challenge_id_user_id_key" UNIQUE ("challenge_id", "user_id");



ALTER TABLE ONLY "public"."weekly_challenge_contributions"
    ADD CONSTRAINT "weekly_challenge_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_challenges"
    ADD CONSTRAINT "weekly_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_challenges"
    ADD CONSTRAINT "weekly_challenges_week_start_key" UNIQUE ("week_start");



ALTER TABLE ONLY "public"."zikle_pool"
    ADD CONSTRAINT "zikle_pool_pkey" PRIMARY KEY ("track_id");



CREATE INDEX "card_albums_artist_idx" ON "public"."card_albums" USING "btree" ("artist_id");



CREATE INDEX "card_grants_card_idx" ON "public"."card_grants" USING "btree" ("card_id");



CREATE INDEX "card_grants_game_idx" ON "public"."card_grants" USING "btree" ("game_id");



CREATE INDEX "card_grants_pending_idx" ON "public"."card_grants" USING "btree" ("user_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "card_grants_user_idx" ON "public"."card_grants" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "card_set_items_card_idx" ON "public"."card_set_items" USING "btree" ("card_id");



CREATE INDEX "card_signals_grant_idx" ON "public"."card_signals" USING "btree" ("grant_id");



CREATE INDEX "card_signals_open_idx" ON "public"."card_signals" USING "btree" ("created_at" DESC) WHERE (NOT "reviewed");



CREATE INDEX "card_signals_user_idx" ON "public"."card_signals" USING "btree" ("user_id");



CREATE INDEX "cards_album_idx" ON "public"."cards" USING "btree" ("album_id");



CREATE INDEX "cards_first_owner_idx" ON "public"."cards" USING "btree" ("first_owner_id");



CREATE INDEX "cards_provisional_idx" ON "public"."cards" USING "btree" ("created_at") WHERE ("rarity_locked_at" IS NULL);



CREATE INDEX "cards_rarity_idx" ON "public"."cards" USING "btree" ("rarity");



CREATE INDEX "custom_playlist_tracks_track_id_idx" ON "public"."custom_playlist_tracks" USING "btree" ("track_id");



CREATE INDEX "follows_follower_idx" ON "public"."follows" USING "btree" ("follower_id");



CREATE INDEX "follows_following_idx" ON "public"."follows" USING "btree" ("following_id");



CREATE INDEX "friendships_addressee_idx" ON "public"."friendships" USING "btree" ("addressee_id");



CREATE INDEX "friendships_requester_idx" ON "public"."friendships" USING "btree" ("requester_id");



CREATE INDEX "games_host_idx" ON "public"."games" USING "btree" ("host_id") WHERE ("host_id" IS NOT NULL);



CREATE INDEX "idx_cpt_playlist" ON "public"."custom_playlist_tracks" USING "btree" ("playlist_id");



CREATE INDEX "idx_custom_playlists_linked_room" ON "public"."custom_playlists" USING "btree" ("linked_room_id") WHERE ("is_official" = true);



CREATE INDEX "idx_custom_playlists_owner" ON "public"."custom_playlists" USING "btree" ("owner_id");



CREATE INDEX "idx_daily_results_date" ON "public"."daily_results" USING "btree" ("date");



CREATE INDEX "idx_game_players_game" ON "public"."game_players" USING "btree" ("game_id");



CREATE INDEX "idx_game_players_user" ON "public"."game_players" USING "btree" ("user_id");



CREATE INDEX "idx_games_room" ON "public"."games" USING "btree" ("room_id");



CREATE INDEX "idx_profiles_elo" ON "public"."profiles" USING "btree" ("elo" DESC);



CREATE INDEX "idx_push_subscriptions_user" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_user_achievements_user" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "idx_wcc_challenge_amount" ON "public"."weekly_challenge_contributions" USING "btree" ("challenge_id", "amount" DESC);



CREATE INDEX "idx_weekly_challenges_week_start" ON "public"."weekly_challenges" USING "btree" ("week_start" DESC);



CREATE INDEX "notifications_user_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "prospect_replies_handled_idx" ON "public"."prospect_replies" USING "btree" ("handled", "received_at" DESC);



CREATE INDEX "prospects_status_kind_idx" ON "public"."prospects" USING "btree" ("status", "kind");



CREATE INDEX "reports_created_at_idx" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "reports_status_idx" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "reports_type_idx" ON "public"."reports" USING "btree" ("type");



CREATE INDEX "room_playlists_room_id_idx" ON "public"."room_playlists" USING "btree" ("room_id");



CREATE INDEX "rooms_official_idx" ON "public"."rooms" USING "btree" ("is_official") WHERE ("is_official" = true);



CREATE INDEX "rooms_owner_idx" ON "public"."rooms" USING "btree" ("owner_id");



CREATE INDEX "rooms_public_idx" ON "public"."rooms" USING "btree" ("is_public", "last_active_at" DESC) WHERE ("is_public" = true);



CREATE INDEX "salon_players_game_idx" ON "public"."salon_players" USING "btree" ("game_id");



CREATE INDEX "salon_players_user_idx" ON "public"."salon_players" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "track_answers_track_id_idx" ON "public"."track_answers" USING "btree" ("track_id");



CREATE UNIQUE INDEX "track_issues_open_idx" ON "public"."track_issues" USING "btree" ("track_id", "kind") WHERE ("status" = 'open'::"text");



CREATE INDEX "tracks_card_idx" ON "public"."tracks" USING "btree" ("card_id");



CREATE INDEX "tracks_card_unchecked_idx" ON "public"."tracks" USING "btree" ("id") WHERE ("card_checked_at" IS NULL);



CREATE INDEX "user_card_sets_set_idx" ON "public"."user_card_sets" USING "btree" ("set_id");



CREATE INDEX "user_cards_card_idx" ON "public"."user_cards" USING "btree" ("card_id");



CREATE INDEX "user_cards_user_date_idx" ON "public"."user_cards" USING "btree" ("user_id", "first_obtained_at" DESC);



CREATE INDEX "visit_sources_created_at_idx" ON "public"."visit_sources" USING "btree" ("created_at" DESC);



CREATE OR REPLACE TRIGGER "cards_attach_sets" AFTER INSERT ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."cards_after_insert"();



CREATE OR REPLACE TRIGGER "custom_playlists_updated_at" BEFORE UPDATE ON "public"."custom_playlists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "rooms_auto_code" BEFORE INSERT ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."rooms_before_insert"();



CREATE OR REPLACE TRIGGER "trg_playlist_track_count" AFTER INSERT OR DELETE ON "public"."custom_playlist_tracks" FOR EACH ROW EXECUTE FUNCTION "public"."update_playlist_track_count"();



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."card_albums"
    ADD CONSTRAINT "card_albums_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."card_artists"("deezer_id");



ALTER TABLE ONLY "public"."card_grants"
    ADD CONSTRAINT "card_grants_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_grants"
    ADD CONSTRAINT "card_grants_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."card_grants"
    ADD CONSTRAINT "card_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_set_items"
    ADD CONSTRAINT "card_set_items_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_set_items"
    ADD CONSTRAINT "card_set_items_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."card_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_signals"
    ADD CONSTRAINT "card_signals_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "public"."card_grants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_signals"
    ADD CONSTRAINT "card_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."card_albums"("deezer_id");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."card_artists"("deezer_id");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_first_owner_id_fkey" FOREIGN KEY ("first_owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_playlist_tracks"
    ADD CONSTRAINT "custom_playlist_tracks_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."custom_playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_playlist_tracks"
    ADD CONSTRAINT "custom_playlist_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id");



ALTER TABLE ONLY "public"."custom_playlists"
    ADD CONSTRAINT "custom_playlists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_results"
    ADD CONSTRAINT "daily_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_songs"
    ADD CONSTRAINT "daily_songs_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "game_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."game_results"
    ADD CONSTRAINT "game_results_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_results"
    ADD CONSTRAINT "game_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pro_subscriptions"
    ADD CONSTRAINT "pro_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prospect_replies"
    ADD CONSTRAINT "prospect_replies_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."room_playlists"
    ADD CONSTRAINT "room_playlists_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."custom_playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_playlists"
    ADD CONSTRAINT "room_playlists_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."custom_playlists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."salon_players"
    ADD CONSTRAINT "salon_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."salon_players"
    ADD CONSTRAINT "salon_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."track_answers"
    ADD CONSTRAINT "track_answers_answer_type_id_fkey" FOREIGN KEY ("answer_type_id") REFERENCES "public"."answer_types"("id");



ALTER TABLE ONLY "public"."track_answers"
    ADD CONSTRAINT "track_answers_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."custom_playlist_tracks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."track_issues"
    ADD CONSTRAINT "track_issues_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."track_stats"
    ADD CONSTRAINT "track_stats_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_sets"
    ADD CONSTRAINT "user_card_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."card_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_sets"
    ADD CONSTRAINT "user_card_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_challenge_contributions"
    ADD CONSTRAINT "weekly_challenge_contributions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."weekly_challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_challenge_contributions"
    ADD CONSTRAINT "weekly_challenge_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_challenges"
    ADD CONSTRAINT "weekly_challenges_top_contributor_id_fkey" FOREIGN KEY ("top_contributor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."zikle_pool"
    ADD CONSTRAINT "zikle_pool_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE CASCADE;



CREATE POLICY "Game players insérables par tous" ON "public"."game_players" FOR INSERT WITH CHECK (true);



CREATE POLICY "Game players lisibles par tous" ON "public"."game_players" FOR SELECT USING (true);



CREATE POLICY "Game players modifiables par tous" ON "public"."game_players" FOR UPDATE USING (true);



CREATE POLICY "Games créables par tous" ON "public"."games" FOR INSERT WITH CHECK (true);



CREATE POLICY "Games lisibles par tous" ON "public"."games" FOR SELECT USING (true);



CREATE POLICY "Games modifiables par tous" ON "public"."games" FOR UPDATE USING (true);



CREATE POLICY "Profil modifiable par son propriétaire" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Profiles lisibles par tous" ON "public"."profiles" FOR SELECT USING (true);



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "achievements_select" ON "public"."achievements" FOR SELECT USING (true);



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."answer_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "answer_types_read" ON "public"."answer_types" FOR SELECT USING (true);



ALTER TABLE "public"."card_albums" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "card_albums_select" ON "public"."card_albums" FOR SELECT USING (true);



ALTER TABLE "public"."card_artists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "card_artists_select" ON "public"."card_artists" FOR SELECT USING (true);



ALTER TABLE "public"."card_grants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."card_set_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "card_set_items_select" ON "public"."card_set_items" FOR SELECT USING (true);



ALTER TABLE "public"."card_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "card_sets_select" ON "public"."card_sets" FOR SELECT USING (true);



ALTER TABLE "public"."card_signals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cards_select" ON "public"."cards" FOR SELECT USING (true);



ALTER TABLE "public"."custom_playlist_tracks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_playlists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_playlists_delete" ON "public"."custom_playlists" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "custom_playlists_insert" ON "public"."custom_playlists" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "custom_playlists_select" ON "public"."custom_playlists" FOR SELECT USING ((("auth"."uid"() = "owner_id") OR ("is_public" = true) OR ("is_official" = true)));



CREATE POLICY "custom_playlists_update" ON "public"."custom_playlists" FOR UPDATE USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."daily_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_results_select_own" ON "public"."daily_results" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."daily_songs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "follows_delete_own" ON "public"."follows" FOR DELETE USING (("follower_id" = "auth"."uid"()));



CREATE POLICY "follows_insert_own" ON "public"."follows" FOR INSERT WITH CHECK (("follower_id" = "auth"."uid"()));



CREATE POLICY "follows_select_all" ON "public"."follows" FOR SELECT USING (true);



ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "friendships_delete_own" ON "public"."friendships" FOR DELETE USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "friendships_insert_own" ON "public"."friendships" FOR INSERT WITH CHECK (("requester_id" = "auth"."uid"()));



CREATE POLICY "friendships_select_all" ON "public"."friendships" FOR SELECT USING (true);



CREATE POLICY "friendships_update_addressee" ON "public"."friendships" FOR UPDATE USING (("addressee_id" = "auth"."uid"()));



ALTER TABLE "public"."game_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "game_results_select" ON "public"."game_results" FOR SELECT USING (true);



ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "no delete" ON "public"."admin_audit_log" FOR DELETE USING (false);



CREATE POLICY "no update" ON "public"."admin_audit_log" FOR UPDATE USING (false);



ALTER TABLE "public"."notification_once" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "owners_manage_track_answers" ON "public"."track_answers" USING ((EXISTS ( SELECT 1
   FROM ("public"."custom_playlist_tracks" "cpt"
     JOIN "public"."custom_playlists" "cp" ON (("cp"."id" = "cpt"."playlist_id")))
  WHERE (("cpt"."id" = "track_answers"."track_id") AND ("cp"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."custom_playlist_tracks" "cpt"
     JOIN "public"."custom_playlists" "cp" ON (("cp"."id" = "cpt"."playlist_id")))
  WHERE (("cpt"."id" = "track_answers"."track_id") AND ("cp"."owner_id" = "auth"."uid"())))));



CREATE POLICY "playlist_tracks_delete" ON "public"."custom_playlist_tracks" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."custom_playlists" "p"
  WHERE (("p"."id" = "custom_playlist_tracks"."playlist_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "playlist_tracks_insert" ON "public"."custom_playlist_tracks" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."custom_playlists" "p"
  WHERE (("p"."id" = "custom_playlist_tracks"."playlist_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "playlist_tracks_select" ON "public"."custom_playlist_tracks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."custom_playlists" "p"
  WHERE (("p"."id" = "custom_playlist_tracks"."playlist_id") AND (("p"."owner_id" = "auth"."uid"()) OR ("p"."is_public" = true) OR ("p"."is_official" = true) OR (EXISTS ( SELECT 1
           FROM "public"."rooms" "r"
          WHERE ("r"."playlist_id" = "p"."id"))))))));



CREATE POLICY "playlist_tracks_update" ON "public"."custom_playlist_tracks" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."custom_playlists" "p"
  WHERE (("p"."id" = "custom_playlist_tracks"."playlist_id") AND ("p"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."pro_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pro_subscriptions_select_own" ON "public"."pro_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prospect_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prospects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_read_track_answers" ON "public"."track_answers" FOR SELECT USING (true);



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_insert" ON "public"."reports" FOR INSERT WITH CHECK (true);



CREATE POLICY "reports_select_admin" ON "public"."reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "reports_update_admin" ON "public"."reports" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



ALTER TABLE "public"."room_playlists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_playlists_delete" ON "public"."room_playlists" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."rooms" "r"
  WHERE (("r"."id" = "room_playlists"."room_id") AND ("r"."owner_id" = "auth"."uid"())))));



CREATE POLICY "room_playlists_insert" ON "public"."room_playlists" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rooms" "r"
  WHERE (("r"."id" = "room_playlists"."room_id") AND ("r"."owner_id" = "auth"."uid"())))));



CREATE POLICY "room_playlists_select" ON "public"."room_playlists" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rooms" "r"
  WHERE (("r"."id" = "room_playlists"."room_id") AND (("r"."is_public" = true) OR ("r"."is_official" = true) OR ("r"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rooms_delete" ON "public"."rooms" FOR DELETE USING ((("auth"."uid"() = "owner_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text"))))));



CREATE POLICY "rooms_insert" ON "public"."rooms" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "rooms_select_official" ON "public"."rooms" FOR SELECT USING (("is_official" = true));



CREATE POLICY "rooms_select_public" ON "public"."rooms" FOR SELECT USING ((("is_public" = true) OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "rooms_select_superadmin" ON "public"."rooms" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "rooms_update" ON "public"."rooms" FOR UPDATE USING ((("auth"."uid"() = "owner_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text"))))));



ALTER TABLE "public"."salon_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_settings_select" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "super_admin_update_playlists" ON "public"."custom_playlists" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



ALTER TABLE "public"."track_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "track_answers_read" ON "public"."track_answers" FOR SELECT USING (true);



CREATE POLICY "track_answers_write" ON "public"."track_answers" USING ((EXISTS ( SELECT 1
   FROM ("public"."custom_playlist_tracks" "cpt"
     JOIN "public"."custom_playlists" "cp" ON (("cp"."id" = "cpt"."playlist_id")))
  WHERE (("cpt"."id" = "track_answers"."track_id") AND ("cp"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."custom_playlist_tracks" "cpt"
     JOIN "public"."custom_playlists" "cp" ON (("cp"."id" = "cpt"."playlist_id")))
  WHERE (("cpt"."id" = "track_answers"."track_id") AND ("cp"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."track_issues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."track_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "track_stats_select" ON "public"."track_stats" FOR SELECT USING (true);



ALTER TABLE "public"."tracks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tracks_select_public" ON "public"."tracks" FOR SELECT USING (true);



ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_achievements_select" ON "public"."user_achievements" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "pr"
  WHERE (("pr"."id" = "user_achievements"."user_id") AND ("pr"."is_private" = false))))));



ALTER TABLE "public"."user_card_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_card_sets_select" ON "public"."user_card_sets" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "user_card_sets"."user_id") AND ("p"."is_private" = false))))));



ALTER TABLE "public"."user_cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_cards_select" ON "public"."user_cards" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("visible_at" <= "now"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "user_cards"."user_id") AND ("p"."is_private" = false)))))));



ALTER TABLE "public"."visit_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_challenge_contributions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "weekly_challenge_contributions_select" ON "public"."weekly_challenge_contributions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "pr"
  WHERE (("pr"."id" = "weekly_challenge_contributions"."user_id") AND ("pr"."is_private" = false))))));



ALTER TABLE "public"."weekly_challenges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "weekly_challenges_select" ON "public"."weekly_challenges" FOR SELECT USING (true);



ALTER TABLE "public"."zikle_pool" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."custom_playlist_tracks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."custom_playlists";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."game_players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."games";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."rooms";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."admin_active_players_per_day"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_active_players_per_day"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_activity_breakdown"("p_weeks" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_activity_breakdown"("p_weeks" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_at_risk_users"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_at_risk_users"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_broadcast_notification"("p_type" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_broadcast_notification"("p_type" "text", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_churn_summary"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_churn_summary"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_dau_wau_mau"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_dau_wau_mau"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_games_per_day"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_games_per_day"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_guest_ratio_7d"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_guest_ratio_7d"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_pulse"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_pulse"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_retention_cohorts"("p_activity" "text", "p_weeks" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_retention_cohorts"("p_activity" "text", "p_weeks" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_retention_j7"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_retention_j7"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_retention_levers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_retention_levers"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_return_frequency"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_return_frequency"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_return_gap"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_return_gap"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_schedule_weekly_challenge"("p_week_start" "date", "p_type" "text", "p_target" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_schedule_weekly_challenge"("p_week_start" "date", "p_type" "text", "p_target" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_signups_per_day"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_signups_per_day"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_site_totals"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_site_totals"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_traffic_daily"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_traffic_daily"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_traffic_landings"("p_days" integer, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_traffic_landings"("p_days" integer, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_traffic_sources"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_traffic_sources"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_weekly_kpis"("p_weeks" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_weekly_kpis"("p_weeks" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_zikle_7d"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_zikle_7d"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_zikle_per_day"("p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_zikle_per_day"("p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_zikle_today"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_zikle_today"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."attach_card_to_sets"("p_card_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."attach_card_to_sets"("p_card_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."card_settle"("p_user_id" "uuid", "p_grant_ids" bigint[], "p_keep" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."card_settle"("p_user_id" "uuid", "p_grant_ids" bigint[], "p_keep" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cards_after_insert"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cards_after_insert"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cards_collectors"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cards_collectors"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cards_leaderboard"("p_offset" integer, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cards_leaderboard"("p_offset" integer, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cards_leaderboard_my_rank"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cards_leaderboard_my_rank"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cards_showcase"("p_user_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cards_showcase"("p_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."count_active_players_7d"() TO "anon";
GRANT ALL ON FUNCTION "public"."count_active_players_7d"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_active_players_7d"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_room_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_room_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_room_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_covers_by_playlists"("pids" "uuid"[], "max_per_playlist" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_covers_by_playlists"("pids" "uuid"[], "max_per_playlist" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_covers_by_playlists"("pids" "uuid"[], "max_per_playlist" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_weekly_challenge"("p_type" "text", "p_user_id" "uuid", "p_amount" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_weekly_challenge"("p_type" "text", "p_user_id" "uuid", "p_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."leaderboard_score"("p_mode" "text", "p_rooms" "text", "p_period" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."leaderboard_score"("p_mode" "text", "p_rooms" "text", "p_period" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."leaderboard_score"("p_mode" "text", "p_rooms" "text", "p_period" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."leaderboard_score_my_rank"("p_user_id" "uuid", "p_mode" "text", "p_rooms" "text", "p_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."leaderboard_score_my_rank"("p_user_id" "uuid", "p_mode" "text", "p_rooms" "text", "p_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leaderboard_score_my_rank"("p_user_id" "uuid", "p_mode" "text", "p_rooms" "text", "p_period" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."pick_daily_song"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pick_daily_song"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."pick_weekly_challenge"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pick_weekly_challenge"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_round_stats"("p_track_id" "uuid", "p_exposed" integer, "p_found" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_round_stats"("p_track_id" "uuid", "p_exposed" integer, "p_found" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."report_track_issue"("p_track" "uuid", "p_kind" "text", "p_source" "text", "p_note" "text", "p_context" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."report_track_issue"("p_track" "uuid", "p_kind" "text", "p_source" "text", "p_note" "text", "p_context" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_tracks"("p_tracks" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_tracks"("p_tracks" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rooms_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."rooms_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rooms_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_discord_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_discord_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_discord_identity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_player_stats"("p_user_id" "uuid", "p_score" integer, "p_rank" integer, "p_total_players" integer, "p_elo_change" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_player_stats"("p_user_id" "uuid", "p_score" integer, "p_rank" integer, "p_total_players" integer, "p_elo_change" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_player_stats_discord"("p_user_id" "uuid", "p_score" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_player_stats_discord"("p_user_id" "uuid", "p_score" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_player_streaks"("p_user_id" "uuid", "p_won" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_player_streaks"("p_user_id" "uuid", "p_won" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_playlist_track_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_playlist_track_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_playlist_track_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."weekly_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."weekly_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."weekly_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."weekly_leaderboard_by_room"("p_room_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."weekly_leaderboard_by_room"("p_room_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."weekly_leaderboard_by_room"("p_room_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."zikle_complete"("p_user_id" "uuid", "p_date" "date", "p_attempts" integer, "p_won" boolean, "p_solve_time_seconds" integer, "p_guesses" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."zikle_complete"("p_user_id" "uuid", "p_date" "date", "p_attempts" integer, "p_won" boolean, "p_solve_time_seconds" integer, "p_guesses" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."zikle_leaderboard"("p_date" "date", "p_user_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."zikle_leaderboard"("p_date" "date", "p_user_id" "uuid", "p_limit" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."daily_results" TO "anon";
GRANT ALL ON TABLE "public"."daily_results" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_results" TO "service_role";



GRANT ALL ON TABLE "public"."game_players" TO "anon";
GRANT ALL ON TABLE "public"."game_players" TO "authenticated";
GRANT ALL ON TABLE "public"."game_players" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_challenge_contributions" TO "anon";
GRANT ALL ON TABLE "public"."weekly_challenge_contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_challenge_contributions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_user_activity" TO "service_role";



GRANT ALL ON TABLE "public"."answer_types" TO "anon";
GRANT ALL ON TABLE "public"."answer_types" TO "authenticated";
GRANT ALL ON TABLE "public"."answer_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."answer_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."answer_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."answer_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."card_albums" TO "anon";
GRANT ALL ON TABLE "public"."card_albums" TO "authenticated";
GRANT ALL ON TABLE "public"."card_albums" TO "service_role";



GRANT ALL ON TABLE "public"."card_artists" TO "anon";
GRANT ALL ON TABLE "public"."card_artists" TO "authenticated";
GRANT ALL ON TABLE "public"."card_artists" TO "service_role";



GRANT ALL ON TABLE "public"."card_grants" TO "anon";
GRANT ALL ON TABLE "public"."card_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."card_grants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."card_grants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."card_grants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."card_grants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."card_set_items" TO "anon";
GRANT ALL ON TABLE "public"."card_set_items" TO "authenticated";
GRANT ALL ON TABLE "public"."card_set_items" TO "service_role";



GRANT ALL ON TABLE "public"."card_sets" TO "anon";
GRANT ALL ON TABLE "public"."card_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."card_sets" TO "service_role";



GRANT ALL ON TABLE "public"."card_signals" TO "anon";
GRANT ALL ON TABLE "public"."card_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."card_signals" TO "service_role";



GRANT ALL ON SEQUENCE "public"."card_signals_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."card_signals_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."card_signals_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cards" TO "anon";
GRANT ALL ON TABLE "public"."cards" TO "authenticated";
GRANT ALL ON TABLE "public"."cards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cards_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cards_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cards_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."custom_playlist_tracks" TO "anon";
GRANT ALL ON TABLE "public"."custom_playlist_tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_playlist_tracks" TO "service_role";



GRANT ALL ON TABLE "public"."custom_playlists" TO "anon";
GRANT ALL ON TABLE "public"."custom_playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_playlists" TO "service_role";



GRANT ALL ON TABLE "public"."daily_songs" TO "anon";
GRANT ALL ON TABLE "public"."daily_songs" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_songs" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON SEQUENCE "public"."follows_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."follows_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."follows_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON SEQUENCE "public"."friendships_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."friendships_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."friendships_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."game_results" TO "anon";
GRANT ALL ON TABLE "public"."game_results" TO "authenticated";
GRANT ALL ON TABLE "public"."game_results" TO "service_role";



GRANT ALL ON TABLE "public"."notification_once" TO "anon";
GRANT ALL ON TABLE "public"."notification_once" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_once" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pro_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."pro_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."pro_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."prospect_replies" TO "anon";
GRANT ALL ON TABLE "public"."prospect_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."prospect_replies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prospect_replies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prospect_replies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prospect_replies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."prospects" TO "anon";
GRANT ALL ON TABLE "public"."prospects" TO "authenticated";
GRANT ALL ON TABLE "public"."prospects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prospects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prospects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prospects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."room_playlists" TO "anon";
GRANT ALL ON TABLE "public"."room_playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."room_playlists" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON TABLE "public"."salon_players" TO "anon";
GRANT ALL ON TABLE "public"."salon_players" TO "authenticated";
GRANT ALL ON TABLE "public"."salon_players" TO "service_role";



GRANT ALL ON SEQUENCE "public"."salon_players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."salon_players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."salon_players_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON TABLE "public"."track_answers" TO "anon";
GRANT ALL ON TABLE "public"."track_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."track_answers" TO "service_role";



GRANT ALL ON TABLE "public"."track_issues" TO "anon";
GRANT ALL ON TABLE "public"."track_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."track_issues" TO "service_role";



GRANT ALL ON SEQUENCE "public"."track_issues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."track_issues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."track_issues_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."track_stats" TO "anon";
GRANT ALL ON TABLE "public"."track_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."track_stats" TO "service_role";



GRANT ALL ON TABLE "public"."tracks" TO "anon";
GRANT ALL ON TABLE "public"."tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."tracks" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_sets" TO "anon";
GRANT ALL ON TABLE "public"."user_card_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_sets" TO "service_role";



GRANT ALL ON TABLE "public"."user_cards" TO "anon";
GRANT ALL ON TABLE "public"."user_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."user_cards" TO "service_role";



GRANT ALL ON TABLE "public"."visit_sources" TO "anon";
GRANT ALL ON TABLE "public"."visit_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."visit_sources" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_challenges" TO "anon";
GRANT ALL ON TABLE "public"."weekly_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."zikle_pool" TO "anon";
GRANT ALL ON TABLE "public"."zikle_pool" TO "authenticated";
GRANT ALL ON TABLE "public"."zikle_pool" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE ALL ON FUNCTIONS FROM PUBLIC;




























