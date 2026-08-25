# Report audio ciblé et lecteur de diagnostic admin — design

**Date :** 2026-08-25
**Version cible :** 3.6.0

## Problème

La majorité des signalements de bug portent sur un même symptôme : le joueur n'entend pas
la musique. Or le formulaire actuel ne recueille qu'un message libre et le code de la room.
Rien ne permet de savoir **quel morceau** était muet, ni pourquoi.

Côté administration, il n'existe aucun moyen de rejouer la chaîne audio d'un titre. Le
diagnostic mené le 2026-08-25 sur une panne locale l'a montré : il a fallu écrire des
scripts jetables pour interroger `tracks`, appeler `yt-dlp`, tester le proxy et comparer
les réponses de Deezer. Ce travail doit devenir un outil.

## Décisions validées

| Sujet                      | Décision                                                                 |
| -------------------------- | ------------------------------------------------------------------------ |
| Périmètre de l'outil admin | Diagnostic **et** correction manuelle, avec test avant enregistrement    |
| Formulaire de report       | Un motif d'abord ; le motif audio déplie la liste des manches            |
| Manche en cours            | Sélectionnable mais **masquée** — jamais d'artiste ni de titre à l'écran |
| Sélection                  | Plusieurs titres possibles (cases à cocher)                              |
| Appariement automatique    | Écarté                                                                   |

## Prérequis — l'identifiant du titre

`buildTrack` (`src/lib/server/services/playlist.js:107`) construit l'objet de jeu sans
conserver l'identifiant du catalogue. La requête `TRACK_ROW_SELECT` sélectionne pourtant
`tracks(id, …, external_id, …)`, mais `buildTrackFromRow` ne les recopie pas. `currentTrack`
n'a donc **aucun identifiant stable**, et sans lui rien de ce qui suit n'est possible.

`buildTrack` gagne deux champs dans son retour : `id` (celui du catalogue `tracks`) et
`external_id`. `buildTrackFromRow` les transmet depuis `trackMeta(row)`.

**Attention aux deux autres appelants.** `src/routes/(site)/api/rooms/custom/+server.js:45`
appelle `buildTrack` directement, sans passer par une ligne de catalogue : il ne fournira
ni `id` ni `external_id`, qui vaudront donc `undefined`. Tout consommateur doit traiter
l'absence d'identifiant comme un cas normal, jamais comme une erreur.
`src/lib/server/socket/salon.js:50` utilise `buildTrackFromRow` et héritera des champs sans
modification.

Ajouter deux clés à un objet n'altère aucun comportement existant : aucune comparaison ni
sérialisation du jeu n'énumère ses clés.

## 1. Serveur de jeu — transporter l'identifiant

### 1.1 Résumé de manche

Dans `src/lib/server/socket/game/core.js` (~ligne 187), l'objet `summary` poussé dans
`game.history` gagne :

- `trackId` — `track.id`, l'identifiant du catalogue
- `videoId` — la source réellement servie pour cette manche, déjà calculée plus haut dans
  la fonction et présente dans `game.lastRoundData.videoId`

Ces champs partent au client avec l'historique existant. Ils ne sont jamais affichés.

### 1.2 Manche en cours

Le client doit pouvoir désigner la manche en cours sans en connaître le contenu. Les
identifiants de la manche courante sont donc envoyés **dans `start_round`**, aux côtés de
`videoId` déjà présent : ajouter `trackId`.

Aucun champ révélant l'artiste ou le titre n'est ajouté à `start_round` — c'est la règle
qui protège du spoiler, et elle doit être vérifiée à la relecture.

## 2. Formulaire de report

### 2.1 Motifs

`ReportModal.svelte` gagne, pour `type='bug'`, une liste de motifs :

- `audio` — « Je n'entends pas la musique »
- `mauvaise-reponse` — « Un titre a une mauvaise réponse »
- `affichage` — « Problème d'affichage »
- `autre` — « Autre »

Le motif est envoyé dans le champ `subject`, déjà présent dans la table `reports` et
aujourd'hui inutilisé pour les bugs.

### 2.2 Sélecteur de titres

Visible **uniquement** pour le motif `audio`. Il liste, de la plus récente à la plus
ancienne :

- la manche en cours, si une manche est active : libellé « Manche N — en cours », sans
  artiste ni titre, **pré-cochée**
- les manches terminées : « M<N> · <answer> », l'`answer` étant déjà connu du client

Cases à cocher, plusieurs titres possibles. Si aucune manche n'a encore été jouée et
qu'aucune n'est en cours, le sélecteur affiche « Aucun titre joué pour l'instant » et le
message redevient obligatoire.

### 2.3 Message

Obligatoire pour tous les motifs **sauf** `audio`, où au moins un titre coché suffit. Si le
motif est `audio` et qu'aucun titre n'est coché, le message redevient obligatoire — le
joueur doit fournir au moins une information exploitable.

### 2.4 Données transmises

Les titres cochés partent dans `metadata`, colonne `jsonb` déjà présente sur `reports` :

