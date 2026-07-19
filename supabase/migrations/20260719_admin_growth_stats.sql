-- 20260719_admin_growth_stats.sql
-- RPC d'agrégats pour le dashboard admin croissance.
-- SECURITY DEFINER : lisent games/game_players/profiles sans dépendre du RLS.
-- Appelées uniquement côté serveur avec le service key.

create or replace function admin_signups_per_day(p_days int)
returns table(day date, n int)
language sql security definer set search_path = public as $$
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

create or replace function admin_active_players_per_day(p_days int)
returns table(day date, n int)
language sql security definer set search_path = public as $$
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

create or replace function admin_games_per_day(p_days int)
returns table(day date, n int)
language sql security definer set search_path = public as $$
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

create or replace function admin_guest_ratio_7d()
returns table(guests int, logged int)
language sql security definer set search_path = public as $$
  select
    count(distinct gp.username) filter (where gp.is_guest)::int,
    count(distinct gp.user_id) filter (where not gp.is_guest)::int
  from game_players gp
  join games g on g.id = gp.game_id
  where g.started_at >= now() - interval '7 days';
$$;

-- Cohorte = inscrits il y a 14 à 7 jours ; retenu = a joué dans les 7 jours suivant son inscription.
create or replace function admin_retention_j7()
returns table(cohort_size int, retained int)
language sql security definer set search_path = public as $$
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

revoke execute on function admin_signups_per_day(int) from anon, authenticated;
revoke execute on function admin_active_players_per_day(int) from anon, authenticated;
revoke execute on function admin_games_per_day(int) from anon, authenticated;
revoke execute on function admin_guest_ratio_7d() from anon, authenticated;
revoke execute on function admin_retention_j7() from anon, authenticated;
