-- Fonctions SECURITY DEFINER exécutables avec la clé publique : scores, XP et
-- ELO de n'importe quel joueur modifiables, chiffres admin lisibles par tous.
-- Le serveur les appelle toutes avec la clé de service (v3.21.1).
-- PUBLIC doit être révoqué en plus de anon et authenticated : ils en héritent.
--
-- Retour arrière : grant execute on function <signature> to public, pour les
-- fonctions ci-dessous ; alter default privileges for role postgres grant
-- execute on functions to public. flush_player_score ne revient pas : code
-- mort qui ajoutait total_score et xp à n'importe quel profil.

begin;

revoke execute on function public.update_player_stats(uuid, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.update_player_streaks(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.update_player_stats_discord(uuid, integer) from public, anon, authenticated;
grant execute on function public.update_player_stats(uuid, integer, integer, integer, integer) to service_role;
grant execute on function public.update_player_streaks(uuid, boolean) to service_role;

-- Plus appelée nulle part
drop function public.flush_player_score(uuid, integer);

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- Une nouvelle fonction n'est plus ouverte à tous par défaut : chaque
-- migration accorde explicitement execute aux rôles qui en ont besoin
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

commit;
