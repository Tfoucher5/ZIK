-- Feature « lieux » abandonnée (code archivé sur la branche archive/lieux) :
-- on retire tout ce que 20261013_venues.sql et 20261014_venue_league_accounts.sql
-- avaient ajouté. Les seules lignes étaient des données de test.

drop function if exists public.venue_league(uuid, timestamptz);

drop index if exists public.games_venue_idx;
alter table public.games drop column if exists venue_id;

drop table if exists public.venue_follows;
drop table if exists public.venue_events;
drop table if exists public.venues;

-- Types de notification d'avant les lieux (sans 'venue_event')
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accept', 'room_invite',
    'card_up', 'card_mythic', 'card_set_near',
    'announcement', 'news'
  ));

-- Plus de catégorie « venues » dans les préférences de notification
alter table public.profiles
  alter column notif_prefs
  set default '{"social": true, "cards": true, "challenge": true, "zikle": false, "updates": true}'::jsonb;

update public.profiles
  set notif_prefs = notif_prefs - 'venues'
  where notif_prefs ? 'venues';
