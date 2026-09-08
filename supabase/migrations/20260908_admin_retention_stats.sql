-- 20260908_admin_retention_stats.sql
-- Agrégats de rétention pour le dashboard admin.
-- Même contrat que 20260719_admin_growth_stats.sql : SECURITY DEFINER,
-- appelées uniquement côté serveur avec le service key.
--
-- Périmètre : inscrits uniquement. Les invités n'ont pas d'identité stable
-- (pseudo libre à chaque partie), toute rétention calculée sur eux serait fausse.

-- Socle commun : un jour d'activité par utilisateur et par type d'activité.
create or replace view admin_user_activity as
  select gp.user_id,
         (g.started_at at time zone 'Europe/Paris')::date as day,
         'blindtest'::text as activity
    from game_players gp
    join games g on g.id = gp.game_id
   where gp.user_id is not null
  union all
  select dr.user_id, dr.date, 'zikle'::text
    from daily_results dr
   where dr.user_id is not null
  union all
  select wc.user_id,
         (wc.updated_at at time zone 'Europe/Paris')::date,
         'defi'::text
    from weekly_challenge_contributions wc
   where wc.user_id is not null;

-- Cohortes hebdomadaires : part des inscrits de la semaine S encore actifs
-- en S+1 à S+4, pour une activité donnée ('blindtest' | 'zikle' | 'defi').
create or replace function admin_retention_cohorts(p_activity text, p_weeks int)
returns table(cohort_week date, cohort_size int, w1 int, w2 int, w3 int, w4 int)
language sql security definer set search_path = public as $$
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

-- Combien de jours distincts un inscrit actif joue-t-il sur la fenêtre ?
create or replace function admin_return_frequency(p_days int)
returns table(bucket text, lo int, n int)
language sql security definer set search_path = public as $$
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

-- Écart médian, en jours, entre deux jours actifs consécutifs d'un même inscrit.
create or replace function admin_return_gap(p_days int)
returns numeric
language sql security definer set search_path = public as $$
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

-- Décomposition hebdomadaire des actifs. Catégories exclusives :
-- nouveau = première activité cette semaine ; revenant = déjà actif la semaine
-- précédente ; résurrecté = de retour après au moins une semaine d'absence.
create or replace function admin_activity_breakdown(p_weeks int)
returns table(week date, new_users int, returning_users int, resurrected int)
language sql security definer set search_path = public as $$
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

create or replace function admin_dau_wau_mau()
returns table(dau int, wau int, mau int)
language sql security definer set search_path = public as $$
  select count(distinct a.user_id) filter (
           where a.day = (now() at time zone 'Europe/Paris')::date)::int,
         count(distinct a.user_id) filter (
           where a.day > (now() at time zone 'Europe/Paris')::date - 7)::int,
         count(distinct a.user_id)::int
    from admin_user_activity a
   where a.day > (now() at time zone 'Europe/Paris')::date - 30;
$$;

-- churned : actif entre J-60 et J-30, plus rien depuis.
-- at_risk  : dernière activité entre J-30 et J-14.
create or replace function admin_churn_summary()
returns table(active_30d int, churned int, at_risk int)
language sql security definer set search_path = public as $$
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

create or replace function admin_at_risk_users(p_limit int)
returns table(id uuid, username text, last_active date, days_since int, active_days int)
language sql security definer set search_path = public as $$
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

-- Leviers : parmi les inscrits d'il y a plus de 37 jours, on compare la part
-- encore active entre J+7 et J+37 selon qu'ils ont fait X pendant leur
-- première semaine ou non.
create or replace function admin_retention_levers()
returns table(lever text, with_n int, with_retained int,
              without_n int, without_retained int)
language sql security definer set search_path = public as $$
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

revoke all on admin_user_activity from anon, authenticated;
revoke execute on function admin_retention_cohorts(text, int) from anon, authenticated;
revoke execute on function admin_return_frequency(int) from anon, authenticated;
revoke execute on function admin_return_gap(int) from anon, authenticated;
revoke execute on function admin_activity_breakdown(int) from anon, authenticated;
revoke execute on function admin_dau_wau_mau() from anon, authenticated;
revoke execute on function admin_churn_summary() from anon, authenticated;
revoke execute on function admin_at_risk_users(int) from anon, authenticated;
revoke execute on function admin_retention_levers() from anon, authenticated;
