-- Phase 4 du plan, schémas par domaine : liens entre schémas.
-- PostgREST ne suit pas une clé étrangère d'un schéma à l'autre (PGRST200) :
-- chaque lien lu par l'API devient une « computed relationship », une fonction
-- du schéma de départ qui prend la ligne et rend la ligne liée. Une seule
-- requête côté code, RLS de la table liée appliquées (security invoker).
-- rows 1 : lien vers une seule ligne, rendu en objet et pas en tableau.
-- Pour défaire : drop function des 6 fonctions ci-dessous.

create or replace function social.following(social.follows)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.following_id $$;

create or replace function social.follower(social.follows)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.follower_id $$;

create or replace function social.requester(social.friendships)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.requester_id $$;

create or replace function social.addressee(social.friendships)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.addressee_id $$;

create or replace function social.actor(social.notifications)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.actor_id $$;

create or replace function social.profile(social.push_subscriptions)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.user_id $$;

revoke execute on function social.following(social.follows), social.follower(social.follows),
  social.requester(social.friendships), social.addressee(social.friendships),
  social.actor(social.notifications), social.profile(social.push_subscriptions)
  from public, anon, authenticated;
grant execute on function social.following(social.follows), social.follower(social.follows),
  social.requester(social.friendships), social.addressee(social.friendships),
  social.actor(social.notifications), social.profile(social.push_subscriptions)
  to service_role;
-- La cloche lit ses notifications avec la session du joueur (/api/notifications).
grant execute on function social.actor(social.notifications) to authenticated;

notify pgrst, 'reload schema';
