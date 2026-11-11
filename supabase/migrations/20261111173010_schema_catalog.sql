-- Phase 4 du plan : schémas par domaine, lot catalog.
-- catalog : tracks, answer_types, track_stats (lecture publique),
--   custom_playlists, custom_playlist_tracks, track_answers (écrits par leur
--   propriétaire depuis le navigateur, RLS gardées), track_issues (serveur
--   seulement, sans politique).
-- Fonctions du domaine recréées dans catalog, security invoker (seul
-- service_role les exécute), search_path vide, noms qualifiés. Les anciennes
-- public.get_covers_by_playlists, record_round_stats, report_track_issue et
-- resolve_tracks restent pour le code encore en prod et partent avec les vues
-- de compatibilité. update_updated_at ne sert qu'à custom_playlists : déplacée.
-- Liens entre schémas (PostgREST ne suit pas une clé étrangère d'un schéma à
-- l'autre) :
--   catalog.owner(catalog.custom_playlists) : auteur (public.profiles) ;
--   catalog.cards(catalog.tracks) : carte d'un titre (cards.card_view),
--     déplacée depuis public ; public.cards(public.tracks) la remplace sur la
--     vue de compatibilité ;
--   public.tracks(public.daily_songs), public.tracks(public.zikle_pool) : titre
--     du Zikle (catalog.tracks).
-- Prérequis hors migration : catalog dans « Exposed schemas » (Settings > Data API).
-- Pour défaire : drop des vues public.* et des fonctions catalog.*, alter table
-- catalog.<table> set schema public, recréer les fonctions et triggers de
-- 20261102220000_baseline.sql et public.cards(public.tracks) de
-- 20261111164547_schema_cards.sql.

create schema if not exists catalog;
revoke all on schema catalog from public;
grant usage on schema catalog to anon, authenticated, service_role;

alter table public.tracks set schema catalog;
alter table public.answer_types set schema catalog;
alter table public.track_stats set schema catalog;
alter table public.track_issues set schema catalog;
alter table public.custom_playlists set schema catalog;
alter table public.custom_playlist_tracks set schema catalog;
alter table public.track_answers set schema catalog;

revoke all on catalog.tracks, catalog.answer_types, catalog.track_stats,
  catalog.track_issues, catalog.custom_playlists, catalog.custom_playlist_tracks,
  catalog.track_answers from public, anon, authenticated;
grant select on catalog.tracks, catalog.answer_types, catalog.track_stats,
  catalog.custom_playlists, catalog.custom_playlist_tracks, catalog.track_answers
  to anon, authenticated;
grant insert, update, delete on catalog.custom_playlists,
  catalog.custom_playlist_tracks, catalog.track_answers to authenticated;
grant select, insert, update, delete on catalog.tracks, catalog.answer_types,
  catalog.track_stats, catalog.track_issues, catalog.custom_playlists,
  catalog.custom_playlist_tracks, catalog.track_answers to service_role;

revoke all on sequence catalog.answer_types_id_seq, catalog.track_issues_id_seq
  from public, anon, authenticated;
grant usage, select on sequence catalog.answer_types_id_seq,
  catalog.track_issues_id_seq to service_role;

-- ── Fonctions de lien ────────────────────────────────────────────────────────

alter function public.cards(catalog.tracks) set schema catalog;

create or replace function catalog.owner(catalog.custom_playlists)
  returns setof public.profiles rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from public.profiles where id = $1.owner_id $$;

create or replace function public.tracks(public.daily_songs)
  returns setof catalog.tracks rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from catalog.tracks where id = $1.track_id $$;

create or replace function public.tracks(public.zikle_pool)
  returns setof catalog.tracks rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from catalog.tracks where id = $1.track_id $$;

revoke execute on function catalog.owner(catalog.custom_playlists),
  public.tracks(public.daily_songs), public.tracks(public.zikle_pool)
  from public, anon, authenticated;
grant execute on function catalog.owner(catalog.custom_playlists),
  public.tracks(public.daily_songs), public.tracks(public.zikle_pool)
  to service_role;

-- ── Fonctions du domaine ─────────────────────────────────────────────────────

alter function public.update_updated_at() set schema catalog;
alter function catalog.update_updated_at() set search_path = '';
revoke execute on function catalog.update_updated_at() from public, anon, authenticated;

create or replace function catalog.update_playlist_track_count()
 returns trigger
 language plpgsql
 security definer
 set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    update catalog.custom_playlists set track_count = track_count + 1, updated_at = now() where id = new.playlist_id;
  elsif tg_op = 'DELETE' then
    update catalog.custom_playlists set track_count = greatest(0, track_count - 1), updated_at = now() where id = old.playlist_id;
  end if;
  return null;
end;
$function$;

drop trigger trg_playlist_track_count on catalog.custom_playlist_tracks;
create trigger trg_playlist_track_count after insert or delete on catalog.custom_playlist_tracks
  for each row execute function catalog.update_playlist_track_count();
drop function public.update_playlist_track_count();

create or replace function catalog.get_covers_by_playlists(pids uuid[], max_per_playlist integer default 9)
 returns json
 language sql
 stable
 security invoker
 set search_path = ''
as $function$
  select coalesce(json_object_agg(playlist_id, covers), '{}'::json)
  from (
    select playlist_id, array_agg(cover_url order by rn) as covers
    from (
      select playlist_id, cover_url,
             row_number() over (partition by playlist_id order by id) as rn
      from catalog.custom_playlist_tracks
      where playlist_id = any(pids)
        and cover_url is not null
        and cover_url != ''
    ) t
    where rn <= max_per_playlist
    group by playlist_id
  ) agg;
$function$;

create or replace function catalog.record_round_stats(p_track_id uuid, p_exposed integer, p_found integer)
 returns void
 language sql
 security invoker
 set search_path = ''
as $function$
  insert into catalog.track_stats (track_id, rounds_played, players_exposed, found_full, last_played_at)
  values (p_track_id, 1, p_exposed, p_found, now())
  on conflict (track_id) do update set
    rounds_played   = track_stats.rounds_played + 1,
    players_exposed = track_stats.players_exposed + excluded.players_exposed,
    found_full      = track_stats.found_full + excluded.found_full,
    last_played_at  = now();
$function$;

create or replace function catalog.report_track_issue(p_track uuid, p_kind text, p_source text, p_note text default null, p_context jsonb default '{}'::jsonb)
 returns void
 language sql
 security invoker
 set search_path = ''
as $function$
  insert into catalog.track_issues (track_id, kind, source, note, context)
  values (p_track, p_kind, p_source, p_note, coalesce(p_context, '{}'::jsonb))
  on conflict (track_id, kind) where status = 'open'
  do update set
    count = track_issues.count + 1,
    updated_at = now(),
    source = case when excluded.source = 'auto' then track_issues.source else excluded.source end,
    note = coalesce(excluded.note, track_issues.note),
    context = track_issues.context || excluded.context;
$function$;

create or replace function catalog.resolve_tracks(p_tracks jsonb)
 returns uuid[]
 language plpgsql
 security invoker
 set search_path = ''
as $function$
declare
  rec record;
  v_id uuid;
  result uuid[] := '{}';
begin
  for rec in
    select * from jsonb_to_recordset(p_tracks) as x(
      artist text, title text, preview_url text, preview_expires_at timestamptz,
      cover_url text, external_id text, source text)
  loop
    insert into catalog.tracks (artist, title, preview_url, preview_expires_at, cover_url, external_id, source)
    values (rec.artist, rec.title, rec.preview_url, rec.preview_expires_at,
            rec.cover_url, rec.external_id, coalesce(rec.source, 'manual'))
    on conflict (norm_key) do update set
      preview_url = coalesce(tracks.preview_url, excluded.preview_url),
      preview_expires_at = case when tracks.preview_url is null then excluded.preview_expires_at else tracks.preview_expires_at end,
      cover_url = coalesce(tracks.cover_url, excluded.cover_url),
      external_id = coalesce(tracks.external_id, excluded.external_id)
    returning id into v_id;
    result := array_append(result, v_id);
  end loop;
  return result;
end;
$function$;

revoke execute on function catalog.update_playlist_track_count(),
  catalog.get_covers_by_playlists(uuid[], integer),
  catalog.record_round_stats(uuid, integer, integer),
  catalog.report_track_issue(uuid, text, text, text, jsonb),
  catalog.resolve_tracks(jsonb) from public, anon, authenticated;
grant execute on function catalog.get_covers_by_playlists(uuid[], integer),
  catalog.record_round_stats(uuid, integer, integer),
  catalog.report_track_issue(uuid, text, text, text, jsonb),
  catalog.resolve_tracks(jsonb) to service_role;

-- ── Vues de compatibilité (code encore en prod, supprimées plus tard) ────────

create view public.tracks with (security_invoker = true) as select * from catalog.tracks;
create view public.answer_types with (security_invoker = true) as select * from catalog.answer_types;
create view public.track_stats with (security_invoker = true) as select * from catalog.track_stats;
create view public.track_issues with (security_invoker = true) as select * from catalog.track_issues;
create view public.custom_playlists with (security_invoker = true) as select * from catalog.custom_playlists;
create view public.custom_playlist_tracks with (security_invoker = true) as select * from catalog.custom_playlist_tracks;
create view public.track_answers with (security_invoker = true) as select * from catalog.track_answers;

revoke all on public.tracks, public.answer_types, public.track_stats,
  public.track_issues, public.custom_playlists, public.custom_playlist_tracks,
  public.track_answers from public, anon, authenticated;
grant select on public.tracks, public.answer_types, public.track_stats,
  public.custom_playlists, public.custom_playlist_tracks, public.track_answers
  to anon, authenticated;
grant insert, update, delete on public.custom_playlists,
  public.custom_playlist_tracks, public.track_answers to authenticated;
grant select, insert, update, delete on public.tracks, public.answer_types,
  public.track_stats, public.track_issues, public.custom_playlists,
  public.custom_playlist_tracks, public.track_answers to service_role;

-- Carte d'un titre lue par l'ancien code des salons (clé anonyme).
create or replace function public.cards(public.tracks)
  returns setof cards.card_view rows 1
  language sql stable security invoker set search_path = ''
as $$ select * from cards.card_view where id = $1.card_id $$;

revoke execute on function public.cards(public.tracks) from public, anon, authenticated;
grant execute on function public.cards(public.tracks) to anon, service_role;
