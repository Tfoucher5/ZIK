-- Phase 4 du plan : schémas par domaine, lot play.
-- play : rooms, room_playlists, games, game_players, game_results,
--   achievements, user_achievements, weekly_challenges,
--   weekly_challenge_contributions, daily_results (RLS gardées),
--   daily_songs et zikle_pool (serveur seulement, sans politique).
-- Fonctions du domaine recréées dans play en security invoker, search_path
-- vide, noms qualifiés. Celles qui étaient en security definer ne sont
-- exécutables que par service_role. Les anciennes public.* restent pour le
-- code encore en prod et partent avec les vues de compatibilité.
-- Liens entre schémas (PostgREST ne suit pas une clé étrangère d'un schéma à
-- l'autre) :
--   play.owner(play.rooms) : propriétaire d'une room (public.profiles) ;
--   play.custom_playlists(play.rooms | play.room_playlists) : playlist
--     (catalog.custom_playlists) ;
--   play.top_contributor(play.weekly_challenges) : meilleur contributeur ;
--   play.profile(play.weekly_challenge_contributions | play.user_achievements
--     | play.daily_results) : joueur ;
--   public.games(public.salon_players) : partie d'une ligne de soirée ;
--   play.tracks(play.daily_songs | play.zikle_pool) : déplacées depuis public,
--     recréées sur les vues de compatibilité.
-- Prérequis hors migration : play dans « Exposed schemas » (Settings > Data API).
-- Pour défaire : drop des vues public.* et des fonctions play.*, alter table
-- play.<table> set schema public, recréer generate_room_code,
-- rooms_before_insert (avec search_path = '') et le trigger rooms_auto_code de
-- 20261102220000_baseline.sql, et public.tracks(daily_songs | zikle_pool) de
-- 20261111173010_schema_catalog.sql.

create schema if not exists play;
revoke all on schema play from public;
grant usage on schema play to anon, authenticated, service_role;

alter table public.rooms set schema play;
alter table public.room_playlists set schema play;
alter table public.games set schema play;
alter table public.game_players set schema play;
alter table public.game_results set schema play;
alter table public.achievements set schema play;
alter table public.user_achievements set schema play;
alter table public.weekly_challenges set schema play;
alter table public.weekly_challenge_contributions set schema play;
alter table public.daily_results set schema play;
alter table public.daily_songs set schema play;
alter table public.zikle_pool set schema play;

revoke all on play.rooms, play.room_playlists, play.games, play.game_players,
  play.game_results, play.achievements, play.user_achievements,
  play.weekly_challenges, play.weekly_challenge_contributions,
  play.daily_results, play.daily_songs, play.zikle_pool
  from public, anon, authenticated;
grant select on play.rooms, play.room_playlists, play.games, play.game_players,
  play.game_results, play.achievements, play.user_achievements,
  play.weekly_challenges, play.weekly_challenge_contributions
  to anon, authenticated;
grant select on play.daily_results to authenticated;
grant insert, update, delete on play.rooms to authenticated;
grant insert, delete on play.room_playlists to authenticated;
grant select, insert, update, delete on play.rooms, play.room_playlists,
  play.games, play.game_players, play.game_results, play.achievements,
  play.user_achievements, play.weekly_challenges,
  play.weekly_challenge_contributions, play.daily_results, play.daily_songs,
  play.zikle_pool to service_role;

-- ── Fonctions de lien ────────────────────────────────────────────────────────

alter function public.tracks(play.daily_songs) set schema play;
alter function public.tracks(play.zikle_pool) set schema play;

create or replace function play.owner(play.rooms)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.owner_id $$;

create or replace function play.custom_playlists(play.rooms)
  returns setof catalog.custom_playlists rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from catalog.custom_playlists where id = $1.playlist_id $$;

create or replace function play.custom_playlists(play.room_playlists)
  returns setof catalog.custom_playlists rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from catalog.custom_playlists where id = $1.playlist_id $$;

create or replace function play.top_contributor(play.weekly_challenges)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.top_contributor_id $$;

create or replace function play.profile(play.weekly_challenge_contributions)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.user_id $$;

create or replace function play.profile(play.user_achievements)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.user_id $$;

create or replace function play.profile(play.daily_results)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.user_id $$;

create or replace function public.games(public.salon_players)
  returns setof play.games rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from play.games where id = $1.game_id $$;

revoke execute on function play.owner(play.rooms),
  play.custom_playlists(play.rooms), play.custom_playlists(play.room_playlists),
  play.top_contributor(play.weekly_challenges),
  play.profile(play.weekly_challenge_contributions),
  play.profile(play.user_achievements), play.profile(play.daily_results),
  public.games(public.salon_players)
  from public, anon, authenticated;
grant execute on function play.owner(play.rooms),
  play.custom_playlists(play.rooms), play.custom_playlists(play.room_playlists)
  to anon, authenticated, service_role;
grant execute on function play.top_contributor(play.weekly_challenges),
  play.profile(play.weekly_challenge_contributions),
  play.profile(play.user_achievements), play.profile(play.daily_results)
  to service_role;
grant execute on function public.games(public.salon_players)
  to authenticated, service_role;

-- ── Fonctions du domaine ─────────────────────────────────────────────────────

create or replace function play.generate_room_code()
 returns text
 language plpgsql
 security invoker
 set search_path = ''
as $function$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  tries  int  := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from play.rooms where rooms.code = v_code);
    tries := tries + 1;
    if tries > 100 then raise exception 'Cannot generate unique room code'; end if;
  end loop;
  return v_code;
