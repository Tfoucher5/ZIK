-- supabase/migrations/20261005_cards_ownership.sql
-- Cartes possédées, journal d'attribution, sets et taux de réussite
-- (spec docs/specs/cartes.md, sections 1, 4 et 6).
--
-- Additive. Écriture réservée au service role (serveur de jeu) via les
-- fonctions ci-dessous ; aucune policy d'écriture côté client.

-- ── Cartes possédées ───────────────────────────────────────────────────────
create table if not exists public.user_cards (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  card_id           uuid not null references public.cards(id) on delete cascade,
  copies            int not null default 1 check (copies >= 1),
  first_obtained_at timestamptz not null default now(),
  last_obtained_at  timestamptz not null default now(),
  visible_at        timestamptz not null default now(),   -- compte de moins de 24 h
  primary key (user_id, card_id)
);
create index if not exists user_cards_card_idx on public.user_cards (card_id);
create index if not exists user_cards_user_date_idx
  on public.user_cards (user_id, first_obtained_at desc);

-- ── Journal : une ligne par carte gagnée en manche ─────────────────────────
create table if not exists public.card_grants (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  card_id         uuid not null references public.cards(id) on delete cascade,
  game_id         uuid references public.games(id) on delete set null,
  room_id         text not null,
  round           smallint not null,
  mode            text not null check (mode in ('classic','qcm')),
  answer_ms       int not null,
  active_accounts smallint not null,
  ip_hash         text not null,
  delayed         boolean not null default false,
  status          text not null default 'pending'
                    check (status in ('pending','granted','lost','revoked')),
  created_at      timestamptz not null default now(),
  settled_at      timestamptz
);
create index if not exists card_grants_user_idx on public.card_grants (user_id, created_at desc);
create index if not exists card_grants_card_idx on public.card_grants (card_id);
create index if not exists card_grants_game_idx on public.card_grants (game_id);
create index if not exists card_grants_pending_idx on public.card_grants (user_id)
  where status = 'pending';

-- ── Signaux pour l'admin (jamais bloquants) ────────────────────────────────
create table if not exists public.card_signals (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  grant_id   bigint references public.card_grants(id) on delete cascade,
  reason     text not null,
  details    jsonb,
  reviewed   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists card_signals_user_idx on public.card_signals (user_id);
create index if not exists card_signals_grant_idx on public.card_signals (grant_id);
create index if not exists card_signals_open_idx on public.card_signals (created_at desc)
  where not reviewed;

-- ── Taux de réussite par titre (affichage) ─────────────────────────────────
create table if not exists public.track_stats (
  track_id        uuid primary key references public.tracks(id) on delete cascade,
  rounds_played   int not null default 0,
  players_exposed int not null default 0,
  found_full      int not null default 0,
  last_played_at  timestamptz
);

-- ── Sets : artiste et album ────────────────────────────────────────────────
create table if not exists public.card_sets (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('artist','album','theme')),
  key        text not null,
  name       text not null,
  cover_url  text,
  card_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, key)
);

