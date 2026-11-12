-- Fin de la bascule par schéma de domaine (plan, phase 4) : le code de chaque lot
-- est en prod depuis la v3.27.0, plus rien ne lit les vues public.* de compatibilité
-- ni les anciennes fonctions public.* (routines cloud passées sur les noms
-- qualifiés le 12/11, service zik-discord-bot supprimé).
-- Supprime : les anciennes fonctions de public (dont les liens qui prennent une vue
-- en argument), update_player_stats_discord, puis les 42 vues.
-- public ne garde que profiles et ses fonctions (handle_new_user,
-- sync_discord_identity, update_player_stats, update_player_streaks).
-- Pour défaire : recréer les vues et fonctions depuis les migrations
-- 20261111133054 à 20261111210000.

-- cards
drop function if exists public.card_settle(uuid, bigint[], boolean);
drop function if exists public.cards_leaderboard(integer, integer);
drop function if exists public.cards_leaderboard_my_rank(uuid);
drop function if exists public.cards_showcase(uuid[]);
drop function if exists public.cards_collectors();
drop function if exists public.cards(public.tracks);

-- catalog
drop function if exists public.get_covers_by_playlists(uuid[], integer);
drop function if exists public.record_round_stats(uuid, integer, integer);
drop function if exists public.report_track_issue(uuid, text, text, text, jsonb);
drop function if exists public.resolve_tracks(jsonb);

-- play
drop function if exists public.increment_weekly_challenge(text, uuid, integer);
drop function if exists public.leaderboard_score(text, text, text, integer, integer);
drop function if exists public.leaderboard_score_my_rank(uuid, text, text, text);
drop function if exists public.pick_daily_song();
drop function if exists public.pick_weekly_challenge();
drop function if exists public.weekly_leaderboard();
drop function if exists public.weekly_leaderboard_by_room(text);
drop function if exists public.zikle_complete(uuid, date, integer, boolean, integer, jsonb);
drop function if exists public.zikle_leaderboard(date, uuid, integer);
drop function if exists public.tracks(public.daily_songs);
drop function if exists public.tracks(public.zikle_pool);
drop function if exists public.update_player_stats_discord(uuid, integer);

-- salon
drop function if exists public.save_salon_snapshot(text, jsonb);
drop function if exists public.load_salon_snapshot(text, integer);
drop function if exists public.delete_salon_snapshot(text);
drop function if exists public.purge_salon_snapshots();
drop function if exists public.games(public.salon_players);

-- ops et social
drop function if exists public.admin_active_players_per_day(integer);
drop function if exists public.admin_activity_breakdown(integer);
drop function if exists public.admin_broadcast_notification(text, jsonb);
drop function if exists public.admin_dau_wau_mau();
drop function if exists public.admin_games_per_day(integer);
drop function if exists public.admin_pulse(integer);
drop function if exists public.admin_retention_cohorts(text, integer);
drop function if exists public.admin_schedule_weekly_challenge(date, text, integer);
drop function if exists public.admin_signups_per_day(integer);
drop function if exists public.admin_traffic_daily(integer);
drop function if exists public.admin_traffic_landings(integer, integer);
drop function if exists public.admin_traffic_sources(integer);
drop function if exists public.admin_weekly_kpis(integer);
drop function if exists public.admin_zikle_per_day(integer);
drop function if exists public.db_stats();
drop function if exists public.health_history(integer);
drop function if exists public.health_transitions(integer);
drop function if exists public.purge_ops();
drop function if exists public.record_errors(jsonb);
drop function if exists public.record_health(jsonb);

-- vues de compatibilité
drop view if exists
  public.achievements, public.admin_audit_log, public.admin_user_activity,
  public.answer_types, public.card_albums, public.card_artists, public.card_grants,
  public.card_set_items, public.card_sets, public.card_signals, public.cards,
  public.custom_playlist_tracks, public.custom_playlists, public.daily_results,
  public.daily_songs, public.follows, public.friendships, public.game_players,
  public.game_results, public.games, public.notification_once, public.notifications,
  public.pro_subscriptions, public.prospect_replies, public.prospects,
  public.push_subscriptions, public.reports, public.room_playlists, public.rooms,
  public.salon_players, public.site_settings, public.track_answers,
  public.track_issues, public.track_stats, public.tracks, public.user_achievements,
  public.user_card_sets, public.user_cards, public.visit_sources,
  public.weekly_challenge_contributions, public.weekly_challenges, public.zikle_pool;
