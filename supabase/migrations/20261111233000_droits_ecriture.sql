-- Droits d'écriture du joueur limités aux colonnes que le site écrit avec sa
-- session (plan, ajout du 12/11). Le reste (officiel, compteurs, réponses de
-- playlist) passe par le client serveur.
-- rooms : /api/rooms (insert), /api/rooms/[code] (update).
-- custom_playlists et custom_playlist_tracks : éditeur de playlists du navigateur.
-- track_answers : écrit seulement par le serveur, politiques d'écriture retirées.
-- friendships : /api/friend ; notifications : /api/notifications.
-- Pour défaire : grant insert, update on table <table> to authenticated, retirer
-- les with check ajoutés, et
-- recréer les politiques track_answers_* et playlist_tracks_update.

revoke insert, update on table play.rooms from authenticated;
grant insert (name, emoji, description, owner_id, playlist_id, is_public, auto_start,
  game_mode, max_rounds, round_duration, break_duration)
  on table play.rooms to authenticated;
grant update (name, emoji, description, playlist_id, is_public, auto_start, game_mode,
  max_rounds, round_duration, break_duration)
  on table play.rooms to authenticated;
alter policy rooms_update on play.rooms
  with check (
    (select auth.uid()) = owner_id
    or exists (select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'super_admin')
  );

revoke insert, update on table catalog.custom_playlists from authenticated;
grant insert (owner_id, name, emoji, is_public) on table catalog.custom_playlists to authenticated;
grant update (name, emoji, is_public, updated_at) on table catalog.custom_playlists to authenticated;

revoke insert, update on table catalog.custom_playlist_tracks from authenticated;
grant insert (playlist_id, track_id, position) on table catalog.custom_playlist_tracks to authenticated;
drop policy if exists playlist_tracks_update on catalog.custom_playlist_tracks;

revoke insert, update, delete on table catalog.track_answers from authenticated;
drop policy if exists track_answers_insert on catalog.track_answers;
drop policy if exists track_answers_update on catalog.track_answers;
drop policy if exists track_answers_delete on catalog.track_answers;

revoke insert, update on table social.friendships from authenticated;
grant insert (requester_id, addressee_id) on table social.friendships to authenticated;
grant update (status, accepted_at) on table social.friendships to authenticated;
alter policy friendships_update_addressee on social.friendships
  with check (addressee_id = (select auth.uid()));

revoke update on table social.notifications from authenticated;
grant update (read) on table social.notifications to authenticated;
alter policy notifications_update_own on social.notifications
  with check (user_id = (select auth.uid()));
