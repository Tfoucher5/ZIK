# ZIK — Rétention & Attractivité : Design Spec

**Date :** 2026-06-29  
**Statut :** Validé — prêt pour implémentation  
**Scope :** 3 piliers indépendants (A, B, C)

---

## Contexte

ZIK est un blind test multijoueur (SvelteKit 5, Socket.io, Supabase). Le problème central identifié : **absence de boucle de rétention** — les utilisateurs jouent, s'amusent, mais n'ont pas de raison mécanique de revenir. Le contenu (rooms) ne peut pas être renouvelé quotidiennement, donc il faut des mécaniques qui créent de la récurrence sans nouveau contenu.

Trois segments cibles : groupes d'amis IRL, compétiteurs solo, créateurs de contenu.

---

## Pilier A — Défi du Jour

### Concept

Chaque jour à minuit (UTC), ZIK sélectionne aléatoirement une room officielle publique et un mode de jeu (Classique ou QCM). Tous les joueurs jouent cette room sur une fenêtre de 24h. Le mode est aléatoire — certains jours avantagent les pros (Classique), d'autres sont plus équilibrés (QCM).

### Mécanique principale

- **Classement éphémère** : leaderboard du jour, reset à minuit. Les scores sont tout de même sauvegardés dans les tables de résultats existantes pour les stats perso.
- **Streak quotidien** : jouer le défi X jours consécutifs maintient la streak. Elle est brisée si le joueur rate un jour. Vérification active au login (pas de décrémentation lazy — voir bug ci-dessous).
- **Bonus XP fixe** : +25 XP pour avoir joué le défi du jour (modeste, pas de multiplicateur).

### Badges liés (tiered)

| Badge       | Condition                                      |
| ----------- | ---------------------------------------------- |
| Série de 3  | 3 jours consécutifs                            |
| Série de 7  | 7 jours consécutifs                            |
| Série de 30 | 30 jours consécutifs                           |
| Régulier    | 10 défis complétés (pas forcément consécutifs) |
| Assidu      | 50 défis complétés                             |
| Légende     | 100 défis complétés                            |

### UI

- Bloc "Défi du Jour" mis en avant sur la homepage et `/rooms`
- Badge "LIVE" sur la room du jour dans la liste des rooms
- Compte à rebours avant le prochain défi
- Après la partie, la page `/results/[id]` affiche un encart spécial "Défi du Jour · Rang #X sur Y joueurs" avec bouton de partage réseaux sociaux

### BDD

```sql
-- Nouvelle table
CREATE TABLE daily_challenges (
  date        DATE PRIMARY KEY,
  room_id     UUID NOT NULL REFERENCES rooms(id),
  mode        TEXT NOT NULL CHECK (mode IN ('classique', 'qcm'))
);
```

La streak est calculée en vérifiant la présence du joueur dans les résultats des `daily_challenges` des N derniers jours. Pas de colonne streak stockée — calculée à la volée ou mise en cache Redis si besoin.

### Bug streak existant à corriger

La streak actuelle affiche 1 même sans jouer depuis plusieurs jours. Cause probable : la streak n'est jamais décrémentée — elle est incrémentée à chaque partie mais jamais vérifiée à l'ouverture de session. **Fix :** au login, vérifier si le joueur a joué hier ou aujourd'hui. Si non, reset la streak à 0 en BDD.

---

## Pilier B — Profil Social

### Concept

Transformer `/user/[username]` en profil de réseau social léger : followers, amis, challenges directs, et surlignage des amis dans le classement global.

### Système de follow / amis

- **Follow unilatéral** : on peut suivre n'importe quel joueur public
- **Suivi mutuel = Amis** : si A suit B et B suit A, ils sont amis (calculé dynamiquement, pas de table séparée)
- Compteurs sur le profil : `X abonnés · X abonnements · X amis`
- Bouton Suivre / Suivi / Ami sur les profils

### Visibilité du profil (3 niveaux)

| Niveau             | Comportement                                     |
| ------------------ | ------------------------------------------------ |
| **Public**         | Tout le monde voit les stats, badges, historique |
| **Amis seulement** | Seuls les amis mutuels voient le détail          |
| **Privé**          | Profil masqué pour tout le monde sauf soi-même   |

