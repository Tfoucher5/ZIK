-- Phase 4 du plan : schémas par domaine, lot cards.
-- cards : cards, card_albums, card_artists, card_sets, card_set_items,
--   user_cards, user_card_sets (lus par l'API, protégés par les RLS),
--   card_grants, card_signals (serveur seulement, sans politique).
-- Fonctions du domaine recréées dans cards, security invoker (seul
-- service_role les exécute), search_path vide, noms qualifiés. Les anciennes
-- public.card_settle, cards_leaderboard, cards_leaderboard_my_rank,
-- cards_showcase et cards_collectors restent pour le code encore en prod et
-- partent avec les vues de compatibilité.
-- Liens entre schémas (PostgREST ne suit pas une clé étrangère d'un schéma à
-- l'autre, ni un embarquement imbriqué après un lien) :
--   cards.first_owner(cards.cards) : premier propriétaire (public.profiles) ;
--   public.cards(public.tracks) : carte d'un titre, rendue par la vue
--   cards.card_view qui porte déjà son album et son artiste en jsonb.
-- Prérequis hors migration : cards dans « Exposed schemas » (Settings > Data API).
-- Pour défaire : drop des vues public.*, de cards.card_view et des fonctions
-- cards.*, alter table cards.<table> set schema public, recréer le trigger et
-- les fonctions de 20261102220000_baseline.sql.

create schema if not exists cards;
revoke all on schema cards from public;
grant usage on schema cards to anon, authenticated, service_role;

alter table public.card_artists set schema cards;
alter table public.card_albums set schema cards;
alter table public.cards set schema cards;
alter table public.card_sets set schema cards;
alter table public.card_set_items set schema cards;
alter table public.user_cards set schema cards;
alter table public.user_card_sets set schema cards;
alter table public.card_grants set schema cards;
alter table public.card_signals set schema cards;

revoke all on cards.card_artists, cards.card_albums, cards.cards, cards.card_sets,
  cards.card_set_items, cards.user_cards, cards.user_card_sets, cards.card_grants,
  cards.card_signals from public, anon, authenticated;
grant select on cards.card_artists, cards.card_albums, cards.cards, cards.card_sets,
  cards.card_set_items, cards.user_cards, cards.user_card_sets to anon, authenticated;
grant select, insert, update, delete on cards.card_artists, cards.card_albums,
  cards.cards, cards.card_sets, cards.card_set_items, cards.user_cards,
  cards.user_card_sets, cards.card_grants, cards.card_signals to service_role;

revoke all on sequence cards.cards_number_seq, cards.card_grants_id_seq,
  cards.card_signals_id_seq from public, anon, authenticated;
grant usage, select on sequence cards.cards_number_seq, cards.card_grants_id_seq,
  cards.card_signals_id_seq to service_role;

-- ── Carte prête à afficher (forme de CARD_SELECT, cardView.js) ───────────────

create view cards.card_view with (security_invoker = true) as
  select c.id, c.number, c.title, c.artist, c.artist_id, c.album_id, c.year,
         c.rarity, c.deezer_rank, c.rarity_locked_at, c.deezer_track_id,
         case when al.deezer_id is not null then jsonb_build_object(
           'title', al.title, 'genre', al.genre, 'cover_url', al.cover_url,
           'cover_md_url', al.cover_md_url, 'dominant_color', al.dominant_color)
         end as card_albums,
         case when ar.deezer_id is not null then jsonb_build_object('nb_fan', ar.nb_fan)
         end as card_artists
    from cards.cards c
    left join cards.card_albums al on al.deezer_id = c.album_id
    left join cards.card_artists ar on ar.deezer_id = c.artist_id;

revoke all on cards.card_view from public, anon, authenticated;
grant select on cards.card_view to anon, authenticated, service_role;

-- ── Fonctions de lien ────────────────────────────────────────────────────────

create or replace function cards.first_owner(cards.cards)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.first_owner_id $$;

-- Les salons lisent leurs titres avec la clé anonyme (socket/salon/tracks.js).
create or replace function public.cards(public.tracks)
  returns setof cards.card_view rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from cards.card_view where id = $1.card_id $$;

revoke execute on function cards.first_owner(cards.cards), public.cards(public.tracks)
  from public, anon, authenticated;
grant execute on function cards.first_owner(cards.cards) to service_role;
grant execute on function public.cards(public.tracks) to anon, service_role;

-- ── Fonctions du domaine ─────────────────────────────────────────────────────

create or replace function cards.attach_card_to_sets(p_card_id uuid)
 returns void
 language plpgsql
 security invoker
 set search_path = ''
as $function$
declare
  c record;
  v_set uuid;
begin
  select k.id, k.artist_id, k.album_id,
         ar.name as artist_name, al.title as album_title,
         al.record_type, al.cover_url
    into c
    from cards.cards k
    join cards.card_artists ar on ar.deezer_id = k.artist_id
    left join cards.card_albums al on al.deezer_id = k.album_id
   where k.id = p_card_id;
  if not found then return; end if;

  insert into cards.card_sets (kind, key, name, cover_url)
  values ('artist', c.artist_id::text, c.artist_name, c.cover_url)
  on conflict (kind, key) do update set cover_url = coalesce(card_sets.cover_url, excluded.cover_url)
  returning id into v_set;
  insert into cards.card_set_items values (v_set, c.id) on conflict do nothing;

  if c.album_id is not null and c.record_type in ('album', 'ep') then
    insert into cards.card_sets (kind, key, name, cover_url)
    values ('album', c.album_id::text, c.album_title, c.cover_url)
    on conflict (kind, key) do update set name = excluded.name
    returning id into v_set;
    insert into cards.card_set_items values (v_set, c.id) on conflict do nothing;
  end if;

  update cards.card_sets s
     set card_count = (select count(*) from cards.card_set_items i where i.set_id = s.id)
   where s.id in (select set_id from cards.card_set_items where card_id = c.id);
end;
$function$;

create or replace function cards.cards_after_insert()
 returns trigger
 language plpgsql
 security invoker
 set search_path = ''
as $function$
begin
  perform cards.attach_card_to_sets(new.id);
  return new;
end;
$function$;

drop trigger cards_attach_sets on cards.cards;
create trigger cards_attach_sets after insert on cards.cards
  for each row execute function cards.cards_after_insert();
drop function public.cards_after_insert();
drop function public.attach_card_to_sets(uuid);

create or replace function cards.card_settle(p_user_id uuid, p_grant_ids bigint[], p_keep boolean)
 returns jsonb
 language plpgsql
 security invoker
 set search_path = ''
as $function$
declare
  g record;
  v_new boolean;
  v_visible timestamptz;
  v_cards jsonb := '[]'::jsonb;
  v_sets jsonb := '[]'::jsonb;
  s record;
begin
  for g in
    select * from cards.card_grants
     where id = any(p_grant_ids) and user_id = p_user_id and status = 'pending'
     order by id
     for update
  loop
    if not p_keep then
      update cards.card_grants set status = 'lost', settled_at = now() where id = g.id;
      continue;
    end if;

    v_visible := case when g.delayed
      then greatest(now(), (select created_at + interval '24 hours' from public.profiles where id = p_user_id))
      else now() end;

    insert into cards.user_cards (user_id, card_id, visible_at)
    values (p_user_id, g.card_id, v_visible)
    on conflict (user_id, card_id) do nothing;
    v_new := found;

    update cards.card_grants set status = 'granted', settled_at = now() where id = g.id;
    update cards.cards set first_owner_id = p_user_id, first_owned_at = now()
     where id = g.card_id and first_owner_id is null;

    v_cards := v_cards || jsonb_build_object('card_id', g.card_id, 'is_new', v_new);

    if v_new then
      for s in
        select cs.id, cs.kind, cs.name
          from cards.card_set_items i
          join cards.card_sets cs on cs.id = i.set_id
         where i.card_id = g.card_id
           and cs.card_count >= 3
           and not exists (select 1 from cards.user_card_sets u where u.user_id = p_user_id and u.set_id = cs.id)
           and not exists (
             select 1 from cards.card_set_items i2
              where i2.set_id = cs.id
                and not exists (select 1 from cards.user_cards uc where uc.user_id = p_user_id and uc.card_id = i2.card_id)
           )
      loop
        insert into cards.user_card_sets (user_id, set_id) values (p_user_id, s.id) on conflict do nothing;
        v_sets := v_sets || jsonb_build_object('id', s.id, 'kind', s.kind, 'name', s.name);
      end loop;
    end if;
  end loop;

  return jsonb_build_object('cards', v_cards, 'sets', v_sets);
end;
$function$;

create or replace function cards.cards_collectors()
 returns table(user_id uuid, username text, avatar_url text, score integer, cards integer, sets integer, rank integer)
 language sql
 stable security invoker
 set search_path = ''
as $function$
  with owned as (
    select uc.user_id,
           sum(case c.rarity
                 when 'common' then 1 when 'uncommon' then 2 when 'rare' then 4
                 when 'epic' then 8 when 'legendary' then 16 when 'mythic' then 32
               end)::int as score,
           count(*)::int as cards
      from cards.user_cards uc
      join cards.cards c on c.id = uc.card_id
     where uc.visible_at <= now()
     group by uc.user_id
  ),
  done as (
    select ucs.user_id, count(*)::int as sets
      from cards.user_card_sets ucs
      join cards.card_sets s on s.id = ucs.set_id
     where s.card_count >= 3
     group by ucs.user_id
  )
  select o.user_id, p.username, p.avatar_url, o.score, o.cards,
         coalesce(d.sets, 0),
         (rank() over (order by o.score desc, o.cards desc))::int
    from owned o
    join public.profiles p on p.id = o.user_id
    left join done d on d.user_id = o.user_id
   where p.username is not null;
$function$;

create or replace function cards.cards_leaderboard(p_offset integer default 0, p_limit integer default 20)
 returns table(username text, avatar_url text, score integer, cards integer, sets integer, rank integer)
 language sql
 stable security invoker
 set search_path = ''
as $function$
  select username, avatar_url, score, cards, sets, rank
    from cards.cards_collectors()
   order by rank, username
  offset greatest(p_offset, 0)
   limit least(greatest(p_limit, 1), 50);
$function$;

create or replace function cards.cards_leaderboard_my_rank(p_user_id uuid)
 returns table(username text, avatar_url text, score integer, cards integer, sets integer, rank integer)
 language sql
 stable security invoker
 set search_path = ''
as $function$
  select username, avatar_url, score, cards, sets, rank
    from cards.cards_collectors()
   where user_id = p_user_id;
$function$;

create or replace function cards.cards_showcase(p_user_ids uuid[])
 returns table(user_id uuid, by_rarity jsonb, best uuid[])
 language sql
 stable security invoker
 set search_path = ''
as $function$
  with owned as (
    select uc.user_id, c.id, c.rarity, c.deezer_rank,
           array_position(array['mythic','legendary','epic','rare','uncommon','common'], c.rarity) as tier
      from cards.user_cards uc
      join cards.cards c on c.id = uc.card_id
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
      join public.profiles p on p.id = o.user_id
     where not coalesce(p.is_private, false)
  )
  select c.user_id, c.by_rarity,
         coalesce((select array_agg(r.id order by r.pos) from ranked r
                    where r.user_id = c.user_id and r.pos <= 3), '{}')
    from counts c;
$function$;

revoke execute on function cards.attach_card_to_sets(uuid), cards.cards_after_insert(),
  cards.card_settle(uuid, bigint[], boolean), cards.cards_collectors(),
  cards.cards_leaderboard(integer, integer), cards.cards_leaderboard_my_rank(uuid),
  cards.cards_showcase(uuid[])
  from public, anon, authenticated;
grant execute on function cards.attach_card_to_sets(uuid), cards.cards_after_insert(),
  cards.card_settle(uuid, bigint[], boolean), cards.cards_collectors(),
  cards.cards_leaderboard(integer, integer), cards.cards_leaderboard_my_rank(uuid),
  cards.cards_showcase(uuid[])
  to service_role;

-- ── Vues de compatibilité (à supprimer après la mise en prod du code) ────────

create view public.card_artists with (security_invoker = true) as select * from cards.card_artists;
create view public.card_albums with (security_invoker = true) as select * from cards.card_albums;
create view public.cards with (security_invoker = true) as select * from cards.cards;
create view public.card_sets with (security_invoker = true) as select * from cards.card_sets;
create view public.card_set_items with (security_invoker = true) as select * from cards.card_set_items;
create view public.user_cards with (security_invoker = true) as select * from cards.user_cards;
create view public.user_card_sets with (security_invoker = true) as select * from cards.user_card_sets;
create view public.card_grants with (security_invoker = true) as select * from cards.card_grants;
create view public.card_signals with (security_invoker = true) as select * from cards.card_signals;

revoke all on public.card_artists, public.card_albums, public.cards, public.card_sets,
  public.card_set_items, public.user_cards, public.user_card_sets,
  public.card_grants, public.card_signals from public, anon, authenticated;
grant select on public.card_artists, public.card_albums, public.cards, public.card_sets,
  public.card_set_items, public.user_cards, public.user_card_sets to anon, authenticated;
grant select, insert, update, delete on public.card_artists, public.card_albums,
  public.cards, public.card_sets, public.card_set_items, public.user_cards, public.user_card_sets,
  public.card_grants, public.card_signals to service_role;

notify pgrst, 'reload schema';
