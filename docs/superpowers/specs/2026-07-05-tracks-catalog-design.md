# Spec — Catalogue de titres unique + overrides par playlist

**Date :** 2026-07-05
**Contexte :** la BDD de prod est la seule BDD (pas d'environnement de dev). La migration est conçue pour être sûre : phases additives, backup, rollback possible.

## Problème

`custom_playlist_tracks` duplique les métadonnées d'un titre pour chaque playlist qui le contient :

- 11 609 lignes pour seulement 8 413 titres distincts (clé `lower(trim(artist)) + '|' + lower(trim(title))`)
- 1 625 titres dupliqués entre playlists (jusqu'à 5 copies)
- 385 lignes sont des doublons _à l'intérieur d'une même playlist_ (bug réel)
- Maintenance multipliée : refresh des previews Deezer, backfill des covers et corrections de métadonnées se font N fois par titre

Les modifications utilisateur (`custom_artist`, `custom_title`, `custom_feats`) et les réponses supplémentaires (`track_answers`) doivent rester **scopées par playlist** : 350 groupes de doublons ont aujourd'hui des overrides différents selon la copie.

## Décisions validées

- Scope des modifications : **par playlist** (l'édition se fait dans l'éditeur de playlist ; une room hérite des overrides de ses playlists)
- Clé de déduplication : **artist + title normalisés** (`lower(trim(...))`), pas `external_id` (fusionne les imports Deezer/Spotify du même titre)
- Les overrides restent sur la ligne de liaison (pas de 3ᵉ table) → `track_answers` ne migre pas

## Schéma cible

### Nouvelle table `tracks` (catalogue canonique partagé)

| Colonne              | Type                                                                                        | Notes  |
| -------------------- | ------------------------------------------------------------------------------------------- | ------ |
| `id`                 | uuid PK, default `gen_random_uuid()`                                                        |        |
| `artist`             | text NOT NULL                                                                               |        |
| `title`              | text NOT NULL                                                                               |        |
| `norm_key`           | text GENERATED ALWAYS AS (`lower(btrim(artist)) \|\| '\|' \|\| lower(btrim(title))`) STORED | UNIQUE |
| `preview_url`        | text nullable                                                                               |        |
| `preview_expires_at` | timestamptz nullable                                                                        |        |
| `cover_url`          | text nullable                                                                               |        |
| `external_id`        | text nullable                                                                               |        |
| `source`             | text default `'manual'`                                                                     |        |
| `created_at`         | timestamptz default now()                                                                   |        |

RLS : SELECT public (`true`). Aucune policy INSERT/UPDATE/DELETE → écritures uniquement via service role côté serveur.

### `custom_playlist_tracks` amincie (lien + overrides)

- **Garde :** `id`, `playlist_id`, `position`, `custom_artist`, `custom_title`, `custom_feats`, `created_at`
- **Ajoute :** `track_id` uuid NOT NULL, FK → `tracks.id`
- **Supprime (phase 2 uniquement) :** `artist`, `title`, `preview_url`, `cover_url`, `source`, `external_id`, `preview_expires_at`
- **Contrainte (phase 2) :** `UNIQUE (playlist_id, track_id)`
- `track_answers` : inchangée (FK vers `custom_playlist_tracks.id`, scope playlist conservé)
- Trigger `trg_playlist_track_count` : inchangé
- RLS existantes : inchangées

## Nouvel endpoint `POST /api/tracks/resolve`

Le client ne peut plus écrire dans `tracks` (RLS). Endpoint authentifié (Bearer token, même middleware que `/answers`) :

- **Body :** `{ tracks: [{ artist, title, preview_url, cover_url, source, external_id }] }` (1..N)
- **Traitement :** pour chaque titre, upsert admin sur `norm_key` avec enrichissement :
  `preview_url = COALESCE(tracks.preview_url, excluded.preview_url)` (idem `preview_expires_at`, `cover_url`, `external_id`, `source`)
- **Réponse :** `{ ids: [track_id, ...] }` dans le même ordre
- Utilisé par l'ajout unitaire ET l'import batch de `playlists/+page.svelte`. Limite : 500 titres par appel.

## Migration — 3 étapes séparées dans le temps

### Étape 0 — Backup (avant tout)

```sql
CREATE SCHEMA IF NOT EXISTS backup;
CREATE TABLE backup.cpt_20260705 AS SELECT * FROM custom_playlist_tracks;
CREATE TABLE backup.track_answers_20260705 AS SELECT * FROM track_answers;
```

Vérifier les counts backup = source avant de continuer.

### Étape 1 — Migration additive (l'ancien code continue de fonctionner)

1. Créer `tracks` + RLS
2. Peupler : 1 ligne par `norm_key`, meilleure copie par priorité `preview_url IS NOT NULL` > `cover_url IS NOT NULL` > `created_at DESC`
3. `ALTER TABLE custom_playlist_tracks ADD COLUMN track_id uuid` (nullable, sans FK pour l'instant)
4. Backfill `track_id` par join sur `norm_key`
5. Doublons intra-playlist : re-pointer `track_answers` des lignes excédentaires vers la ligne conservée (la plus ancienne), supprimer les answers devenues strictement identiques (même track_id + type + value), puis supprimer les 385 lignes excédentaires

**Vérifications étape 1 (bloquantes) :**

- `SELECT count(*) FROM custom_playlist_tracks WHERE track_id IS NULL` = 0
- `count(*) tracks` = nombre de norm_key distincts
- Aucun `track_answers.track_id` orphelin
- Plus aucun doublon `(playlist_id, track_id)`

L'ancien code lit toujours les anciennes colonnes → prod intacte. **Rollback : rien à faire** (colonnes ajoutées ignorées par l'ancien code).

### Étape 2 — Déploiement du code

Déployer le code qui lit via `track_id` + join `tracks`. Immédiatement après le déploiement, re-exécuter le backfill de l'étape 1.4 (rattrape les lignes insérées par l'ancien code entre migration et déploiement) et re-vérifier `track_id IS NULL` = 0.

**Rollback : redéployer l'ancien code** (les anciennes colonnes sont toujours là et toujours remplies pour les lignes existantes).

### Étape 3 — Verrouillage + nettoyage (après validation fonctionnelle en prod, pas le même jour)

1. `ALTER TABLE custom_playlist_tracks ALTER COLUMN track_id SET NOT NULL`
2. FK `track_id → tracks.id`
3. `UNIQUE (playlist_id, track_id)`
4. DROP des colonnes métadonnées dupliquées

**Rollback après étape 3 :** restauration depuis `backup.cpt_20260705` (catastrophe uniquement). Les tables backup sont conservées quelques semaines puis supprimées manuellement.

## Code à adapter

| Fichier                                                                 | Changement                                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/services/playlist.js`                                   | Selects avec join `tracks(...)` ; `refreshExpiredPreviews` et `runPreviewRefreshCron` opèrent sur `tracks` (1 update par titre) ; `dedup()` runtime conservé (2 playlists d'une room peuvent partager un titre) |
| `src/lib/server/socket/salon.js`                                        | `loadTracksForPlaylist` : même join                                                                                                                                                                             |
| `src/routes/(site)/api/playlists/tracks/[trackId]/answers/+server.js`   | Défauts (`artist`, `title`) lus via join `tracks` ; PUT inchangé (colonnes custom toujours sur `custom_playlist_tracks`)                                                                                        |
| `src/routes/(site)/playlists/+page.svelte`                              | `addTrack`/`addBatch` passent par `/api/tracks/resolve` puis insèrent le lien ; `loadEditorTracks` avec join ; affichage via `t.tracks.artist` etc.                                                             |
| `src/routes/(admin)/admin/playlists/[id]/+page.server.js` (+ `.svelte`) | Load avec join ; `deleteTrack` log artist/title via join ; `reorderTrack`/`editTrackMeta` inchangés                                                                                                             |
| `src/lib/server/services/coverBackfill.js`                              | Cible `tracks` (covers manquantes des titres liés aux playlists données)                                                                                                                                        |
| `src/routes/(site)/api/rooms/official/+server.js`                       | Cover de room via join `tracks(cover_url)`                                                                                                                                                                      |
| `src/routes/(site)/api/tracks/resolve/+server.js`                       | **Nouveau** endpoint                                                                                                                                                                                            |
| `src/routes/(site)/api/playlists/[id]/+server.js`, `api/profile/delete` | Inchangés (suppression des liens ; les titres restent au catalogue)                                                                                                                                             |

Les titres orphelins (plus aucun lien) restent dans `tracks` : c'est un catalogue partagé, pas de nettoyage.

**Compat descendante pendant l'étape 2 :** le code déployé doit tolérer `track_id` null sur des lignes fraîches (fenêtre entre migration et déploiement) → dans les loaders, fallback sur les anciennes colonnes si `tracks` est null. Ce fallback est retiré après l'étape 3.

## Ordre d'implémentation du code

1. Migration étape 0 + 1 (SQL via MCP Supabase, `apply_migration`)
2. Nouveau endpoint `/api/tracks/resolve`
3. Adaptation des loaders serveur (playlist.js, salon.js) avec fallback
4. Adaptation UI (playlists, admin) + answers endpoint + coverBackfill + rooms/official
5. Lint + test local complet (le local pointe sur la BDD de prod : tester en lecture d'abord, écritures sur une playlist de test dédiée)
6. Déploiement + re-backfill + vérifications
7. Étape 3 (J+1 minimum) + retrait du fallback + bump version

## Vérification fonctionnelle (checklist post-déploiement)

- Partie classique sur room officielle (previews jouent, réponses acceptées, overrides appliqués)
- Mode salon : création + partie complète
- Éditeur playlist : ajout manuel, import Spotify, import Deezer, suppression d'un titre, édition des réponses (custom + extra answers type Film/Série)
- Admin : liste des titres d'une playlist, edit meta, reorder, delete
- Page rooms : covers affichées
- `npm run lint` avant push

## Hors périmètre

- Nettoyage des titres orphelins du catalogue
- Overrides par room (niveau supplémentaire) — YAGNI
- Fusion plus agressive (unaccent, suppression de parenthèses) de la clé de dédup
