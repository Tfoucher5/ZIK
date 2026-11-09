-- Seul le serveur écrit les parties et les scores (service_role). Lecture publique
-- inchangée : profils, classements et statistiques la lisent avec la clé anonyme.
-- Pourquoi : phase 4 du plan, RLS resserrées. Prérequis tenu : le serveur écrit
-- ces tables avec getAdminClient() depuis la v3.25.1.
-- Attention : un retour à une version antérieure à la v3.25.1 n'enregistrerait
-- plus les parties tant que cette migration n'est pas défaite.
-- Pour défaire : recréer les quatre politiques et rendre les droits, soit
--   create policy "Games créables par tous" on public.games for insert with check (true);
--   create policy "Games modifiables par tous" on public.games for update using (true);
--   create policy "Game players insérables par tous" on public.game_players for insert with check (true);
--   create policy "Game players modifiables par tous" on public.game_players for update using (true);
--   grant all on table public.games, public.game_players to anon, authenticated;

drop policy if exists "Games créables par tous" on public.games;
drop policy if exists "Games modifiables par tous" on public.games;
drop policy if exists "Game players insérables par tous" on public.game_players;
drop policy if exists "Game players modifiables par tous" on public.game_players;

revoke all on table public.games, public.game_players from public, anon, authenticated;
grant select on table public.games, public.game_players to anon, authenticated;
grant all on table public.games, public.game_players to service_role;
