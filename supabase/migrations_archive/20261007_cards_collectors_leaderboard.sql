-- supabase/migrations/20261007_cards_collectors_leaderboard.sql
-- Classement des collectionneurs (onglet Cartes de /classements).
-- Score pondéré par rareté : Commune 1, Peu commune 2, Rare 4, Épique 8,
-- Légendaire 16, Mythique 32. Seules les cartes déjà visibles comptent
-- (visible_at), et les sets terminés de 3 cartes et plus.

create or replace function public.cards_collectors()
returns table(
  user_id uuid,
  username text,
  avatar_url text,
  score int,
  cards int,
  sets int,
  rank int
)
language sql stable security definer set search_path = public as $$
  with owned as (
    select uc.user_id,
           sum(case c.rarity
                 when 'common' then 1
                 when 'uncommon' then 2
                 when 'rare' then 4
                 when 'epic' then 8
                 when 'legendary' then 16
                 when 'mythic' then 32
               end)::int as score,
           count(*)::int as cards
      from user_cards uc
      join cards c on c.id = uc.card_id
     where uc.visible_at <= now()
     group by uc.user_id
  ),
  done as (
    select ucs.user_id, count(*)::int as sets
      from user_card_sets ucs
      join card_sets s on s.id = ucs.set_id
     where s.card_count >= 3
     group by ucs.user_id
  )
  select o.user_id, p.username, p.avatar_url, o.score, o.cards,
         coalesce(d.sets, 0),
         (rank() over (order by o.score desc, o.cards desc))::int
    from owned o
    join profiles p on p.id = o.user_id
    left join done d on d.user_id = o.user_id
   where p.username is not null;
$$;

create or replace function public.cards_leaderboard(p_offset int default 0, p_limit int default 20)
returns table(username text, avatar_url text, score int, cards int, sets int, rank int)
language sql stable security definer set search_path = public as $$
  select username, avatar_url, score, cards, sets, rank
    from cards_collectors()
   order by rank, username
  offset greatest(p_offset, 0)
   limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.cards_leaderboard_my_rank(p_user_id uuid)
returns table(username text, avatar_url text, score int, cards int, sets int, rank int)
language sql stable security definer set search_path = public as $$
  select username, avatar_url, score, cards, sets, rank
    from cards_collectors()
   where user_id = p_user_id;
$$;

-- Appelées uniquement par le serveur (service role), cf. 20260805.
revoke execute on function public.cards_collectors() from public, anon, authenticated;
revoke execute on function public.cards_leaderboard(int, int) from public, anon, authenticated;
revoke execute on function public.cards_leaderboard_my_rank(uuid) from public, anon, authenticated;