end;
$function$;

create or replace function play.rooms_before_insert()
 returns trigger
 language plpgsql
 security invoker
 set search_path = ''
as $function$
begin
  if new.code is null or new.code = '' then
    new.code := play.generate_room_code();
  end if;
  return new;
end;
$function$;

drop trigger rooms_auto_code on play.rooms;
create trigger rooms_auto_code before insert on play.rooms
  for each row execute function play.rooms_before_insert();
drop function public.rooms_before_insert();
drop function public.generate_room_code();

create or replace function play.increment_weekly_challenge(p_type text, p_user_id uuid, p_amount integer)
 returns void
 language plpgsql
 security invoker
 set search_path = ''
as $function$
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  wk_start date := today - (extract(isodow from today)::int - 1);
  cid uuid;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then return; end if;

  select id into cid from play.weekly_challenges
  where week_start = wk_start and type = p_type and status = 'active';
  if cid is null then return; end if;

  insert into play.weekly_challenge_contributions (challenge_id, user_id, amount)
  values (cid, p_user_id, p_amount)
  on conflict (challenge_id, user_id) do update
    set amount = weekly_challenge_contributions.amount + excluded.amount,
        updated_at = now();

  update play.weekly_challenges set current_value = current_value + p_amount where id = cid;
end;
$function$;

create or replace function play.leaderboard_score(p_mode text, p_rooms text, p_period text, p_limit integer default 20, p_offset integer default 0)
 returns table(username text, avatar_url text, total_score bigint, games_count bigint)
 language sql
 stable
 security invoker
 set search_path = ''
as $function$
  select pr.username,
         pr.avatar_url,
         sum(gp.score)::bigint,
         count(distinct gp.game_id)::bigint
    from play.game_players gp
    join play.games g on g.id = gp.game_id
    join public.profiles pr on pr.id = gp.user_id
    left join play.rooms r on r.code = g.room_id
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
$function$;

create or replace function play.leaderboard_score_my_rank(p_user_id uuid, p_mode text, p_rooms text, p_period text)
 returns table(rank bigint, total_score bigint, games_count bigint)
 language sql
 stable
 security invoker
 set search_path = ''
