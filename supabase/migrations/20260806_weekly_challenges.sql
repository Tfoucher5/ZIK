-- supabase/migrations/20260806_weekly_challenges.sql
-- Défi communautaire hebdomadaire : objectif collectif variable (bonnes réponses /
-- parties jouées / Zikle gagnés) + top contributeur de la semaine.
-- Additive, ne touche aucune table existante à l'exception de la contrainte de
-- catégorie sur `achievements` (ajout de la valeur 'challenge').

-- 1. Ligne "semaine" : une par semaine ISO (lundi → dimanche, Europe/Paris)
create table if not exists public.weekly_challenges (
  id                     uuid primary key default gen_random_uuid(),
  week_start             date not null unique,
  week_end               date not null,
  type                   text not null check (type in ('correct_answers','games_played','zikle_wins')),
  target                 int not null check (target > 0),
  current_value          int not null default 0,
  status                 text not null default 'active' check (status in ('active','success','failed')),
  top_contributor_id     uuid references public.profiles(id) on delete set null,
  top_contributor_amount int,
  created_at             timestamptz not null default now(),
  closed_at              timestamptz
);
create index if not exists idx_weekly_challenges_week_start on public.weekly_challenges(week_start desc);
alter table public.weekly_challenges enable row level security;
drop policy if exists weekly_challenges_select on public.weekly_challenges;
create policy weekly_challenges_select on public.weekly_challenges for select using (true);
-- Pas de policy INSERT/UPDATE : écritures uniquement via pick_weekly_challenge() (service role).

-- 2. Contribution cumulée par joueur et par semaine
create table if not exists public.weekly_challenge_contributions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  amount       int not null default 0,
  updated_at   timestamptz not null default now(),
  unique (challenge_id, user_id)
);
create index if not exists idx_wcc_challenge_amount on public.weekly_challenge_contributions(challenge_id, amount desc);
alter table public.weekly_challenge_contributions enable row level security;
drop policy if exists weekly_challenge_contributions_select on public.weekly_challenge_contributions;
create policy weekly_challenge_contributions_select on public.weekly_challenge_contributions
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles pr where pr.id = user_id and pr.is_private = false)
  );
-- Pas de policy INSERT/UPDATE : écritures uniquement via increment_weekly_challenge() (service role).

-- 3. Nouvelle catégorie d'achievement pour le défi hebdo
alter table public.achievements drop constraint if exists achievements_category_check;
alter table public.achievements add constraint achievements_category_check
  check (category in ('streak','wins','score','social','challenge'));

-- 4. Seed des 2 succès du défi hebdo
insert into public.achievements (id, name, description, icon, type, tiers, rarity, category) values
  ('weekly_challenge_hero', 'Effort collectif', 'A contribué à un défi communautaire hebdomadaire réussi', '🤝', 'one_time', null, 'common', 'challenge'),
  ('weekly_top_contributor', 'Meneur de la semaine', 'A terminé top contributeur d''un défi communautaire hebdomadaire', '🥇', 'one_time', null, 'epic', 'challenge')
on conflict (id) do nothing;

-- 5. Rotation + clôture atomique — appelée "lazily" à chaque visite (comme pick_daily_song)
-- `#variable_conflict use_column` : les colonnes de retour (id, status, type...) portent
-- les mêmes noms que les colonnes de weekly_challenges — sans ce pragma, Postgres refuse
-- toute référence non qualifiée par ambiguïté variable/colonne.
create or replace function public.pick_weekly_challenge()
returns table(
  id uuid, week_start date, week_end date, type text, target int,
  current_value int, status text, top_contributor_id uuid, top_contributor_amount int
)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  wk_start date := today - (extract(isodow from today)::int - 1); -- lundi de la semaine courante
  wk_end date := wk_start + 6;
  existing_id uuid;
  prev_row public.weekly_challenges%rowtype;
  top_row record;
  last_type text;
  types text[] := array['correct_answers','games_played','zikle_wins'];
  targets int[] := array[5000, 300, 150];
  next_idx int;
begin
  select wc.id into existing_id from public.weekly_challenges wc where wc.week_start = wk_start;
  if existing_id is not null then
    return query
      select wc.id, wc.week_start, wc.week_end, wc.type, wc.target, wc.current_value,
             wc.status, wc.top_contributor_id, wc.top_contributor_amount
      from public.weekly_challenges wc where wc.id = existing_id;
    return;
  end if;

  -- Clôture de toute semaine encore "active" et antérieure (normalement une seule)
  for prev_row in
    select * from public.weekly_challenges where status = 'active' and week_start < wk_start
  loop
    select c.user_id, c.amount into top_row
    from public.weekly_challenge_contributions c
    where c.challenge_id = prev_row.id
    order by c.amount desc, c.updated_at asc
    limit 1;

    update public.weekly_challenges set
      status = case when prev_row.current_value >= prev_row.target then 'success' else 'failed' end,
      top_contributor_id = top_row.user_id,
      top_contributor_amount = top_row.amount,
      closed_at = now()
    where id = prev_row.id;

    if prev_row.current_value >= prev_row.target then
      insert into public.user_achievements (user_id, achievement_id, tier)
      select c.user_id, 'weekly_challenge_hero', null
      from public.weekly_challenge_contributions c
      where c.challenge_id = prev_row.id
      on conflict (user_id, achievement_id, tier) do nothing;
    end if;

    if top_row.user_id is not null then
      insert into public.user_achievements (user_id, achievement_id, tier)
      values (top_row.user_id, 'weekly_top_contributor', null)
      on conflict (user_id, achievement_id, tier) do nothing;
    end if;
  end loop;

  -- Rotation : type suivant dans le cycle par rapport à la dernière semaine connue
  select type into last_type from public.weekly_challenges order by week_start desc limit 1;
  if last_type is null then
    next_idx := floor(random() * array_length(types, 1))::int;
  else
    next_idx := coalesce(array_position(types, last_type), 0) % array_length(types, 1);
  end if;

  insert into public.weekly_challenges (week_start, week_end, type, target)
  values (wk_start, wk_end, types[next_idx + 1], targets[next_idx + 1])
  on conflict (week_start) do nothing;

  return query
    select wc.id, wc.week_start, wc.week_end, wc.type, wc.target, wc.current_value,
           wc.status, wc.top_contributor_id, wc.top_contributor_amount
    from public.weekly_challenges wc where wc.week_start = wk_start;
end;
$$;
revoke execute on function public.pick_weekly_challenge() from public, anon, authenticated;

-- 6. Incrément atomique, ignoré si la semaine n'est pas ouverte pour ce type
create or replace function public.increment_weekly_challenge(
  p_type text, p_user_id uuid, p_amount int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  wk_start date := today - (extract(isodow from today)::int - 1);
  cid uuid;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then return; end if;

  select id into cid from public.weekly_challenges
  where week_start = wk_start and type = p_type and status = 'active';
  if cid is null then return; end if; -- semaine pas encore "picked", ou type différent cette semaine : no-op silencieux

  insert into public.weekly_challenge_contributions (challenge_id, user_id, amount)
  values (cid, p_user_id, p_amount)
  on conflict (challenge_id, user_id) do update
    set amount = weekly_challenge_contributions.amount + excluded.amount,
        updated_at = now();

  update public.weekly_challenges set current_value = current_value + p_amount where id = cid;
end;
$$;
revoke execute on function public.increment_weekly_challenge(text, uuid, int) from public, anon, authenticated;
