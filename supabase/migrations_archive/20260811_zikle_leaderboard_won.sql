-- 20260811_zikle_leaderboard_won.sql
-- Le classement du jour ne montrait que les gagnants, sans rang réel : ceux qui
-- ont joué sans trouver disparaissaient, et un joueur hors du top ne savait pas
-- où il se situait (le client déduisait le rang de la position dans la liste
-- tronquée). Désormais :
--   - tous les participants du jour sont classés, gagnants d'abord ;
--   - le rang et le total sont calculés en SQL sur l'ensemble des participants ;
--   - la ligne du joueur est toujours renvoyée, même au-delà de p_limit.
--
-- DROP puis CREATE (et pas CREATE OR REPLACE) : la signature et le type de
-- retour changent tous les deux.

drop function if exists public.zikle_leaderboard(date);

create function public.zikle_leaderboard(
  p_date date,
  p_user_id uuid default null,
  p_limit int default 50
)
returns table(
  username text,
  attempts int,
  won boolean,
  solve_time_seconds int,
  rank int,
  total int,
  is_me boolean
)
language sql security definer set search_path = public as $$
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

-- Postgres réaccorde EXECUTE à PUBLIC sur toute nouvelle fonction : sans ce
-- revoke, la clé anon pourrait rappeler la RPC directement (cf. 20260805).
-- Ici c'est d'autant plus important que p_user_id est un paramètre : seul le
-- service role, qui le dérive d'un token vérifié, doit pouvoir l'appeler.
revoke execute on function public.zikle_leaderboard(date, uuid, int) from public;
revoke execute on function public.zikle_leaderboard(date, uuid, int) from anon, authenticated;
