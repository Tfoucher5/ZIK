-- Prospection ZIK Pro : lieux contactés par e-mail (bars, campings, associations)
-- depuis theo@zik-music.fr, et leurs réponses.
--
-- prospects : remplie depuis OpenStreetMap (scripts/prospection/import.mjs).
-- Un e-mail n'apparaît qu'une fois : personne n'est contacté deux fois, et un
-- « stop » est définitif.
-- prospect_replies : réponses lues dans la boîte IONOS, triées par la routine
-- Claude, avec une proposition de réponse. Affichées sur /admin/prospection.

create table if not exists public.prospects (
  id bigint generated always as identity primary key,
  osm_id text unique,
  kind text not null check (kind in ('bar', 'camping', 'association')),
  name text not null,
  email text not null unique,
  website text,
  city text,
  postcode text,
  status text not null default 'new'
    check (status in ('new', 'sent', 'followed_up', 'replied', 'interested', 'unsubscribed', 'bounced')),
  message_id text,
  first_sent_at timestamptz,
  followup_sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists prospects_status_kind_idx
  on public.prospects (status, kind);

create table if not exists public.prospect_replies (
  id bigint generated always as identity primary key,
  prospect_id bigint references public.prospects (id) on delete cascade,
  message_id text unique not null,
  received_at timestamptz not null,
  from_email text not null,
  subject text,
  excerpt text,
  category text
    check (category in ('stop', 'interested', 'question', 'feedback', 'not_interested', 'bounce', 'other')),
  summary text,
  suggested_reply text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists prospect_replies_handled_idx
  on public.prospect_replies (handled, received_at desc);

alter table public.prospects enable row level security;
alter table public.prospect_replies enable row level security;
-- Aucune policy : accès par le service role (scripts, admin) uniquement.
