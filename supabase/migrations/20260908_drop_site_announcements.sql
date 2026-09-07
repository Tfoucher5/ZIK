-- supabase/migrations/20260908_drop_site_announcements.sql
-- Retirer la fenêtre d'annonces au chargement du site.
--
-- Le composant AnnouncementPopup affichait une modale au premier chargement,
-- alimentée par cette table. Le procédé a été jugé trop intrusif : la modale
-- s'imposait à l'arrivée sur le site, et l'option de désactivation dans les
-- paramètres ne réglait le problème que pour ceux qui la trouvaient.
--
-- Le composant, son montage dans le layout et le réglage associé ont été
-- supprimés côté application. La table n'a jamais servi : elle est vide au
-- moment de cette migration, aucune donnée n'est donc perdue.

drop table if exists public.site_announcements;
