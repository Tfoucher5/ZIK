-- Phase 4 du plan : RLS en (select auth.uid()), politiques fusionnées, index des
-- clés étrangères, search_path fixé, fonctions security definer fermées à la clé publique.
-- Aucun changement de politique : chaque politique garde la même condition,
-- les politiques en double sont réunies en une seule par action.
-- Les politiques réservées au propriétaire passent de « public » à « authenticated » :
-- sans session, auth.uid() est nul et elles ne laissaient déjà rien passer.
-- Pour défaire : recréer les politiques et fonctions telles qu'écrites dans
-- 20261102220000_baseline.sql (alter function … reset search_path, grant execute
-- des 5 fonctions à anon et authenticated), puis drop index des 15 index *_fk_idx.

-- ── Politiques : auth.uid() évalué une fois par requête ──────────────────────

alter policy playlist_tracks_delete on public.custom_playlist_tracks to authenticated
  using (exists (select 1 from public.custom_playlists p
    where p.id = custom_playlist_tracks.playlist_id and p.owner_id = (select auth.uid())));
alter policy playlist_tracks_insert on public.custom_playlist_tracks to authenticated
  with check (exists (select 1 from public.custom_playlists p
    where p.id = custom_playlist_tracks.playlist_id and p.owner_id = (select auth.uid())));
alter policy playlist_tracks_update on public.custom_playlist_tracks to authenticated
  using (exists (select 1 from public.custom_playlists p
    where p.id = custom_playlist_tracks.playlist_id and p.owner_id = (select auth.uid())));
alter policy playlist_tracks_select on public.custom_playlist_tracks to anon, authenticated
  using (exists (select 1 from public.custom_playlists p
    where p.id = custom_playlist_tracks.playlist_id
      and (p.owner_id = (select auth.uid()) or p.is_public = true or p.is_official = true
        or exists (select 1 from public.rooms r where r.playlist_id = p.id))));

alter policy custom_playlists_delete on public.custom_playlists to authenticated
  using ((select auth.uid()) = owner_id);
alter policy custom_playlists_insert on public.custom_playlists to authenticated
  with check ((select auth.uid()) = owner_id);
alter policy custom_playlists_select on public.custom_playlists to anon, authenticated
  using ((select auth.uid()) = owner_id or is_public = true or is_official = true);
drop policy if exists super_admin_update_playlists on public.custom_playlists;
drop policy if exists custom_playlists_update on public.custom_playlists;
create policy custom_playlists_update on public.custom_playlists
  for update to authenticated
  using ((select auth.uid()) = owner_id
    or exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'super_admin'))
  with check ((select auth.uid()) = owner_id
    or exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'super_admin'));

alter policy daily_results_select_own on public.daily_results to authenticated
  using (user_id = (select auth.uid()));

alter policy follows_delete_own on public.follows to authenticated
  using (follower_id = (select auth.uid()));
alter policy follows_insert_own on public.follows to authenticated
  with check (follower_id = (select auth.uid()));

alter policy friendships_delete_own on public.friendships to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
alter policy friendships_insert_own on public.friendships to authenticated
  with check (requester_id = (select auth.uid()));
alter policy friendships_update_addressee on public.friendships to authenticated
  using (addressee_id = (select auth.uid()));

alter policy notifications_delete_own on public.notifications to authenticated
  using (user_id = (select auth.uid()));
alter policy notifications_select_own on public.notifications to authenticated
  using (user_id = (select auth.uid()));
alter policy notifications_update_own on public.notifications to authenticated
  using (user_id = (select auth.uid()));

alter policy pro_subscriptions_select_own on public.pro_subscriptions to authenticated
  using ((select auth.uid()) = user_id);

alter policy "Profil modifiable par son propriétaire" on public.profiles to authenticated
  using ((select auth.uid()) = id);

alter policy reports_select_admin on public.reports to authenticated
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'super_admin'));
alter policy reports_update_admin on public.reports to authenticated
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'super_admin'));

alter policy room_playlists_delete on public.room_playlists to authenticated
  using (exists (select 1 from public.rooms r
    where r.id = room_playlists.room_id and r.owner_id = (select auth.uid())));
alter policy room_playlists_insert on public.room_playlists to authenticated
  with check (exists (select 1 from public.rooms r
    where r.id = room_playlists.room_id and r.owner_id = (select auth.uid())));
alter policy room_playlists_select on public.room_playlists to anon, authenticated
  using (exists (select 1 from public.rooms r
    where r.id = room_playlists.room_id
      and (r.is_public = true or r.is_official = true or r.owner_id = (select auth.uid()))));

alter policy rooms_delete on public.rooms to authenticated
  using ((select auth.uid()) = owner_id
    or exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'super_admin'));
alter policy rooms_insert on public.rooms to authenticated
  with check ((select auth.uid()) = owner_id);
alter policy rooms_update on public.rooms to authenticated
  using ((select auth.uid()) = owner_id
    or exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'super_admin'));
drop policy if exists rooms_select_official on public.rooms;
drop policy if exists rooms_select_public on public.rooms;
drop policy if exists rooms_select_superadmin on public.rooms;
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select to anon, authenticated
  using (is_official = true or is_public = true or owner_id = (select auth.uid())
    or exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'super_admin'));

