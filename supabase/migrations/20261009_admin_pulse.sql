-- supabase/migrations/20261009_admin_pulse.sql
-- Écran « Pouls » de l'admin : étoile polaire glissante et les quatre
-- objectifs de l'audit (docs/strategie/2026-09-29-audit-et-plan.md §6).

create or replace function public.admin_pulse(p_days int default 30)
returns table (
  north_7d bigint,
  north_prev_7d bigint,
  activation_cohort bigint,
  activation_played bigint,
  return_cohort bigint,
  return_back bigint,
  salon_guests bigint,
  salon_invite_hosts bigint,
  visits bigint,
  visits_social bigint
)
language sql
security definer
set search_path = public
as $$
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
  -- Fenêtre décalée de 7 jours : chaque joueur a eu sa semaine pour revenir
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

revoke all on function public.admin_pulse(int) from public, anon, authenticated;
grant execute on function public.admin_pulse(int) to service_role;
