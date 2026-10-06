CREATE OR REPLACE FUNCTION public.get_covers_by_playlists(pids uuid[], max_per_playlist integer DEFAULT 9) RETURNS json LANGUAGE sql STABLE AS $f$
  SELECT COALESCE(json_object_agg(playlist_id, covers), '{}'::json) FROM (
    SELECT playlist_id, array_agg(cover_url ORDER BY rn) AS covers FROM (
      SELECT playlist_id, cover_url, ROW_NUMBER() OVER (PARTITION BY playlist_id ORDER BY id) AS rn
      FROM custom_playlist_tracks WHERE playlist_id = ANY(pids) AND cover_url IS NOT NULL AND cover_url != '') t
    WHERE rn <= max_per_playlist GROUP BY playlist_id) agg; $f$;
CREATE OR REPLACE FUNCTION public.leaderboard_score(p_mode text, p_rooms text, p_period text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(username text, avatar_url text, total_score bigint, games_count bigint) LANGUAGE sql STABLE AS $f$
  select pr.username, pr.avatar_url, sum(gp.score)::bigint, count(distinct gp.game_id)::bigint
    from game_players gp join games g on g.id = gp.game_id join profiles pr on pr.id = gp.user_id left join rooms r on r.code = g.room_id
   where gp.is_guest = false and gp.user_id is not null
     and (case when p_mode = 'qcm' then g.mode = 'qcm' else g.mode <> 'qcm' end)
     and (p_rooms <> 'officielles' or r.is_official is true)
     and (p_period = 'alltime' or coalesce(g.ended_at, g.started_at) >= date_trunc(case when p_period = 'mois' then 'month' else 'week' end, now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')
   group by pr.id, pr.username, pr.avatar_url order by sum(gp.score) desc limit p_limit offset p_offset; $f$;
CREATE OR REPLACE FUNCTION public.leaderboard_score_my_rank(p_user_id uuid, p_mode text, p_rooms text, p_period text)
 RETURNS TABLE(rank bigint, total_score bigint, games_count bigint) LANGUAGE sql STABLE AS $f$ select null::bigint, null::bigint, null::bigint where false; $f$;
CREATE OR REPLACE FUNCTION public.weekly_leaderboard() RETURNS TABLE(username text, avatar_url text, weekly_score bigint, games_count bigint) LANGUAGE sql STABLE AS $f$
  SELECT p.username, p.avatar_url, SUM(gp.score) AS weekly_score, COUNT(DISTINCT gp.game_id) AS games_count
  FROM public.game_players gp JOIN public.games g ON g.id = gp.game_id JOIN public.profiles p ON p.id = gp.user_id
  WHERE g.ended_at >= date_trunc('week', NOW() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris' AND gp.is_guest = FALSE
  GROUP BY p.username, p.avatar_url ORDER BY weekly_score DESC LIMIT 20; $f$;
CREATE OR REPLACE FUNCTION public.weekly_leaderboard_by_room(p_room_code text) RETURNS TABLE(username text, avatar_url text, weekly_score bigint, games_count bigint) LANGUAGE sql STABLE AS $f$
  SELECT pr.username, pr.avatar_url, SUM(gp.score)::BIGINT, COUNT(DISTINCT g.id)::BIGINT FROM game_players gp JOIN games g ON g.id = gp.game_id JOIN profiles pr ON pr.id = gp.user_id
  WHERE g.room_id = p_room_code AND gp.is_guest = FALSE AND g.ended_at IS NOT NULL AND g.ended_at >= date_trunc('week', NOW()) GROUP BY pr.username, pr.avatar_url ORDER BY 3 DESC LIMIT 10; $f$;
CREATE OR REPLACE FUNCTION public.zikle_leaderboard(p_date date, p_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(username text, attempts integer, won boolean, solve_time_seconds integer, rank integer, total integer, is_me boolean) LANGUAGE sql STABLE AS $f$
  with ranked as (select p.username, dr.attempts, dr.won, dr.solve_time_seconds,
      rank() over (order by dr.won desc, dr.attempts asc, dr.solve_time_seconds asc nulls last)::int as rank, (count(*) over ())::int as total,
      coalesce(dr.user_id = p_user_id, false) as is_me
    from public.daily_results dr join public.profiles p on p.id = dr.user_id where dr.date = p_date)
  select username, attempts, won, solve_time_seconds, rank, total, is_me from ranked where rank <= p_limit or is_me order by rank; $f$;
CREATE OR REPLACE FUNCTION public.pick_daily_song() RETURNS TABLE(date date, track_id uuid, is_new boolean) LANGUAGE plpgsql AS $f$
#variable_conflict use_column
declare today date := (now() at time zone 'Europe/Paris')::date; existing uuid;
begin select ds.track_id into existing from public.daily_songs ds where ds.date = today;
  if existing is not null then return query select today, existing, false; end if; end; $f$;
CREATE OR REPLACE FUNCTION public.pick_weekly_challenge() RETURNS TABLE(id uuid, week_start date, week_end date, type text, target integer, current_value integer, status text, top_contributor_id uuid, top_contributor_amount integer) LANGUAGE sql AS $f$
  select wc.id, wc.week_start, wc.week_end, wc.type, wc.target, wc.current_value, wc.status, wc.top_contributor_id, wc.top_contributor_amount from public.weekly_challenges wc where wc.status='active' order by week_start desc limit 1; $f$;
CREATE OR REPLACE FUNCTION public.resolve_tracks(p_tracks jsonb) RETURNS uuid[] LANGUAGE sql AS $f$ select '{}'::uuid[] $f$;
CREATE OR REPLACE FUNCTION public.update_player_stats(p_user_id uuid, p_score integer, p_rank integer, p_total_players integer, p_elo_change integer DEFAULT 0) RETURNS void LANGUAGE sql AS $f$ select $f$;
CREATE OR REPLACE FUNCTION public.update_player_streaks(p_user_id uuid, p_won boolean) RETURNS TABLE(current_streak integer, best_streak integer, win_streak integer, best_win_streak integer) LANGUAGE sql AS $f$ select 0,0,0,0 where false $f$;
CREATE OR REPLACE FUNCTION public.increment_weekly_challenge(p_type text, p_user_id uuid, p_amount integer) RETURNS void LANGUAGE sql AS $f$ select $f$;
CREATE OR REPLACE FUNCTION public.zikle_complete(p_user_id uuid, p_date date, p_attempts integer, p_won boolean, p_solve_time_seconds integer, p_guesses jsonb) RETURNS TABLE(attempts integer, won boolean, solve_time_seconds integer, is_new boolean) LANGUAGE sql AS $f$ select p_attempts, p_won, p_solve_time_seconds, true $f$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
