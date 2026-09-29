-- Indicateurs de la revue du lundi (voir 2026-09-29-audit-et-plan.md §6).
-- Chaque requête porte sur les 7 derniers jours sauf mention contraire.

-- 1. Étoile polaire : parties terminées à au moins 2 joueurs
select count(*) as parties_multi
from (
  select g.id
  from games g
  join game_players gp on gp.game_id = g.id
  where g.ended_at is not null
    and g.started_at > now() - interval '7 days'
  group by g.id
  having count(gp.id) >= 2
) x;

-- 2. Activité globale
select
  count(*) as parties_lancees,
  count(*) filter (where ended_at is not null) as parties_finies,
  (select count(*) from profiles where created_at > now() - interval '7 days') as inscrits,
  (select count(*) from daily_results where created_at > now() - interval '7 days') as parties_zikle
from games
where started_at > now() - interval '7 days';

-- 3. Activation : inscrits de la semaine précédente qui ont joué
with nouveaux as (
  select id from profiles
  where created_at between now() - interval '14 days' and now() - interval '7 days'
)
select
  count(*) as inscrits,
  count(*) filter (where exists (
    select 1 from game_players gp where gp.user_id = n.id
  ) or exists (
    select 1 from daily_results d where d.user_id = n.id
  )) as ont_joue
from nouveaux n;

-- 4. Retour J+1 à J+7 (inscrits entre J-14 et J-7)
with nouveaux as (
  select id, created_at::date as d0 from profiles
  where created_at between now() - interval '14 days' and now() - interval '7 days'
),
activite as (
  select gp.user_id, g.started_at::date as d
  from game_players gp join games g on g.id = gp.game_id
  where gp.user_id is not null
  union all
  select user_id, date from daily_results
)
select
  count(*) as inscrits,
  count(*) filter (where exists (
    select 1 from activite a
    where a.user_id = n.id and a.d between n.d0 + 1 and n.d0 + 7
  )) as revenus
from nouveaux n;

-- 5. Provenance des nouveaux visiteurs
select coalesce(nullif(source, ''), referrer_host, '(direct)') as source, count(*)
from visit_sources
where created_at > now() - interval '7 days'
group by 1
order by 2 desc;

-- 6. Signalements de la semaine
select type, subject, count(*)
from reports
where created_at > now() - interval '7 days'
group by 1, 2
order by 3 desc;
