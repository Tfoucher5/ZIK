-- supabase/migrations/20261001_zik_pro.sql
-- ZIK Pro : l'offre payante du mode salon (bars, campings, événements).
--
-- Une ligne par compte. Le paiement n'est pas encore branché : les accès Pro
-- sont donnés à la main depuis l'admin (plan 'manual') aux premiers lieux
-- testeurs. Les colonnes Stripe serviront quand le paiement sera en ligne.

create table if not exists public.pro_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('night', 'monthly', 'yearly', 'manual')),
  status text not null default 'active'
    check (status in ('active', 'canceled', 'past_due')),
  current_period_end timestamptz not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pro_subscriptions enable row level security;

-- Chacun voit son propre abonnement (page /salon : options Pro débloquées)
drop policy if exists "pro_subscriptions_select_own" on public.pro_subscriptions;
create policy "pro_subscriptions_select_own" on public.pro_subscriptions
  for select using (auth.uid() = user_id);

-- Lieux intéressés par ZIK Pro avant l'ouverture du paiement : mesure la
-- demande et donne une liste à prévenir le jour du lancement.
create table if not exists public.pro_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  venue text,
  venue_type text,
  plan text,
  user_id uuid references auth.users (id) on delete set null
);

alter table public.pro_waitlist enable row level security;
-- Aucune policy : écriture par le serveur (service role) uniquement.
