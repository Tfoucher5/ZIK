-- supabase/migrations/20261007_cards_mythic_notification.sql
-- Notification « ton ami a décroché une carte Mythique », envoyée quand la
-- carte devient définitive. À appliquer après 20261006_cards_card_up_notification.
-- Sans cette migration, la notification est simplement ignorée.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accept', 'room_invite', 'card_up', 'card_mythic'));
