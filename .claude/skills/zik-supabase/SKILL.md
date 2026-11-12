---
name: zik-supabase
description: Règles de la base Supabase de ZIK (schémas par domaine, RLS, droits, fonctions, index, clients anonyme et admin, environnements staging et prod). Utilise ce skill dès que du code lit ou écrit en base, qu'une table, une colonne, une politique RLS, une fonction SQL ou un index est concerné, ou que tu appelles le MCP Supabase, même pour une simple requête.
when_to_use: « ajoute une colonne », « nouvelle table », « requête Supabase », « RLS », « rpc », « getAdminClient », « pourquoi je ne vois pas les données », tout fichier sous supabase/ ou src/lib/server/services/.
paths:
  - supabase/**
  - src/lib/server/services/**
  - src/lib/server/config.js
  - src/routes/**/+page.server.js
  - src/routes/**/+server.js
---

# Base de données ZIK

Supabase (Postgres 17). Deux environnements : la **base de staging** pour le travail quotidien, le projet `ZIK` (`fbeubmwhxytniohodlgr`) pour la prod. Avant l'audit, la prod était sur le plan Free, les migrations n'étaient plus reproductibles et 26 fonctions `security definer` étaient ouvertes à la clé publique. Ces règles existent pour que ça ne se reproduise pas.

## Règles

1. **Aucune écriture sur la prod depuis Claude.** Pas de `execute_sql` en écriture, pas d'`apply_migration` sur le projet `ZIK`. La prod reçoit les migrations par la CI, au merge sur `master`. Sur le staging, une écriture se fait après confirmation de Théo.
2. **Toute modification de schéma est un fichier** `supabase/migrations/<AAAAMMJJHHMMSS>_<sujet>.sql`, avec en tête ce qu'il fait et comment le défaire. Pour en écrire un, utilise le skill `migration`.
3. **Ranger par domaine.** Cible : `public` (lu par le navigateur : profils, vues publiques), `catalog` (titres, playlists, réponses), `play` (parties, rooms, défis, Zikle), `salon` (ZIK Soirée : lieux, soirées, joueurs de salon, instantanés, abonnements Pro), `cards`, `social`, `ops` (admin, signalements, prospection, surveillance). Tant que la bascule de la phase 4 n'est pas faite, les tables existantes restent dans `public` ; une **nouvelle** table va directement dans son schéma cible. Côté code : `.schema("…").from(…)`, et la carte table → schéma de `src/lib/server/__tests__/schemasDomaine.test.js` est tenue à jour.
   PostgREST ne suit pas une clé étrangère d'un schéma à l'autre (`PGRST200`) : un lien lu par l'API entre deux schémas devient une fonction de lien (computed relationship) dans le schéma de départ, `stable`, `security invoker`, `search_path = ''`, `rows 1` vers une seule ligne, `execute` aux seuls rôles qui la lisent (exemple : `20261111162521_liens_social_profils.sql`). Jamais une deuxième requête à la place.
4. **RLS partout**, une politique par action et par rôle, avec `(select auth.uid())` et jamais `auth.uid()` nu : la version nue est réévaluée à chaque ligne.
5. **Fonctions** : `security invoker` par défaut. `security definer` seulement si nécessaire, avec `set search_path = ''`, des noms qualifiés (`public.profiles`), une vérification de l'appelant, et `revoke execute … from public, anon, authenticated` si la fonction est réservée au serveur.
6. **Une clé étrangère = un index.**
7. **Côté Node** : `supabase` (clé anonyme, subit les RLS) pour lire ce que le visiteur a le droit de voir ; `getAdminClient()` pour tout ce que le serveur écrit ou doit tout voir (scores, stats, salons, admin). Une écriture de score avec la clé anonyme est une faille, même si elle « marche ».
8. **Supabase Realtime n'est pas utilisé.** Le temps réel passe par Socket.io. Ne l'introduis pas.
9. **Pas de requête dans une boucle** : regroupe avec `.in()` (par paquets de 300 au plus) ou une vue, une fonction.

## Lire l'état réel avant d'écrire

Ne te fie pas aux anciens fichiers de migration (`migrations_archive`) : ils ont divergé de la base. Avant toute modification, regarde la vraie structure sur le staging (MCP `list_tables` avec `verbose: true`, ou `execute_sql` en lecture) et les conseillers (`get_advisors` sécurité et performance).

## Modèles SQL

`references/templates.sql` contient les gabarits : table avec RLS et droits, fonction réservée au serveur, index de clé étrangère, déplacement d'une table vers un schéma avec vue de compatibilité, purge planifiée avec `pg_cron`.
