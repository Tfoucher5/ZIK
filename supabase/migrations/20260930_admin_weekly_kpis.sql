-- supabase/migrations/20260930_admin_weekly_kpis.sql
-- Indicateurs de la revue du lundi (docs/strategie/kpis.sql), semaine par
-- semaine, pour la page /admin/kpis. Dépend de 20260929_games_salon_stats.sql
-- (games.player_count et games.origin).
--
-- Semaines ISO (lundi). La semaine en cours est incluse, incomplète.

create or replace function public.admin_weekly_kpis(p_weeks int default 8)
returns table (
  week date,
  parties_lancees bigint,
  parties_finies bigint,
  rooms_multi bigint,
  salons_lances bigint,
  salons_finis bigint,
  salons_multi bigint,
  salons_joueurs_moy numeric,
  salons_depuis_invitation bigint,
  inscrits bigint,
  inscrits_salon_invite bigint,
  inscrits_salon_setup bigint,
  inscrits_room_guest bigint,
  parties_zikle bigint
)
language sql
security definer
set search_path = public
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

revoke all on function public.admin_weekly_kpis(int) from public, anon, authenticated;
grant execute on function public.admin_weekly_kpis(int) to service_role;
