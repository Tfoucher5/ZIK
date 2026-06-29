# ZIK — Normalisation `custom_playlist_tracks` : Design Spec

**Date :** 2026-06-29  
**Statut :** Validé — prêt pour implémentation  
**Priorité :** Avant les nouvelles features (environnement sain d'abord)

---

## Contexte

La table `custom_playlist_tracks` stocke toutes les métadonnées d'un titre (title, artist, url_audio, url_cover, duration, etc.) directement dans la ligne. Résultat : le même titre ajouté à 3 playlists = 3 lignes identiques. La table grossit inutilement et les mises à jour d'un titre doivent être répercutées sur N lignes.

---

## Structure cible

### Nouvelle table `tracks`

```sql
CREATE TABLE tracks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  artist     TEXT NOT NULL,
  url_audio  TEXT,
  url_cover  TEXT,
  duration   INT,
  source     TEXT NOT NULL DEFAULT 'manual'
               CHECK (source IN ('deezer', 'spotify', 'manual')),
  source_id  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (source, source_id) -- dédup auto Deezer/Spotify
);

-- Dédup manuel par URL audio
CREATE UNIQUE INDEX tracks_manual_url_idx
  ON tracks (url_audio)
  WHERE source = 'manual' AND url_audio IS NOT NULL;
```

### Table `custom_playlist_tracks` (après migration)

```sql
-- Colonnes qui restent (spécifiques à la playlist) :
-- id, playlist_id, track_id (FK → tracks), position,
-- extra_answers, custom_fields, created_at

ALTER TABLE custom_playlist_tracks
  ADD COLUMN track_id UUID REFERENCES tracks(id) ON DELETE RESTRICT;

-- Après validation complète, suppression des colonnes dupliquées :
ALTER TABLE custom_playlist_tracks
  DROP COLUMN title,
  DROP COLUMN artist,
  DROP COLUMN url_audio,
  DROP COLUMN url_cover,
  DROP COLUMN duration,
  DROP COLUMN source,
  DROP COLUMN source_id;
  -- (adapter selon les colonnes réelles)
```

---

## Règle de déduplication

| Source  | Clé d'unicité                                                 |
| ------- | ------------------------------------------------------------- |
| deezer  | `(source='deezer', source_id)`                                |
| spotify | `(source='spotify', source_id)`                               |
| manual  | `url_audio` (si renseigné), sinon nouveau track à chaque fois |

À l'insert : `ON CONFLICT DO NOTHING` + `RETURNING id` pour récupérer l'id existant ou nouvellement créé.

---

## Stratégie de migration (jamais destructive avant validation)

### Étape 1 — Créer la table `tracks`

Appliquer le DDL ci-dessus. Aucun impact sur l'existant.

### Étape 2 — Peupler `tracks` depuis l'existant

```sql
INSERT INTO tracks (title, artist, url_audio, url_cover, duration, source, source_id)
SELECT DISTINCT ON (
  COALESCE(source_id, url_audio, title || '|' || artist)
)
  title, artist, url_audio, url_cover, duration,
  COALESCE(source, 'manual'),
  source_id
FROM custom_playlist_tracks
ON CONFLICT DO NOTHING;
```

### Étape 3 — Backfill `track_id`

```sql
UPDATE custom_playlist_tracks cpt
SET track_id = t.id
FROM tracks t
WHERE t.source_id IS NOT NULL AND t.source_id = cpt.source_id
   OR t.url_audio = cpt.url_audio
   OR (t.title = cpt.title AND t.artist = cpt.artist);
```

Vérifier que `track_id IS NULL` = 0 lignes avant de continuer.

### Étape 4 — Mettre à jour toutes les API

Fichiers impactés (toutes les requêtes qui lisent/écrivent `custom_playlist_tracks`) :

- `src/routes/(site)/api/playlists/[id]/+server.js`
- `src/routes/(site)/api/playlists/[id]/official/+server.js`
- `src/routes/(site)/api/playlists/tracks/[trackId]/answers/+server.js`
- `src/lib/server/services/playlist.js`
- `src/lib/server/socket/game.js` (lecture des tracks en cours de partie)
- `src/lib/server/socket/salon.js` (idem)

Toutes les lectures deviennent des JOINs :

```sql
SELECT cpt.*, t.title, t.artist, t.url_audio, t.url_cover, t.duration
FROM custom_playlist_tracks cpt
JOIN tracks t ON t.id = cpt.track_id
WHERE cpt.playlist_id = $1
ORDER BY cpt.position;
```

Tous les inserts passent par un upsert sur `tracks` d'abord, puis insert dans `custom_playlist_tracks` avec le `track_id` retourné.

### Étape 5 — Validation complète

- [ ] Toutes les playlists s'affichent correctement
- [ ] Ajouter un titre depuis Deezer/Spotify ne crée pas de doublon
- [ ] Le jeu charge correctement les tracks en partie
- [ ] Le Mode Salon charge correctement les tracks
- [ ] `track_id IS NULL` = 0 lignes dans `custom_playlist_tracks`

### Étape 6 — Passer `track_id` en NOT NULL

```sql
ALTER TABLE custom_playlist_tracks
  ALTER COLUMN track_id SET NOT NULL;
```

### Étape 7 — Supprimer les colonnes dupliquées

Uniquement après que l'étape 5 est validée en production.

```sql
ALTER TABLE custom_playlist_tracks
  DROP COLUMN title,
  DROP COLUMN artist,
  -- etc.
```

---

## Impact attendu

- Zéro doublon de métadonnées titre en base
- Insert d'un titre déjà connu = lookup uniquement, pas de nouvelle ligne dans `tracks`
- Mise à jour d'un titre (ex: correction d'un artiste) = une seule ligne à modifier
- Taille de `custom_playlist_tracks` réduite significativement
