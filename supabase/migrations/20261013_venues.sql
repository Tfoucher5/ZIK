-- Lieux ZIK Pro : un bar, une asso ou un camping qui organise ses soirées
-- blind test. Page publique /lieu/<slug>, logo sur la TV et classement du mois
-- de ses habitués. Lu et écrit uniquement par le serveur (clé service).

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  city text not null,
  address text,
  website text,
  description text,
  schedule text,
  welcome text,
  color text,
  logo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venues_city_idx on public.venues (lower(city));

alter table public.venues enable row level security;

create table if not exists public.venue_events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  starts_at timestamptz not null,
  theme text,
  created_at timestamptz not null default now()
);

create index if not exists venue_events_venue_idx on public.venue_events (venue_id, starts_at);

alter table public.venue_events enable row level security;

alter table public.games add column if not exists venue_id uuid references public.venues(id) on delete set null;

create index if not exists games_venue_idx on public.games (venue_id, started_at) where venue_id is not null;

-- Classement d'un lieu depuis une date : un joueur connecté compte par son
-- compte, un invité par son pseudo. Une soirée = un jour (heure de Paris).
create or replace function public.venue_league(p_venue uuid, p_since timestamptz)
returns table (name text, points bigint, nights bigint, wins bigint)
language sql
stable
as $$
  select
    (array_agg(sp.username order by sp.created_at desc))[1] as name,
    sum(sp.score)::bigint as points,
    count(distinct (g.started_at at time zone 'Europe/Paris')::date)::bigint as nights,
    count(*) filter (where sp.rank = 1)::bigint as wins
  from public.games g
  join public.salon_players sp on sp.game_id = g.id
  where g.venue_id = p_venue and g.started_at >= p_since
  group by coalesce(sp.user_id::text, lower(trim(sp.username)))
  order by points desc, nights desc
  limit 50;
$$;

revoke execute on function public.venue_league(uuid, timestamptz) from public, anon, authenticated;

-- Joueurs inscrits qui suivent un lieu : prévenus quand il annonce une soirée.
create table if not exists public.venue_follows (
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (venue_id, user_id)
);

create index if not exists venue_follows_user_idx on public.venue_follows (user_id);

alter table public.venue_follows enable row level security;

-- Une soirée n'est annoncée qu'une fois à ceux qui suivent le lieu
alter table public.venue_events add column if not exists notified_at timestamptz;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accept', 'room_invite',
    'card_up', 'card_mythic', 'card_set_near',
    'announcement', 'news', 'venue_event'
  ));

-- Catégorie « venues » des notifications sur l'appareil, activée par défaut
alter table public.profiles
  alter column notif_prefs
  set default '{"social": true, "cards": true, "challenge": true, "zikle": false, "updates": true, "venues": true}'::jsonb;

update public.profiles
  set notif_prefs = notif_prefs || '{"venues": true}'::jsonb
  where not (notif_prefs ? 'venues');
