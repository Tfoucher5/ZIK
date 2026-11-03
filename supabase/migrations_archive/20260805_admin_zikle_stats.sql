-- RPCs admin : stats Zikle + totaux globaux du site

create or replace function admin_zikle_today()
returns table(total_players int, won_count int, avg_attempts numeric)
language sql security definer set search_path = public as $$
  select
    count(*)::int,
    count(*) filter (where won)::int,
    coalesce(round(avg(attempts)::numeric, 1), 0)
  from daily_results
  where date = (now() at time zone 'Europe/Paris')::date;
$$;

create or replace function admin_zikle_per_day(p_days int)
returns table(day date, n int)
language sql security definer set search_path = public as $$
  select d.day::date, count(dr.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join daily_results dr on dr.date = d.day::date
  group by d.day order by d.day;
$$;

create or replace function admin_zikle_7d()
returns table(total_players int, won_count int)
language sql security definer set search_path = public as $$
  select count(*)::int, count(*) filter (where won)::int
  from daily_results
  where date >= (now() at time zone 'Europe/Paris')::date - 6;
$$;

create or replace function admin_site_totals()
returns table(total_users int, total_games int, zikle_pool_size int, zikle_days_played int)
language sql security definer set search_path = public as $$
  select
    (select count(*)::int from profiles),
    (select count(*)::int from games),
    (select count(*)::int from zikle_pool),
    (select count(distinct date)::int from daily_songs);
$$;

revoke execute on function admin_zikle_today() from anon, authenticated;
revoke execute on function admin_zikle_per_day(int) from anon, authenticated;
revoke execute on function admin_zikle_7d() from anon, authenticated;
revoke execute on function admin_site_totals() from anon, authenticated;
