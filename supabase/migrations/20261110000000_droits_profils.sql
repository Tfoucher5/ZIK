-- Droits de public.profiles réduits au strict nécessaire.
-- anon et authenticated avaient tous les droits par défaut (dont UPDATE de
-- toutes les colonnes de sa propre ligne et TRUNCATE, qui ignore les RLS).
-- Le serveur écrit le reste (scores, niveau, rôle, préférences) par le client
-- admin. Le joueur ne modifie que les colonnes de /api/profile/update.
-- Horodatage placé avant les migrations de develop pas encore livrées.
-- Pour défaire : grant all on table public.profiles to anon, authenticated;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (username, avatar_url, is_private, discord_id, discord_username, discord_avatar)
  on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
