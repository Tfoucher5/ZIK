# Follow + Amis explicites — Design

_2026-07-07_

## Problème

Le modèle actuel calcule « amis = follow mutuel ». C'est de l'amitié **par accident** :
deux personnes qui se suivent chacune de leur côté deviennent « amis » sans jamais
avoir donné leur accord. On veut deux relations distinctes et complémentaires.

## Modèle relationnel

Deux canaux qui coexistent, chacun avec un rôle propre :

- **Follow** — asymétrique, 1 clic, sans consentement. Canal « découverte / fan ».
  Suivre un joueur ou un créateur de playlists sans le déranger. **Inchangé** (table
  `follows` existante).
- **Ami** — symétrique, demande → acceptation. Canal « lien fort / gameplay ». C'est
  le cercle proche, consenti des deux côtés. Servira plus tard à débloquer les features
  de jeu (invitation en room, classement privé, défis).

On **arrête** de dériver « amis » du follow mutuel.

## Périmètre

**Cette itération = socle relationnel complet, zéro feature gameplay.**

Ce qui débloque l'amitié (invitation en room, classement privé, défis) est reporté :
règles non définies, à concevoir dans des passes dédiées.

## Base de données

Nouvelle table `friendships` :

| colonne      | type                               | notes                                     |
| ------------ | ---------------------------------- | ----------------------------------------- |
| id           | bigint IDENTITY PK                 |                                           |
| requester_id | uuid FK profiles ON DELETE CASCADE | celui qui demande                         |
| addressee_id | uuid FK profiles ON DELETE CASCADE | celui qui reçoit                          |
| status       | text                               | `pending` \| `accepted`, défaut `pending` |
| created_at   | timestamptz                        | défaut now()                              |
| accepted_at  | timestamptz                        | rempli à l'acceptation                    |

Contraintes : `UNIQUE(requester_id, addressee_id)`, `CHECK(requester_id <> addressee_id)`.
Index sur `requester_id` et `addressee_id`.

RLS :

- SELECT : `USING(true)` — lecture publique (compter les amis sur profils publics).
- INSERT : `WITH CHECK(requester_id = auth.uid())`.
- UPDATE : `USING(addressee_id = auth.uid())` — seul le destinataire accepte.
- DELETE : `USING(requester_id = auth.uid() OR addressee_id = auth.uid())` — annuler /
  refuser / retirer.

⚠️ Migration à appliquer **à la main** (le MCP Supabase pointe une base vide, pas ZIK).
Le code reste résilient tant que la table n'existe pas (renvoie un état vide).

## API

### `POST /api/friend` (nouveau)

Body `{ targetId, action }`, `action ∈ { request, accept, remove }`.

- **request** : s'il existe déjà une demande inverse (`target → moi`, pending), on
  l'**accepte** directement (les deux se sont demandés). Sinon insert `pending`.
  Idempotent si déjà pending/accepted.
- **accept** : passe `pending → accepted` la ligne `requester=target, addressee=moi`.
- **remove** : supprime toute ligne entre moi et target (couvre annuler une demande
  sortante, refuser une demande entrante, retirer un ami).

### `GET /api/social/[userId]` (modifié)

- `friends` / `friendsCount` : dérivés de `friendships` **acceptées** impliquant
  `userId` (peu importe le sens), enrichis (profil, triés par ELO).
- `friendStatus` du viewer vis-à-vis de `userId` :
  `none` \| `pending_out` (viewer a demandé) \| `pending_in` (userId a demandé au viewer)
  \| `friends`.
- `isFriend = friendStatus === 'friends'`.
- Sur **son propre** profil (`viewer.id === userId`) : `pendingRequests` (liste enrichie
  des demandeurs en attente) + `pendingCount`.
- Follow inchangé : `followers`, `following`, `viewerFollows`, `followsViewer`.

## UI (`ProfileView.svelte`)

- **Deux boutons distincts** sur un profil tiers : « Suivre » (follow, inchangé) +
  bouton ami selon `friendStatus` :
  - `none` → « + Ajouter en ami »
  - `pending_out` → « Demande envoyée » (clic → annule)
  - `pending_in` → « Accepter » (+ refuser)
  - `friends` → « ★ Amis » (clic → retirer)
- **Section demandes reçues** sur son propre profil (bloc 03), avec accepter / refuser.
- La guestlist (bloc 03) liste désormais les **vraies** amitiés. Texte vide mis à jour
  (« Envoie des demandes d'ami » au lieu de « dès qu'ils te suivent en retour »).

## Versioning

Bump `2.9.0 → 2.10.0`.
