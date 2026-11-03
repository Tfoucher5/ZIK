-- supabase/migrations/20261008_push_notifications.sql
-- Notifications sur l'appareil (Web Push), même site fermé.
-- push_subscriptions : un abonnement par navigateur/appareil d'un joueur.
-- profiles.notif_prefs : catégories activées (social, cards, challenge, zikle).
-- notification_once : clés déjà envoyées, pour qu'un envoi planifié ou une
-- alerte « plus qu'une carte » ne parte qu'une fois, même après redémarrage.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
-- Lecture et écriture par le serveur uniquement (service role)
alter table public.push_subscriptions enable row level security;

alter table public.profiles
  add column if not exists notif_prefs jsonb not null
  default '{"social": true, "cards": true, "challenge": true, "zikle": false}'::jsonb;

create table if not exists public.notification_once (
  key text primary key,
  created_at timestamptz not null default now()
);
alter table public.notification_once enable row level security;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accept', 'room_invite', 'card_up', 'card_mythic', 'card_set_near'));
