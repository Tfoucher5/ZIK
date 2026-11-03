-- supabase/migrations/20260812_weekly_challenge_badge_tiers.sql
-- Le badge "meneur de la semaine" devient cumulable (paliers bronze/argent/or
-- selon le nombre de semaines où le joueur a été top contributeur), au lieu
-- d'un déblocage unique. Additive : aucun utilisateur n'a encore ce succès
-- en base (aucune semaine n'a encore été clôturée).

update public.achievements set
  type = 'tiered',
  tiers = '[{"level":"bronze","target":1,"rarity":"rare"},{"level":"silver","target":5,"rarity":"epic"},{"level":"gold","target":15,"rarity":"legendary"}]',
  description = 'A terminé top contributeur d''un défi communautaire hebdomadaire (paliers selon le nombre de fois)'
where id = 'weekly_top_contributor';

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
  top_count int;
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

    -- Badge cumulable : on recompte le nombre total de semaines où l'utilisateur
    -- a été top contributeur (celle-ci incluse, déjà écrite ci-dessus) et on
    -- débloque tous les paliers atteints pas encore possédés.
    if top_row.user_id is not null then
      select count(*) into top_count
      from public.weekly_challenges where top_contributor_id = top_row.user_id;

      insert into public.user_achievements (user_id, achievement_id, tier)
      select top_row.user_id, 'weekly_top_contributor', t.level
      from (values ('bronze', 1), ('silver', 5), ('gold', 15)) as t(level, target)
      where top_count >= t.target
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
