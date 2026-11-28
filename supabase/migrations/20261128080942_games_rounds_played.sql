-- Manches jouées jusqu'au bout d'une partie ZIK Soirée, écrites à la fin de
-- la partie. `rounds` reçoit le total affiché au lancement (au plus le nombre
-- de titres) : la comparaison des deux mesure les parties finies sous le total
-- affiché (plan, suites de « les manches suivent les titres », point 3). Nul
-- pour le jeu en ligne et les parties d'avant cette migration.
-- Droits : ceux de la table (lecture seule pour anon et authenticated,
-- écriture par le serveur avec la clé service_role).
-- Pour défaire : alter table play.games drop column rounds_played;
alter table play.games
  add column if not exists rounds_played integer check (rounds_played >= 0);
