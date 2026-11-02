-- supabase/migrations/20260804_zikle.sql
-- Zikle : mini-jeu "chanson du jour" (extrait audio, 6 essais, streak/leaderboard).
-- Additive, ne touche aucune table existante.

-- 1. Pool de titres candidats (charts Deezer importés au fil du temps)
create table if not exists public.zikle_pool (
  track_id uuid primary key references public.tracks(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.zikle_pool enable row level security;
-- Pas de policy : lecture/écriture uniquement via service role (refresh du pool).

-- 2. Titre tiré au sort pour chaque jour
create table if not exists public.daily_songs (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  track_id uuid not null references public.tracks(id),
  created_at timestamptz not null default now()
);
alter table public.daily_songs enable row level security;
-- Pas de policy : lecture uniquement via service role (ne jamais exposer artist/title
-- au client avant la fin de la manche, cf. endpoints /api/zikle/*).

-- 3. Résultats des joueurs connectés
create table if not exists public.daily_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  attempts int not null check (attempts between 1 and 6),
  won boolean not null,
  solve_time_seconds int,
  guesses jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists idx_daily_results_date on public.daily_results(date);
alter table public.daily_results enable row level security;
drop policy if exists daily_results_select_own on public.daily_results;
create policy daily_results_select_own on public.daily_results
  for select using (user_id = auth.uid());
-- Pas de policy INSERT/UPDATE : écritures uniquement via la RPC zikle_complete (service role),
-- pour empêcher un client de s'auto-déclarer gagnant sans passer par la vérification serveur.

-- 4. Pick atomique du titre du jour (Europe/Paris), exclut les 365 derniers jours
create or replace function public.pick_daily_song()
returns table(date date, track_id uuid, is_new boolean)
language plpgsql security definer set search_path = public as $$
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

-- 5. Enregistre un résultat (idempotent) + bonus XP si victoire
create or replace function public.zikle_complete(
  p_user_id uuid,
  p_date date,
  p_attempts int,
  p_won boolean,
  p_solve_time_seconds int,
  p_guesses jsonb
) returns table(attempts int, won boolean, solve_time_seconds int, is_new boolean)
language plpgsql security definer set search_path = public as $$
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

-- 6. Classement du jour (gagnants uniquement, top 20)
create or replace function public.zikle_leaderboard(p_date date)
returns table(username text, attempts int, solve_time_seconds int)
language sql security definer set search_path = public as $$
  select p.username, dr.attempts, dr.solve_time_seconds
  from public.daily_results dr
  join public.profiles p on p.id = dr.user_id
  where dr.date = p_date and dr.won = true
  order by dr.attempts asc, dr.solve_time_seconds asc nulls last
  limit 20;
$$;
revoke execute on function public.zikle_leaderboard(date) from anon, authenticated;