create table if not exists public.card_set_items (
  set_id  uuid not null references public.card_sets(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  primary key (set_id, card_id)
);
create index if not exists card_set_items_card_idx on public.card_set_items (card_id);

create table if not exists public.user_card_sets (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  set_id       uuid not null references public.card_sets(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, set_id)
);
create index if not exists user_card_sets_set_idx on public.user_card_sets (set_id);

-- Rattache une carte à ses sets. Un set n'est montré qu'à partir de 3 cartes
-- (card_count), mais il existe dès la première pour que le compte soit juste.
create or replace function public.attach_card_to_sets(p_card_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  c record;
  v_set uuid;
begin
  select cards.id, cards.artist_id, cards.album_id,
         ar.name as artist_name, al.title as album_title,
         al.record_type, al.cover_url
    into c
    from cards
    join card_artists ar on ar.deezer_id = cards.artist_id
    left join card_albums al on al.deezer_id = cards.album_id
   where cards.id = p_card_id;
  if not found then return; end if;

  insert into card_sets (kind, key, name, cover_url)
  values ('artist', c.artist_id::text, c.artist_name, c.cover_url)
  on conflict (kind, key) do update set cover_url = coalesce(card_sets.cover_url, excluded.cover_url)
  returning id into v_set;
  insert into card_set_items values (v_set, c.id) on conflict do nothing;

  if c.album_id is not null and c.record_type in ('album', 'ep') then
    insert into card_sets (kind, key, name, cover_url)
    values ('album', c.album_id::text, c.album_title, c.cover_url)
    on conflict (kind, key) do update set name = excluded.name
    returning id into v_set;
    insert into card_set_items values (v_set, c.id) on conflict do nothing;
  end if;

  update card_sets s
     set card_count = (select count(*) from card_set_items i where i.set_id = s.id)
   where s.id in (select set_id from card_set_items where card_id = c.id);
end;
$$;

create or replace function public.cards_after_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform attach_card_to_sets(new.id);
  return new;
end;
$$;

drop trigger if exists cards_attach_sets on public.cards;
create trigger cards_attach_sets after insert on public.cards
  for each row execute function public.cards_after_insert();

-- Cartes déjà créées par l'enrichissement avant cette migration
do $$
declare r record;
begin
  for r in select id from public.cards loop
    perform public.attach_card_to_sets(r.id);
  end loop;
end;
$$;

-- ── Taux de réussite : incrément atomique en fin de manche ─────────────────
create or replace function public.record_round_stats(
  p_track_id uuid, p_exposed int, p_found int
) returns void
language sql security definer set search_path = public
as $$
  insert into track_stats (track_id, rounds_played, players_exposed, found_full, last_played_at)
  values (p_track_id, 1, p_exposed, p_found, now())
  on conflict (track_id) do update set
    rounds_played   = track_stats.rounds_played + 1,
    players_exposed = track_stats.players_exposed + excluded.players_exposed,
    found_full      = track_stats.found_full + excluded.found_full,
    last_played_at  = now();
$$;

-- ── Attribution définitive des cartes provisoires d'un joueur ──────────────
-- p_keep = false : cartes perdues (départ avant la moitié de la partie).
-- Idempotente : seules les lignes encore 'pending' sont traitées.
-- Retourne { cards: [{ card_id, is_new, copies }], sets: [{ id, kind, name }] }.
create or replace function public.card_settle(
  p_user_id uuid, p_grant_ids bigint[], p_keep boolean
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  g record;
  v_new boolean;
  v_copies int;
  v_visible timestamptz;
  v_cards jsonb := '[]'::jsonb;
  v_sets jsonb := '[]'::jsonb;
  s record;
begin
  for g in
    select * from card_grants
     where id = any(p_grant_ids) and user_id = p_user_id and status = 'pending'
     order by id
     for update
  loop
    if not p_keep then
      update card_grants set status = 'lost', settled_at = now() where id = g.id;
      continue;
    end if;

    v_visible := case when g.delayed
      then greatest(now(), (select created_at + interval '24 hours' from profiles where id = p_user_id))
      else now() end;

    insert into user_cards (user_id, card_id, visible_at)
    values (p_user_id, g.card_id, v_visible)
    on conflict (user_id, card_id) do update set
      copies = user_cards.copies + 1,
      last_obtained_at = now()
    returning (xmax = 0), copies into v_new, v_copies;

    update card_grants set status = 'granted', settled_at = now() where id = g.id;
    update cards set first_owner_id = p_user_id, first_owned_at = now()
     where id = g.card_id and first_owner_id is null;

    v_cards := v_cards || jsonb_build_object('card_id', g.card_id, 'is_new', v_new, 'copies', v_copies);

    if v_new then
      for s in
        select cs.id, cs.kind, cs.name
          from card_set_items i
          join card_sets cs on cs.id = i.set_id
         where i.card_id = g.card_id
           and cs.card_count >= 3
           and not exists (select 1 from user_card_sets u where u.user_id = p_user_id and u.set_id = cs.id)
           and not exists (
             select 1 from card_set_items i2
              where i2.set_id = cs.id
                and not exists (select 1 from user_cards uc where uc.user_id = p_user_id and uc.card_id = i2.card_id)
           )
      loop
        insert into user_card_sets (user_id, set_id) values (p_user_id, s.id) on conflict do nothing;
        v_sets := v_sets || jsonb_build_object('id', s.id, 'kind', s.kind, 'name', s.name);
      end loop;
    end if;
  end loop;

  return jsonb_build_object('cards', v_cards, 'sets', v_sets);
end;
$$;

revoke all on function public.attach_card_to_sets(uuid) from public, anon, authenticated;
revoke all on function public.cards_after_insert() from public, anon, authenticated;
revoke all on function public.record_round_stats(uuid, int, int) from public, anon, authenticated;
revoke all on function public.card_settle(uuid, bigint[], boolean) from public, anon, authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.user_cards     enable row level security;
alter table public.card_grants    enable row level security;
alter table public.card_signals   enable row level security;
alter table public.track_stats    enable row level security;
alter table public.card_sets      enable row level security;
alter table public.card_set_items enable row level security;
alter table public.user_card_sets enable row level security;

drop policy if exists track_stats_select on public.track_stats;
create policy track_stats_select on public.track_stats for select using (true);
drop policy if exists card_sets_select on public.card_sets;
create policy card_sets_select on public.card_sets for select using (true);
drop policy if exists card_set_items_select on public.card_set_items;
create policy card_set_items_select on public.card_set_items for select using (true);

-- Sa propre collection en entier ; celle des autres si le profil est public
-- et sans les cartes encore en attente
drop policy if exists user_cards_select on public.user_cards;
create policy user_cards_select on public.user_cards for select using (
  user_id = (select auth.uid())
  or (
    visible_at <= now()
    and exists (select 1 from public.profiles p where p.id = user_id and p.is_private = false)
  )
);
drop policy if exists user_card_sets_select on public.user_card_sets;
create policy user_card_sets_select on public.user_card_sets for select using (
  user_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = user_id and p.is_private = false)
);
-- card_grants, card_signals : aucune policy, lecture admin (service role) seulement
