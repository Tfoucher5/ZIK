-- Classement du mois d'un lieu : seuls les joueurs connectés à un compte y
-- entrent. Un invité n'a qu'un pseudo, que n'importe qui pourrait reprendre
-- pour continuer à faire monter son score. Nom affiché = pseudo actuel du compte.
create or replace function public.venue_league(p_venue uuid, p_since timestamptz)
returns table (name text, points bigint, nights bigint, wins bigint)
language sql
stable
as $$
  select
    p.username as name,
    sum(sp.score)::bigint as points,
    count(distinct (g.started_at at time zone 'Europe/Paris')::date)::bigint as nights,
    count(*) filter (where sp.rank = 1)::bigint as wins
  from public.games g
  join public.salon_players sp on sp.game_id = g.id
  join public.profiles p on p.id = sp.user_id
  where g.venue_id = p_venue and g.started_at >= p_since
  group by p.id, p.username
  order by points desc, nights desc
  limit 50;
$$;

revoke execute on function public.venue_league(uuid, timestamptz) from public, anon, authenticated;
