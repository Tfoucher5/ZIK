-- Défi de la semaine administrable : l'admin peut programmer le défi d'une
-- semaine future (ligne pré-insérée dans weekly_challenges).
--
-- Problème corrigé : pick_weekly_challenge() rendait la ligne de la semaine en
-- cours dès qu'elle existait, AVANT de clôturer les semaines précédentes. Avec
-- une semaine pré-insérée, la semaine d'avant restait donc "active" pour
-- toujours (pas de statut réussi/raté, pas de badges). La clôture passe
-- maintenant en premier, à chaque appel ; elle ne touche que les semaines
-- actives antérieures, donc elle ne fait rien une fois la semaine close.
-- `for update skip locked` évite que deux visites simultanées ne clôturent
-- (et ne distribuent les badges) deux fois.
-- La rotation automatique ignore aussi les semaines futures déjà programmées.
-- Idempotent.

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
  for prev_row in
    select * from public.weekly_challenges
    where status = 'active' and week_start < wk_start
    for update skip locked
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

  select wc.id into existing_id from public.weekly_challenges wc where wc.week_start = wk_start;
  if existing_id is null then
    select type into last_type from public.weekly_challenges
    where week_start < wk_start order by week_start desc limit 1;
    if last_type is null then
      next_idx := floor(random() * array_length(types, 1))::int;
    else
      next_idx := coalesce(array_position(types, last_type), 0) % array_length(types, 1);
    end if;

    insert into public.weekly_challenges (week_start, week_end, type, target)
    values (wk_start, wk_end, types[next_idx + 1], targets[next_idx + 1])
    on conflict (week_start) do nothing;
  end if;

  return query
    select wc.id, wc.week_start, wc.week_end, wc.type, wc.target, wc.current_value,
           wc.status, wc.top_contributor_id, wc.top_contributor_amount
    from public.weekly_challenges wc where wc.week_start = wk_start;
end;
$$;
revoke execute on function public.pick_weekly_challenge() from public, anon, authenticated;

-- Programme (ou remplace) le défi d'une semaine à venir. Refuse la semaine en
-- cours et les semaines passées : celles-là se modifient directement.
create or replace function public.admin_schedule_weekly_challenge(
  p_week_start date, p_type text, p_target int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  cur_start date := today - (extract(isodow from today)::int - 1);
begin
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'La semaine doit commencer un lundi';
  end if;
  if p_week_start <= cur_start then
    raise exception 'Seule une semaine à venir peut être programmée';
  end if;
  if p_type not in ('correct_answers','games_played','zikle_wins') or p_target is null or p_target <= 0 then
    raise exception 'Type ou objectif invalide';
  end if;

  insert into public.weekly_challenges (week_start, week_end, type, target)
  values (p_week_start, p_week_start + 6, p_type, p_target)
  on conflict (week_start) do update
    set type = excluded.type, target = excluded.target
    where public.weekly_challenges.status = 'active'
      and public.weekly_challenges.current_value = 0;
end;
$$;
revoke execute on function public.admin_schedule_weekly_challenge(date, text, int) from public, anon, authenticated;
grant execute on function public.admin_schedule_weekly_challenge(date, text, int) to service_role;
