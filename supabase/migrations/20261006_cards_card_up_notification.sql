-- supabase/migrations/20261006_cards_card_up_notification.sql
-- Notification « ta carte est montée de rareté » (spec docs/specs/cartes.md,
-- section 3) envoyée par le passage mensuel des raretés provisoires.
-- Sans cette migration, la notification est simplement ignorée.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accept', 'room_invite', 'card_up'));
