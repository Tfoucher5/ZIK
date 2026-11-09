-- « Mes soirées » sur le profil : chaque joueur connecté lit ses propres lignes
-- de salon_players. Colonne departed : joueur parti avant la fin de la partie,
-- affiché « a quitté avant la fin » avec son score au moment du départ.
-- Pourquoi : phase 3 du plan, section « Mes soirées » sur le profil.
-- Écriture inchangée : le serveur seul, par service_role (salon/persist.js).
-- Pour défaire :
--   drop policy if exists salon_players_select_own on public.salon_players;
--   alter table public.salon_players drop column if exists departed;

alter table public.salon_players
  add column if not exists departed boolean not null default false;

alter table public.salon_players enable row level security;

drop policy if exists salon_players_select_own on public.salon_players;
create policy salon_players_select_own on public.salon_players
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.salon_players from public, anon, authenticated;
grant select on table public.salon_players to authenticated;
grant all on table public.salon_players to service_role;
revoke all on sequence public.salon_players_id_seq from public, anon, authenticated;
