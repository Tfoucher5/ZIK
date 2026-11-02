-- Triggers posés sur le schéma auth, que le dump de la migration de base
-- (schéma public seul) n'a pas repris. Déjà présents en prod : create or
-- replace les laisse tels quels.
--
-- Retour arrière : drop trigger on_auth_user_created on auth.users ;
-- drop trigger trg_sync_discord_identity on auth.identities.

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace trigger trg_sync_discord_identity
  after insert on auth.identities
  for each row execute function public.sync_discord_identity();

-- Comptes créés avant le trigger (staging) : même profil que handle_new_user
insert into public.profiles (id, username, avatar_url)
select u.id, coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
       coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;
