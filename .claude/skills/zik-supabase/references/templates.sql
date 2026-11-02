-- Gabarits SQL ZIK. Copier, adapter, garder les commentaires d'en-tête.

-- ── 1. Nouvelle table dans son schéma, RLS et droits explicites ─────────────
-- Migration : crée salon.venues (lieux des organisateurs).
-- Retour arrière : drop table salon.venues;
create schema if not exists salon;
revoke usage on schema salon from anon, authenticated;
grant usage on schema salon to service_role;

create table salon.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('bar', 'camping', 'entreprise', 'association', 'evenement', 'autre')),
  city text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index venues_owner_id_idx on salon.venues (owner_id);

alter table salon.venues enable row level security;
-- Schéma réservé au serveur : aucune politique pour anon/authenticated,
-- le serveur passe par service_role (getAdminClient), qui contourne RLS.
grant select, insert, update, delete on salon.venues to service_role;

-- ── 2. Table lue par le navigateur (schéma public), politiques par action ───
alter table public.example enable row level security;

create policy example_select_own on public.example
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy example_insert_own on public.example
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ── 3. Fonction réservée au serveur ─────────────────────────────────────────
create or replace function public.add_player_score(p_user_id uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_delta <= 0 then return; end if;
  update public.profiles set total_score = total_score + p_delta where id = p_user_id;
end;
$$;
revoke execute on function public.add_player_score(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_player_score(uuid, integer) to service_role;

-- ── 4. Fonction appelable par un utilisateur connecté, limitée à ses données ─
-- Le schéma salon est fermé à authenticated : la fonction passe en definer,
-- et c'est le filtre sur auth.uid() qui fait office de vérification de l'appelant.
create or replace function public.my_evenings()
returns table (game_id uuid, score integer, rank integer, team text)
language sql
security definer
set search_path = ''
as $$
  select sp.game_id, sp.score, sp.rank, sp.team
  from salon.salon_players sp
  where sp.user_id = (select auth.uid());
$$;
revoke execute on function public.my_evenings() from public, anon;
grant execute on function public.my_evenings() to authenticated;

-- ── 5. Index de clé étrangère manquant ──────────────────────────────────────
create index concurrently if not exists game_results_game_id_idx on public.game_results (game_id);
-- (concurrently ne passe pas dans une transaction : le mettre dans sa propre migration)

-- ── 6. Déplacer une table vers son schéma sans coupure ──────────────────────
-- Étape A (cette migration) : déplacer + vue de compatibilité.
alter table public.salon_players set schema salon;
create view public.salon_players with (security_invoker = true) as
  select * from salon.salon_players;
-- Étape B (migration suivante, une fois le code mis à jour) :
-- drop view public.salon_players;

-- ── 7. Purge planifiée (tables de surveillance) ─────────────────────────────
select cron.schedule(
  'purge-health-checks',
  '17 3 * * *',
  $$ delete from ops.health_checks where checked_at < now() - interval '30 days' $$
);