as $function$
  with agg as (
    select gp.user_id                        as user_id,
           sum(gp.score)::bigint             as total_score,
           count(distinct gp.game_id)::bigint as games_count
      from play.game_players gp
      join play.games g on g.id = gp.game_id
      join public.profiles pr on pr.id = gp.user_id
      left join play.rooms r on r.code = g.room_id
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
$function$;

create or replace function play.pick_daily_song()
 returns table(date date, track_id uuid, is_new boolean)
 language plpgsql
 security invoker
 set search_path = ''
as $function$
#variable_conflict use_column
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  existing uuid;
  picked uuid;
begin
  select ds.track_id into existing from play.daily_songs ds where ds.date = today;
  if existing is not null then
    return query select today, existing, false;
    return;
  end if;

  select zp.track_id into picked
  from play.zikle_pool zp
  where zp.track_id not in (
    select ds.track_id from play.daily_songs ds where ds.date > today - interval '365 days'
  )
  order by random()
  limit 1;

  if picked is null then
    return;
  end if;

  insert into play.daily_songs (date, track_id) values (today, picked)
    on conflict (date) do nothing;

  select ds.track_id into existing from play.daily_songs ds where ds.date = today;
  return query select today, existing, true;
end;
$function$;

create or replace function play.pick_weekly_challenge()
 returns table(id uuid, week_start date, week_end date, type text, target integer, current_value integer, status text, top_contributor_id uuid, top_contributor_amount integer)
 language plpgsql
 security invoker
 set search_path = ''
as $function$
#variable_conflict use_column
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  wk_start date := today - (extract(isodow from today)::int - 1);
  wk_end date := wk_start + 6;
  existing_id uuid;
  prev_row play.weekly_challenges%rowtype;
  top_row record;
  last_type text;
  types text[] := array['correct_answers','games_played','zikle_wins','cards_won'];
  targets int[] := array[5000, 300, 150, 500];
  next_idx int;
begin
  for prev_row in
    select * from play.weekly_challenges
    where status = 'active' and week_start < wk_start
    for update skip locked
  loop
    select c.user_id, c.amount into top_row
    from play.weekly_challenge_contributions c
    where c.challenge_id = prev_row.id
    order by c.amount desc, c.updated_at asc
    limit 1;

    update play.weekly_challenges set
      status = case when prev_row.current_value >= prev_row.target then 'success' else 'failed' end,
      top_contributor_id = top_row.user_id,
      top_contributor_amount = top_row.amount,
      closed_at = now()
    where id = prev_row.id;

    if prev_row.current_value >= prev_row.target then
      insert into play.user_achievements (user_id, achievement_id, tier, count)
      select c.user_id, 'weekly_challenge_hero', null, 1
      from play.weekly_challenge_contributions c
      where c.challenge_id = prev_row.id
      on conflict (user_id, achievement_id, tier) do update
        set count = play.user_achievements.count + 1,
            unlocked_at = now();
    end if;

    if top_row.user_id is not null then
      insert into play.user_achievements (user_id, achievement_id, tier, count)
      values (top_row.user_id, 'weekly_top_contributor', null, 1)
      on conflict (user_id, achievement_id, tier) do update
        set count = play.user_achievements.count + 1,
            unlocked_at = now();
    end if;
  end loop;

  select wc.id into existing_id from play.weekly_challenges wc where wc.week_start = wk_start;
  if existing_id is null then
    select type into last_type from play.weekly_challenges
    where week_start < wk_start order by week_start desc limit 1;
    if last_type is null then
      next_idx := floor(random() * array_length(types, 1))::int;
    else
      next_idx := coalesce(array_position(types, last_type), 0) % array_length(types, 1);
    end if;

    insert into play.weekly_challenges (week_start, week_end, type, target)
    values (wk_start, wk_end, types[next_idx + 1], targets[next_idx + 1])
    on conflict (week_start) do nothing;
  end if;

  return query
    select wc.id, wc.week_start, wc.week_end, wc.type, wc.target, wc.current_value,
           wc.status, wc.top_contributor_id, wc.top_contributor_amount
    from play.weekly_challenges wc where wc.week_start = wk_start;
end;
$function$;

create or replace function play.weekly_leaderboard()
 returns table(username text, avatar_url text, weekly_score bigint, games_count bigint)
 language sql
 stable
 security invoker
 set search_path = ''
as $function$
  select
    p.username,
    p.avatar_url,
    sum(gp.score) as weekly_score,
    count(distinct gp.game_id) as games_count
  from play.game_players gp
  join play.games g on g.id = gp.game_id
  join public.profiles p on p.id = gp.user_id
  left join play.rooms r on r.code = g.room_id
  where g.ended_at >= date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
    and gp.is_guest = false
    and (r.game_mode is null or r.game_mode != 'qcm')
  group by p.username, p.avatar_url
  order by weekly_score desc
  limit 20;
$function$;

create or replace function play.weekly_leaderboard_by_room(p_room_code text)
 returns table(username text, avatar_url text, weekly_score bigint, games_count bigint)
 language sql
 stable
 security invoker
 set search_path = ''
as $function$
  select
    pr.username,
    pr.avatar_url,
    sum(gp.score)::bigint   as weekly_score,
    count(distinct g.id)::bigint as games_count
  from play.game_players gp
  join play.games        g  on g.id = gp.game_id
  join public.profiles   pr on pr.id = gp.user_id
  where
    g.room_id  = p_room_code
    and gp.is_guest = false
    and g.ended_at is not null
    and g.ended_at >= date_trunc('week', now())
  group by pr.username, pr.avatar_url
  order by weekly_score desc
  limit 10;
$function$;

create or replace function play.zikle_complete(p_user_id uuid, p_date date, p_attempts integer, p_won boolean, p_solve_time_seconds integer, p_guesses jsonb)
 returns table(attempts integer, won boolean, solve_time_seconds integer, is_new boolean)
 language plpgsql
 security invoker
 set search_path = ''
as $function$
#variable_conflict use_column
declare
  existing record;
  inserted record;
begin
  select dr.attempts, dr.won, dr.solve_time_seconds into existing
  from play.daily_results dr where dr.user_id = p_user_id and dr.date = p_date;

  if found then
    return query select existing.attempts, existing.won, existing.solve_time_seconds, false;
    return;
  end if;

  insert into play.daily_results (user_id, date, attempts, won, solve_time_seconds, guesses)
  values (p_user_id, p_date, p_attempts, p_won, p_solve_time_seconds, p_guesses)
  on conflict (user_id, date) do nothing
  returning attempts, won, solve_time_seconds into inserted;

  if inserted is null then
    select dr.attempts, dr.won, dr.solve_time_seconds into existing
    from play.daily_results dr where dr.user_id = p_user_id and dr.date = p_date;
    return query select existing.attempts, existing.won, existing.solve_time_seconds, false;
    return;
  end if;

  if p_won then
    update public.profiles set xp = xp + 10 where id = p_user_id;
  end if;

  return query select inserted.attempts, inserted.won, inserted.solve_time_seconds, true;
end;
$function$;

create or replace function play.zikle_leaderboard(p_date date, p_user_id uuid default null::uuid, p_limit integer default 50)
 returns table(username text, attempts integer, won boolean, solve_time_seconds integer, rank integer, total integer, is_me boolean)
 language sql
 stable
 security invoker
 set search_path = ''
as $function$
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
    from play.daily_results dr
    join public.profiles p on p.id = dr.user_id
    where dr.date = p_date
  )
  select username, attempts, won, solve_time_seconds, rank, total, is_me
  from ranked
  where rank <= p_limit or is_me
  order by rank;
