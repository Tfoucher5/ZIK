# Amis utiles — notifications, présence, invitations, classement — Design

_2026-07-07_

## Problème

Le socle relationnel (follows + friendships) existe mais ne sert à rien dans le jeu.
On branche quatre usages : menu de notifications, amis en ligne + rejoindre,
invitations en room, classement entre amis.

## Architecture temps réel

Socket global « présence » (approche retenue) : le layout ouvre une connexion
Socket.io légère quand l'utilisateur est connecté. Module
`src/lib/server/socket/presence.js`, map `globalThis.__zik_presence`
(`userId → Set<socketId>`). Le serveur custom et les API routes partagent le même
process : les endpoints REST lisent la présence en mémoire directement.

## BDD — table `notifications`

| colonne    | type                               | notes                                                |
| ---------- | ---------------------------------- | ---------------------------------------------------- |
| id         | bigint IDENTITY PK                 |                                                      |
| user_id    | uuid FK profiles ON DELETE CASCADE | destinataire                                         |
| type       | text                               | `friend_request` \| `friend_accept` \| `room_invite` |
| actor_id   | uuid FK profiles ON DELETE CASCADE | auteur                                               |
| payload    | jsonb                              | ex. `{ roomId, roomName }`                           |
| read       | boolean défaut false               |                                                      |
| created_at | timestamptz défaut now()           |                                                      |

RLS : SELECT/UPDATE/DELETE sur ses propres lignes ; INSERT réservé au serveur
(service role, pas de policy INSERT).

**TTL 24 h** : purge lazy — chaque GET supprime d'abord les lignes > 24 h de
l'utilisateur. Code résilient si la table n'existe pas (état vide).

⚠️ Migration à appliquer **à la main** (MCP Supabase pointe une base vide).

## API

- `GET /api/presence?ids=a,b,c` → `{ [id]: { online, roomId, roomName } }`
  (croisement présence + `roomGames`).
- `GET /api/notifications` → purge 24 h puis liste enrichie (profil acteur) +
  `unreadCount`.
- `POST /api/notifications` `{ action: 'read' }` → tout marquer lu.
- `POST /api/invite` `{ targetId, roomId }` → vérifie l'amitié acceptée, crée la
  notif `room_invite`, push socket.
- `/api/friend` modifié : crée `friend_request` à la demande, `friend_accept` à
  l'acceptation (supprime la notif `friend_request` correspondante), push socket.

## UI

- **Nav** : cloche + badge non-lues, dropdown notifications : demande d'ami avec
  Accepter/Refuser inline, « X a accepté ta demande » (lien profil), invitation
  avec bouton Rejoindre → `/game?roomId=…`. Ouverture = tout marquer lu.
  Temps réel via événement socket `notify`.
- **Classements** : chip « Amis » (ELO et Score) — endpoints leaderboard filtrés
  sur amitiés acceptées + soi-même. Visible seulement connecté.
- **ProfileView** : point vert en ligne, « En room X » + bouton Rejoindre
  (via `/api/presence`). Bouton « Inviter à jouer » sur profil ami + guestlist →
  modale choix de room (room actuelle mise en avant, mes rooms, rooms publiques).

## Versioning

Pas de bump.
