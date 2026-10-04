-- supabase/migrations/20261004_cards_catalog.sql
-- Catalogue des cartes musicales (spec docs/specs/cartes.md, sections 3 et 6.1).
--
-- Additive : trois tables nouvelles et deux colonnes nullables sur tracks.
-- Les cartes possédées (user_cards, card_grants…) viendront avec l'attribution
-- en jeu ; ici on ne fait que décrire les titres du catalogue.
--
-- Écriture réservée au service role (serveur de jeu, script d'enrichissement) :
-- aucune policy d'écriture, lecture publique.

create table if not exists public.card_artists (
  deezer_id   bigint primary key,
  name        text not null,
  nb_fan      int,
  created_at  timestamptz not null default now()
);

create table if not exists public.card_albums (
  deezer_id      bigint primary key,
  artist_id      bigint not null references public.card_artists(deezer_id),
  title          text not null,
  record_type    text,                       -- album | ep | single | compile
  year           smallint,
  genre          text,
  cover_url      text,                       -- cover_xl Deezer (1000 px)
  cover_md_url   text,                       -- cover_medium Deezer (250 px)
  dominant_color text,                       -- teinte de fond de la carte, ex. #403829
  created_at     timestamptz not null default now()
);
create index if not exists card_albums_artist_idx on public.card_albums (artist_id);

create table if not exists public.cards (
  id                uuid primary key default gen_random_uuid(),
  number            int generated always as identity unique,
  deezer_track_id   bigint not null,
  artist_id         bigint not null references public.card_artists(deezer_id),
  album_id          bigint references public.card_albums(deezer_id),
  title_key         text not null,           -- titre nettoyé, sans mention de version
  title             text not null,
  artist            text not null,           -- affiché, avec feats
  year              smallint,
  isrc              text,
  deezer_rank       int not null,
  rarity            text not null check (rarity in
                      ('common','uncommon','rare','epic','legendary','mythic')),
  rarity_scale      smallint not null default 1,
  rarity_locked_at  timestamptz,             -- nul tant que la rareté est provisoire
  first_owner_id    uuid references public.profiles(id) on delete set null,
  first_owned_at    timestamptz,
  created_at        timestamptz not null default now(),
  unique (artist_id, title_key)
);
create index if not exists cards_album_idx on public.cards (album_id);
create index if not exists cards_rarity_idx on public.cards (rarity);
create index if not exists cards_first_owner_idx on public.cards (first_owner_id);
create index if not exists cards_provisional_idx on public.cards (created_at)
  where rarity_locked_at is null;

alter table public.tracks
  add column if not exists card_id uuid references public.cards(id) on delete set null,
  add column if not exists card_checked_at timestamptz;
create index if not exists tracks_card_idx on public.tracks (card_id);
create index if not exists tracks_card_unchecked_idx on public.tracks (id)
  where card_checked_at is null;

alter table public.card_artists enable row level security;
alter table public.card_albums  enable row level security;
alter table public.cards        enable row level security;

drop policy if exists card_artists_select on public.card_artists;
create policy card_artists_select on public.card_artists for select using (true);
drop policy if exists card_albums_select on public.card_albums;
create policy card_albums_select on public.card_albums for select using (true);
drop policy if exists cards_select on public.cards;
create policy cards_select on public.cards for select using (true);
