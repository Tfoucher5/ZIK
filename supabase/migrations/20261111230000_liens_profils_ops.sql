-- Phase 4 du plan, schémas par domaine : dernières deuxièmes requêtes vers les
-- profils remplacées par des fonctions de lien (computed relationships).
-- ops.reporter / ops.reported : auteur et cible d'un signalement (/admin/reports).
-- ops.admin : auteur d'une ligne du journal admin (/admin/users/[id]).
-- Lues seulement par le serveur (service_role) : reports et admin_audit_log n'ont
-- aucune politique pour anon et authenticated.
-- social.requester / social.addressee : /api/social lit les amis avec la clé
-- anonyme ; friendships et profiles sont déjà lisibles par tous (politiques
-- select true), le lien n'ouvre donc rien de plus.
-- Pour défaire : drop function des 3 fonctions ops ci-dessous et
-- revoke execute des deux fonctions social à anon et authenticated.

create or replace function ops.reporter(ops.reports)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.reporter_id $$;

create or replace function ops.reported(ops.reports)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.reported_user_id $$;

create or replace function ops.admin(ops.admin_audit_log)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.admin_id $$;

revoke execute on function ops.reporter(ops.reports), ops.reported(ops.reports),
  ops.admin(ops.admin_audit_log)
  from public, anon, authenticated;
grant execute on function ops.reporter(ops.reports), ops.reported(ops.reports),
  ops.admin(ops.admin_audit_log)
  to service_role;

grant execute on function social.requester(social.friendships),
  social.addressee(social.friendships)
  to anon, authenticated;

notify pgrst, 'reload schema';