```json
{
  "tracks": [
    { "trackId": "uuid", "videoId": "abc123", "round": 5, "answer": null },
    {
      "trackId": "uuid",
      "videoId": "def456",
      "round": 4,
      "answer": "PLK - Pas de son"
    }
  ]
}
```

`answer` vaut `null` pour la manche en cours : le client ne le connaît pas. L'administration
le retrouvera par `trackId`.

`/api/reports/+server.js` accepte déjà `metadata` et `subject` sans modification. Le
serveur ne fait **aucune** validation du contenu de `metadata` aujourd'hui ; on ajoute une
vérification minimale : `metadata.tracks`, s'il est présent, doit être un tableau d'au plus
50 entrées, sans quoi il est ignoré. Il s'agit d'une entrée utilisateur écrite en base.

## 3. Lecteur de diagnostic admin

### 3.1 Forme

Un composant `src/lib/components/admin/TrackAudioDebugger.svelte`, dont la seule entrée est
un `trackId`. Monté à deux endroits :

- `/admin/reports` — sur un report de motif `audio`, chaque titre signalé porte un bouton
  qui ouvre le lecteur sur ce `trackId`
- `/admin/tracks` — pour diagnostiquer un titre quelconque sans attendre un report

### 3.2 Étapes affichées

Le composant appelle un endpoint dédié qui rejoue la chaîne réelle et renvoie le résultat
de chaque étape, dans l'ordre où le jeu les emprunte :

| Étape     | Ce qui est rapporté                                                                                |
| --------- | -------------------------------------------------------------------------------------------------- |
| Catalogue | `preview_url` présente ou non, `preview_expires_at`, expiration effective, `external_id`, `source` |
| yt-dlp    | succès ou échec, URL obtenue (tronquée), client utilisé (`c=` de l'URL), **version du binaire**    |
| Proxy     | statut HTTP réel de `/api/game/audio?v=…`, corps d'erreur le cas échéant                           |
| Deezer    | ce que renvoie la recherche sur artiste + titre                                                    |
| iTunes    | idem, dernier repli                                                                                |

La version de `yt-dlp` figure au rapport : un binaire obsolète a déjà été la cause d'une
panne complète, et c'est invisible autrement.

Chaque étape est exécutée même si une précédente a réussi : le but est de voir l'état de
toute la chaîne, pas de s'arrêter au premier succès.

### 3.3 Endpoint

`POST /api/admin/track-audio-debug`. Corps : `{ trackId, overrideExternalId?,
overridePreviewUrl? }`. Réponse : un objet par étape, avec `ok`, `detail` et `error`.

**Protection** — reprendre à l'identique le `checkAdmin` de
`src/routes/(site)/api/admin/errors/+server.js` : jeton passé en paramètre d'URL,
`verifyToken` depuis `$lib/server/middleware/auth.js`, puis lecture de `profiles.role` avec
le client admin et rejet en `403` si le rôle n'est pas `super_admin`. Ne pas inventer un
autre mécanisme : le groupe de routes `(admin)` ne protège rien côté serveur, son
`+layout.server.js` ne fait que transmettre les variables d'environnement. Chaque endpoint
porte donc sa propre vérification.

L'endpoint ne modifie **jamais** la base. Il lit et teste, rien d'autre.

### 3.4 Correction

Sous le rapport : un lecteur `<audio>` sur la source retenue, un champ `external_id` Deezer,
un champ URL de preview, un bouton « Retester » qui rappelle l'endpoint avec les valeurs
saisies, et un bouton « Enregistrer ».

**« Enregistrer » est désactivé tant que le dernier test n'a pas abouti.** On n'écrit une
source en base qu'après l'avoir entendue fonctionner. L'écriture met à jour `preview_url`,
`preview_expires_at` et `external_id` sur la ligne `tracks`, via un second endpoint
`POST /api/admin/track-audio-fix`, lui aussi réservé au `super_admin`.

## Ce qui est hors périmètre

Appariement automatique d'une source, notification aux joueurs, statut de traitement des
reports, rejeu d'une partie complète, correction en masse. Le défaut connu de
`scripts/ensure-ytdlp.mjs` — un binaire présent n'est jamais mis à jour — reste un chantier
distinct, mentionné ici parce que le rapport en expose désormais la version.

## Vérification

1. `npm run lint` et `npx vitest run` passent.
2. Le code source d'une page de jeu, pendant une manche active, ne contient **ni l'artiste
   ni le titre** de la manche en cours — à vérifier explicitement, c'est la garantie
   anti-spoiler.
3. Un report de motif `audio` avec deux titres cochés arrive en base avec un
   `metadata.tracks` de deux entrées et `subject = 'audio'`.
4. Un report de motif `affichage` ne montre aucun sélecteur et exige un message.
5. Le lecteur admin, sur un titre dont `preview_url` est nulle, montre l'étape Catalogue en
   échec et les étapes suivantes renseignées.
6. « Enregistrer » reste désactivé tant qu'aucun test n'a réussi.
7. Un utilisateur non `super_admin` reçoit une erreur sur les deux endpoints.