-- track_answers : deux paires de politiques identiques (lecture pour tous, écriture
-- par le propriétaire de la playlist), réunies en une politique par action.
drop policy if exists owners_manage_track_answers on public.track_answers;
drop policy if exists track_answers_write on public.track_answers;
drop policy if exists public_read_track_answers on public.track_answers;
drop policy if exists track_answers_read on public.track_answers;
drop policy if exists track_answers_select on public.track_answers;
drop policy if exists track_answers_insert on public.track_answers;
drop policy if exists track_answers_update on public.track_answers;
drop policy if exists track_answers_delete on public.track_answers;
create policy track_answers_select on public.track_answers
  for select to anon, authenticated
  using (true);
create policy track_answers_insert on public.track_answers
  for insert to authenticated
  with check (exists (select 1 from public.custom_playlist_tracks cpt
    join public.custom_playlists cp on cp.id = cpt.playlist_id
    where cpt.id = track_answers.track_id and cp.owner_id = (select auth.uid())));
create policy track_answers_update on public.track_answers
  for update to authenticated
  using (exists (select 1 from public.custom_playlist_tracks cpt
    join public.custom_playlists cp on cp.id = cpt.playlist_id
    where cpt.id = track_answers.track_id and cp.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.custom_playlist_tracks cpt
    join public.custom_playlists cp on cp.id = cpt.playlist_id
    where cpt.id = track_answers.track_id and cp.owner_id = (select auth.uid())));
create policy track_answers_delete on public.track_answers
  for delete to authenticated
  using (exists (select 1 from public.custom_playlist_tracks cpt
    join public.custom_playlists cp on cp.id = cpt.playlist_id
    where cpt.id = track_answers.track_id and cp.owner_id = (select auth.uid())));

alter policy user_achievements_select on public.user_achievements to anon, authenticated
  using (user_id = (select auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = user_achievements.user_id and pr.is_private = false));
alter policy weekly_challenge_contributions_select on public.weekly_challenge_contributions to anon, authenticated
  using (user_id = (select auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = weekly_challenge_contributions.user_id and pr.is_private = false));

-- ── Index des clés étrangères (tables de quelques dizaines de Ko) ────────────

create index if not exists admin_audit_log_admin_id_fk_idx on public.admin_audit_log (admin_id);
create index if not exists daily_songs_track_id_fk_idx on public.daily_songs (track_id);
create index if not exists game_results_game_id_fk_idx on public.game_results (game_id);
create index if not exists game_results_user_id_fk_idx on public.game_results (user_id);
create index if not exists notifications_actor_id_fk_idx on public.notifications (actor_id);
create index if not exists prospect_replies_prospect_id_fk_idx on public.prospect_replies (prospect_id);
create index if not exists reports_reported_user_id_fk_idx on public.reports (reported_user_id);
create index if not exists reports_reporter_id_fk_idx on public.reports (reporter_id);
create index if not exists reports_resolved_by_fk_idx on public.reports (resolved_by);
create index if not exists room_playlists_playlist_id_fk_idx on public.room_playlists (playlist_id);
create index if not exists rooms_playlist_id_fk_idx on public.rooms (playlist_id);
create index if not exists track_answers_answer_type_id_fk_idx on public.track_answers (answer_type_id);
create index if not exists user_achievements_achievement_id_fk_idx on public.user_achievements (achievement_id);
create index if not exists weekly_challenge_contributions_user_id_fk_idx on public.weekly_challenge_contributions (user_id);
create index if not exists weekly_challenges_top_contributor_id_fk_idx on public.weekly_challenges (top_contributor_id);

-- ── search_path fixé ─────────────────────────────────────────────────────────
-- Corps déjà qualifiés (public.*), ou seulement des fonctions de pg_catalog : search_path vide.
alter function public.generate_room_code() set search_path = '';
alter function public.rooms_before_insert() set search_path = '';
alter function public.update_updated_at() set search_path = '';
alter function public.weekly_leaderboard() set search_path = '';
alter function public.get_my_role() set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.sync_discord_identity() set search_path = '';
alter function public.update_player_stats(uuid, integer, integer, integer, integer) set search_path = '';
alter function public.update_player_stats_discord(uuid, integer) set search_path = '';
alter function public.update_playlist_track_count() set search_path = '';
-- security invoker aux noms de tables non qualifiés : public suffit, la fonction
-- n'a pas plus de droits que l'appelant.
alter function public.get_covers_by_playlists(uuid[], integer) set search_path = public;
alter function public.leaderboard_score(text, text, text, integer, integer) set search_path = public;
alter function public.leaderboard_score_my_rank(uuid, text, text, text) set search_path = public;
alter function public.weekly_leaderboard_by_room(text) set search_path = public;

create or replace function public.count_active_players_7d()
returns integer
language sql
security definer
set search_path = ''
as $$
  select count(distinct
    case
      when gp.user_id is not null then gp.user_id::text
      else 'guest_' || gp.username
    end
  )::integer
  from public.game_players gp
  join public.games g on g.id = gp.game_id
  where g.started_at >= now() - interval '7 days';
$$;

-- ── security definer fermées à la clé publique ───────────────────────────────
-- count_active_players_7d et get_my_role : appelées par aucun code ni aucune politique.
-- Les trois autres sont des déclencheurs : EXECUTE n'est vérifié qu'à leur création.
revoke execute on function public.count_active_players_7d() from public, anon, authenticated;
revoke execute on function public.get_my_role() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_discord_identity() from public, anon, authenticated;
revoke execute on function public.update_playlist_track_count() from public, anon, authenticated;
grant execute on function public.count_active_players_7d() to service_role;
grant execute on function public.get_my_role() to service_role;
