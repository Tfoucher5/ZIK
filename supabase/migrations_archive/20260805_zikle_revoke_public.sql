-- 20260805_zikle_revoke_public.sql
-- FAILLE : les RPC Zikle restaient exécutables par n'importe qui avec la clé anon.
--
-- Postgres accorde EXECUTE à PUBLIC par défaut sur toute nouvelle fonction.
-- Le `revoke ... from anon, authenticated` des migrations précédentes ne retire
-- PAS ce droit hérité de PUBLIC : les rôles le conservent via PUBLIC.
-- Vérifié en base : proacl = {=X/postgres,...} (le `=` initial = PUBLIC)
-- et has_function_privilege('anon', ...) = true.
--
-- Impact avant correctif : zikle_complete est SECURITY DEFINER et prend
-- p_user_id en paramètre. Un appel direct POST /rest/v1/rpc/zikle_complete
-- avec la clé anon (publique, présente dans le bundle client) permettait
-- d'attribuer de l'XP à n'importe quel compte et de fabriquer des entrées
-- de classement, en contournant /api/zikle/guess et toute vérification serveur.
--
-- Correctif : révoquer depuis PUBLIC. C'est déjà l'état de resolve_tracks
-- (proacl sans entrée PUBLIC, anon_exec = false), qui sert de référence.

revoke execute on function public.pick_daily_song() from public;
revoke execute on function public.zikle_complete(
  uuid, date, int, boolean, int, jsonb
) from public;
revoke execute on function public.zikle_leaderboard(date) from public;

-- Ceintures et bretelles : ces rôles ne doivent rien conserver en direct non plus.
revoke execute on function public.pick_daily_song() from anon, authenticated;
revoke execute on function public.zikle_complete(
  uuid, date, int, boolean, int, jsonb
) from anon, authenticated;
revoke execute on function public.zikle_leaderboard(date) from anon, authenticated;