$function$;

revoke execute on function play.generate_room_code(), play.rooms_before_insert(),
  play.increment_weekly_challenge(text, uuid, integer),
  play.leaderboard_score(text, text, text, integer, integer),
  play.leaderboard_score_my_rank(uuid, text, text, text),
  play.pick_daily_song(), play.pick_weekly_challenge(),
  play.weekly_leaderboard(), play.weekly_leaderboard_by_room(text),
  play.zikle_complete(uuid, date, integer, boolean, integer, jsonb),
  play.zikle_leaderboard(date, uuid, integer)
  from public, anon, authenticated;
grant execute on function play.generate_room_code() to authenticated, service_role;
grant execute on function play.leaderboard_score(text, text, text, integer, integer),
  play.leaderboard_score_my_rank(uuid, text, text, text),
  play.weekly_leaderboard(), play.weekly_leaderboard_by_room(text)
  to anon, authenticated, service_role;
grant execute on function play.increment_weekly_challenge(text, uuid, integer),
  play.pick_daily_song(), play.pick_weekly_challenge(),
  play.zikle_complete(uuid, date, integer, boolean, integer, jsonb),
  play.zikle_leaderboard(date, uuid, integer)
  to service_role;

-- ── Vues de compatibilité (code encore en prod, supprimées plus tard) ────────

create view public.rooms with (security_invoker = true) as select * from play.rooms;
create view public.room_playlists with (security_invoker = true) as select * from play.room_playlists;
create view public.games with (security_invoker = true) as select * from play.games;
create view public.game_players with (security_invoker = true) as select * from play.game_players;
create view public.game_results with (security_invoker = true) as select * from play.game_results;
create view public.achievements with (security_invoker = true) as select * from play.achievements;
create view public.user_achievements with (security_invoker = true) as select * from play.user_achievements;
create view public.weekly_challenges with (security_invoker = true) as select * from play.weekly_challenges;
create view public.weekly_challenge_contributions with (security_invoker = true) as select * from play.weekly_challenge_contributions;
create view public.daily_results with (security_invoker = true) as select * from play.daily_results;
create view public.daily_songs with (security_invoker = true) as select * from play.daily_songs;
create view public.zikle_pool with (security_invoker = true) as select * from play.zikle_pool;

revoke all on public.rooms, public.room_playlists, public.games,
  public.game_players, public.game_results, public.achievements,
  public.user_achievements, public.weekly_challenges,
  public.weekly_challenge_contributions, public.daily_results,
  public.daily_songs, public.zikle_pool
  from public, anon, authenticated;
grant select on public.rooms, public.room_playlists, public.games,
  public.game_players, public.game_results, public.achievements,
  public.user_achievements, public.weekly_challenges,
  public.weekly_challenge_contributions
  to anon, authenticated;
grant select on public.daily_results to authenticated;
grant insert, update, delete on public.rooms to authenticated;
grant insert, delete on public.room_playlists to authenticated;
grant select, insert, update, delete on public.rooms, public.room_playlists,
  public.games, public.game_players, public.game_results, public.achievements,
  public.user_achievements, public.weekly_challenges,
  public.weekly_challenge_contributions, public.daily_results,
  public.daily_songs, public.zikle_pool to service_role;

-- Titre du Zikle lu par l'ancien code (serveur).
create or replace function public.tracks(public.daily_songs)
  returns setof catalog.tracks rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from catalog.tracks where id = $1.track_id $$;

create or replace function public.tracks(public.zikle_pool)
  returns setof catalog.tracks rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from catalog.tracks where id = $1.track_id $$;

revoke execute on function public.tracks(public.daily_songs),
  public.tracks(public.zikle_pool) from public, anon, authenticated;
grant execute on function public.tracks(public.daily_songs),
  public.tracks(public.zikle_pool) to service_role;
