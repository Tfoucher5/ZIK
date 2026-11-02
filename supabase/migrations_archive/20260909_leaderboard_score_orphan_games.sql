-- 20260909_leaderboard_score_orphan_games.sql
-- Le classement Score (/classements) perdait une grosse partie des scores :
--
--   1. jointure stricte sur `rooms` : les rooms custom éphémères (/api/rooms/custom)
--      ne vivent qu'en mémoire 4h et ne sont jamais écrites en base. Toutes leurs
--      parties disparaissaient du classement, alors que weekly_leaderboard (home)
--      les compte — d'où deux classements incohérents entre eux.
--      Mesuré le 09/09/2026 : 49 rooms sur 81 (40 derniers jours) absentes de
--      `rooms`, soit 82 lignes game_players et 24 joueurs inscrits invisibles.
--
--   2. `g.ended_at IS NOT NULL` : une partie abandonnée par tous ses joueurs
--      n'obtient jamais de ended_at, donc les scores enregistrés en cours de
--      partie (rank NULL, saveMidGamePlayer) n'étaient jamais classés.
--
-- Le mode se lit désormais sur games.mode (NOT NULL DEFAULT 'classic', renseigné
-- à la création de la partie) et non sur rooms.game_mode, inexistant pour les
-- rooms éphémères. La période se borne sur COALESCE(ended_at, started_at).

drop function if exists public.leaderboard_score(text, text, text, int, int);

create function public.leaderboard_score(
  p_mode   text,
  p_rooms  text,
  p_period text,
  p_limit  int default 20,
  p_offset int default 0
)
returns table(username text, avatar_url text, total_score bigint, games_count bigint)
language sql
stable
as $$
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

drop function if exists public.leaderboard_score_my_rank(uuid, text, text, text);

create function public.leaderboard_score_my_rank(
  p_user_id uuid,
  p_mode    text,
  p_rooms   text,
  p_period  text
)
returns table(rank bigint, total_score bigint, games_count bigint)
language sql
stable
as $$
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

grant execute on function public.leaderboard_score(text, text, text, int, int) to anon, authenticated, service_role;
grant execute on function public.leaderboard_score_my_rank(uuid, text, text, text) to anon, authenticated, service_role;
