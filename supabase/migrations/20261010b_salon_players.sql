-- Joueurs d'une partie salon, pour l'admin (fiche joueur, stats). Séparé de
-- game_players : le salon ne compte ni dans les classements ni dans l'XP.
-- user_id n'est rempli que si le joueur était connecté sur son téléphone.

create table if not exists public.salon_players (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  username text not null,
  score int not null default 0,
  rank int,
  team text,
  created_at timestamptz not null default now()
);

create index if not exists salon_players_game_idx on public.salon_players (game_id);
create index if not exists salon_players_user_idx on public.salon_players (user_id) where user_id is not null;

alter table public.salon_players enable row level security;
