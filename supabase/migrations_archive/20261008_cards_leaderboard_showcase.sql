-- supabase/migrations/20261008_cards_leaderboard_showcase.sql
-- Vitrine du classement des collectionneurs (onglet Cartes de /classements) :
-- cartes par rareté et les 3 plus rares de chaque joueur. Profil privé : pas
-- de cartes montrées, seulement les compteurs (déjà visibles via le score).

create or replace function public.cards_showcase(p_user_ids uuid[])
returns table(user_id uuid, by_rarity jsonb, best uuid[])
language sql stable security definer set search_path = public as $$
  with owned as (
    select uc.user_id, c.id, c.rarity, c.deezer_rank,
           array_position(array['mythic','legendary','epic','rare','uncommon','common'], c.rarity) as tier
      from user_cards uc
      join cards c on c.id = uc.card_id
     where uc.user_id = any(p_user_ids)
       and uc.visible_at <= now()
  ),
  counts as (
    select o.user_id, jsonb_object_agg(o.rarity, o.n) as by_rarity
      from (select user_id, rarity, count(*)::int as n from owned group by user_id, rarity) o
     group by o.user_id
  ),
  ranked as (
    select o.user_id, o.id,
           row_number() over (partition by o.user_id order by o.tier, o.deezer_rank desc) as pos
      from owned o
      join profiles p on p.id = o.user_id
     where not coalesce(p.is_private, false)
  )
  select c.user_id, c.by_rarity,
         coalesce((select array_agg(r.id order by r.pos) from ranked r
                    where r.user_id = c.user_id and r.pos <= 3), '{}')
    from counts c;
$$;

-- Appelée uniquement par le serveur (service role), cf. 20260805.
revoke execute on function public.cards_showcase(uuid[]) from public, anon, authenticated;
