-- supabase/migrations/20260813_weekly_challenge_repeatable_count.sql
-- Remplace l'approche "paliers bronze/argent/or" (20260812) par un compteur : les
-- badges "Effort collectif" et "Meneur de la semaine" restent uniques mais affichent
-- un ×N sur le profil quand ils ont été obtenus plusieurs fois (une fois par semaine
-- où le joueur a rempli la condition), plutôt que de progresser en paliers.

alter table public.user_achievements
  add column if not exists count int not null default 1;

update public.achievements set
  type = 'one_time',
  tiers = null,
  description = 'A terminé top contributeur d''un défi communautaire hebdomadaire'
where id = 'weekly_top_contributor';

update public.achievements set
  description = 'A contribué à un défi communautaire hebdomadaire réussi'
where id = 'weekly_challenge_hero';

create or replace function public.pick_weekly_challenge()
returns table(
  id uuid, week_start date, week_end date, type text, target int,
  current_value int, status text, top_contributor_id uuid, top_contributor_amount int
)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  wk_start date := today - (extract(isodow from today)::int - 1);
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

    -- Badge répétable : un même joueur peut le débloquer plusieurs semaines de suite,
    -- chaque occurrence incrémente `count` au lieu de rester bloquée par la contrainte
    -- unique (user_id, achievement_id, tier).
    if prev_row.current_value >= prev_row.target then
      insert into public.user_achievements (user_id, achievement_id, tier, count)
      select c.user_id, 'weekly_challenge_hero', null, 1
      from public.weekly_challenge_contributions c
      where c.challenge_id = prev_row.id
      on conflict (user_id, achievement_id, tier) do update
        set count = public.user_achievements.count + 1,
            unlocked_at = now();
    end if;

    if top_row.user_id is not null then
      insert into public.user_achievements (user_id, achievement_id, tier, count)
      values (top_row.user_id, 'weekly_top_contributor', null, 1)
      on conflict (user_id, achievement_id, tier) do update
        set count = public.user_achievements.count + 1,
            unlocked_at = now();
    end if;
  end loop;

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
