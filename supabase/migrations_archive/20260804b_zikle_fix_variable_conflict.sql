-- supabase/migrations/20260804b_zikle_fix_variable_conflict.sql
-- Fix bug SQL : "column reference is ambiguous" dans pick_daily_song() et zikle_complete(...).
-- Cause : les OUT params de RETURNS TABLE(...) (date, attempts, won, solve_time_seconds)
-- collisionnent avec les colonnes de même nom sur daily_songs / daily_results référencées
-- dans le corps de la fonction. Fix standard plpgsql : #variable_conflict use_column
-- (même pattern déjà utilisé dans update_player_streaks, cf. 20260610_achievements_streaks_game_results.sql).
-- zikle_leaderboard n'est pas concernée : elle est en language sql, pas plpgsql.

create or replace function public.pick_daily_song()
returns table(date date, track_id uuid, is_new boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  existing uuid;
  picked uuid;
begin
  select ds.track_id into existing from public.daily_songs ds where ds.date = today;
  if existing is not null then
    return query select today, existing, false;
    return;
  end if;

  select zp.track_id into picked
  from public.zikle_pool zp
  where zp.track_id not in (
    select ds.track_id from public.daily_songs ds where ds.date > today - interval '365 days'
  )
  order by random()
  limit 1;

  if picked is null then
    return; -- pool épuisé ou pas encore alimenté : aucune ligne renvoyée
  end if;

  insert into public.daily_songs (date, track_id) values (today, picked)
    on conflict (date) do nothing;

  select ds.track_id into existing from public.daily_songs ds where ds.date = today;
  return query select today, existing, true;
end;
$$;
revoke execute on function public.pick_daily_song() from anon, authenticated;

create or replace function public.zikle_complete(
  p_user_id uuid,
  p_date date,
  p_attempts int,
  p_won boolean,
  p_solve_time_seconds int,
  p_guesses jsonb
) returns table(attempts int, won boolean, solve_time_seconds int, is_new boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  existing record;
  inserted record;
begin
  select dr.attempts, dr.won, dr.solve_time_seconds into existing
  from public.daily_results dr where dr.user_id = p_user_id and dr.date = p_date;

  if found then
    return query select existing.attempts, existing.won, existing.solve_time_seconds, false;
    return;
  end if;

  insert into public.daily_results (user_id, date, attempts, won, solve_time_seconds, guesses)
  values (p_user_id, p_date, p_attempts, p_won, p_solve_time_seconds, p_guesses)
  on conflict (user_id, date) do nothing
  returning attempts, won, solve_time_seconds into inserted;

  if inserted is null then
    select dr.attempts, dr.won, dr.solve_time_seconds into existing
    from public.daily_results dr where dr.user_id = p_user_id and dr.date = p_date;
    return query select existing.attempts, existing.won, existing.solve_time_seconds, false;
    return;
  end if;

  if p_won then
    update public.profiles set xp = xp + 10 where id = p_user_id;
  end if;

  return query select inserted.attempts, inserted.won, inserted.solve_time_seconds, true;
end;
$$;
revoke execute on function public.zikle_complete(uuid,date,int,boolean,int,jsonb) from anon, authenticated;

-- Réapplication de sécurité (les grants/revokes de la migration originale restent valides
-- avec create or replace, mais on les réapplique explicitement par prudence)
revoke execute on function public.pick_daily_song() from anon, authenticated;
revoke execute on function public.zikle_complete(uuid,date,int,boolean,int,jsonb) from anon, authenticated;