Remplace l'actuel toggle public/privé binaire.

### Challenges directs

- Sur une room, bouton "Défier un ami" → sélecteur d'amis → notif in-app envoyée
- L'ami clique sur la notif → arrive directement dans la room sans saisir de code
- Après que les deux ont joué, comparaison score à score affichée

### Classement global avec amis surlignés

- Pas de leaderboard filtré — le classement global reste inchangé
- Les profils de tes amis et abonnements sont **surlignés** (couleur distincte) dans le classement global ELO et score
- Permet de se situer par rapport à son cercle sans perdre la vue globale

### BDD

```sql
-- Nouvelle table
CREATE TABLE follows (
  follower_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Nouvelle table
CREATE TABLE challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Nouvelle table (si pas encore existante)
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Pilier C — Creator Mode

### Concept

Donner aux créateurs (streamers Twitch principalement) des outils pour animer leurs communautés via ZIK, sans overlay OBS. L'intégration se fait via le chat Twitch et une instance de salon éphémère.

### Twitch OAuth dans les settings

- Nouveau bouton "Lier Twitch" dans `/settings` (comme Discord, via Supabase OAuth)
- Stocke `twitch_id`, `twitch_username`, `twitch_avatar` sur le profil

### Mode Streamer

- Activable depuis les settings une fois Twitch lié
- Crée une **instance éphémère** de salon avec un code unique jetable (ex: `STREAM-XXXX`)
- Cette instance est indépendante de la room originale — les viewers la rejoignent via ce code ou via le chat bot
- Interface `/salon/host` adaptée pour le streamer : moins d'UI de config, plus de lisibilité à l'écran

### Bot ZIK (Twitch Chat)

- Un bot ZIK (compte Twitch dédié) lit les commandes dans le chat du créateur
- `!join [pseudo]` → inscrit le viewer comme joueur dans l'instance éphémère active du streamer
- Si le pseudo n'est pas fourni, utilise le username Twitch du viewer
- Le créateur voit les joueurs apparaître en temps réel dans `/salon/host`

### Stats de room créateur

- Sur chaque room créée par l'utilisateur, un dashboard léger accessible depuis `/playlists` ou `/rooms`
- Métriques : joueurs uniques, nombre de parties, score moyen, top 5 joueurs

### Room la plus jouée cette semaine

- Calculé automatiquement sur les 7 derniers jours (agrégation sur les résultats existants)
- Mise en avant sur la homepage et `/rooms` avec badge "🔥 Room de la semaine"
- Pas d'intervention manuelle admin — 100% automatique
- Incentive les créateurs à soigner leurs rooms pour attirer du trafic

### BDD

```sql
-- Champs à ajouter sur profiles
ALTER TABLE profiles
  ADD COLUMN twitch_id        TEXT,
  ADD COLUMN twitch_username  TEXT,
  ADD COLUMN twitch_avatar    TEXT,
  ADD COLUMN streamer_mode    BOOLEAN DEFAULT FALSE;

-- Instances éphémères de salon streamer
CREATE TABLE streamer_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id     UUID REFERENCES rooms(id),
  code        TEXT NOT NULL UNIQUE,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);
```

La "Room la plus jouée" est une vue calculée, pas une table — requête sur les résultats des 7 derniers jours groupée par `room_id`.

---

## Sujets hors scope (à brainstormer séparément)

| #   | Sujet                                                  |
| --- | ------------------------------------------------------ |
| 4   | Déduplication `custom_playlist_tracks` (migration BDD) |
| 5   | Like/Dislike des titres en cours de partie             |
| 6   | Refonte graphique du site                              |
| 7   | Nettoyage et optimisation du code                      |

---

## Ordre d'implémentation suggéré

1. **Bug streak** (fix rapide, indépendant)
2. **Pilier A** — Défi du Jour (table simple, UI homepage/rooms/results)
3. **Pilier B** — Profil Social (table follows, challenges, notifs)
4. **Pilier C** — Creator Mode (Twitch OAuth + bot + stats)
