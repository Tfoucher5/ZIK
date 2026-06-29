# ZIK — Nettoyage & Refactoring Code : Design Spec

**Date :** 2026-06-29  
**Statut :** Validé — prêt pour implémentation  
**Priorité :** Avant les nouvelles features (environnement sain d'abord)

---

## Contexte

Le codebase ZIK souffre de trois problèmes de maintenabilité :

1. **Pages monstre** : homepage (1847L), playlists (1858L), game (1187L), socket/game.js (1584L)
2. **Trop peu de composants** : 12 composants globaux pour ~50 fichiers de routes
3. **Patterns dupliqués** : modals, toasts, tabs, avatars réimplémentés dans chaque page

Approche : audit transversal des patterns communs → extraction de composants globaux → nettoyage fichier par fichier (code mort + CSS orphelin + application des nouveaux composants).

**Règle absolue :** refactoring pur, aucune modification de comportement. Commit intermédiaire après chaque fichier terminé.

---

## Phase 1 — Composants globaux à créer

Patterns identifiés comme dupliqués entre pages :

### `Modal.svelte`

Wrapper générique pour tout overlay/modal : backdrop, fermeture au clic extérieur, trap focus, slot pour le contenu. Remplace le chrome dupliqué dans `AuthModal`, `ContactModal`, `ReportModal` et les modals inline dans plusieurs pages.

Props : `open` (bool), `onClose` (fn), `maxWidth` (string).

### `TabBar.svelte`

Barre d'onglets réutilisable. Utilisée dans `/classements`, `/user/[username]`, pages admin.

Props : `tabs` (array `{id, label}`), `active` (string), `onChange` (fn).

### `Toast.svelte` + `useToast.js`

Remplace les ~10 implémentations de toast inline (état `toastMsg`/`toastType` + timer + HTML dupliqués dans chaque page). Un composant singleton dans le layout, un store/util `useToast()` appelé depuis n'importe quelle page.

### `Avatar.svelte`

Affichage d'avatar avec fallback dicebear automatique. Utilisé dans profil, classements, résultats, salon.

Props : `url` (string|null), `username` (string), `size` (number).

### `LoadMore.svelte`

Bouton "Charger plus" + état loading. Dupliqué dans classements, playlists, rooms.

Props : `loading` (bool), `hasMore` (bool), `onLoad` (fn).

### `EmptyState.svelte`

État vide "aucun résultat" avec icône + message. Dupliqué dans rooms, playlists, classements.

Props : `icon` (string), `title` (string), `description` (string).

---

## Phase 2 — Modularité du système de jeu

### Découpage de `socket/game.js` (1584L)

```
src/lib/server/socket/game/
  index.js        ← point d'entrée, register(), assemble les modules
  core.js         ← boucle de jeu, gestion room, événements Socket.io
  scoring.js      ← calcul scores, delta ELO, classement en fin de partie
  timer.js        ← gestion du timer par manche
  audio.js        ← sélection des pistes, ordre de lecture
  achievements.js ← vérifications succès post-manche/post-partie
  config.js       ← feature flags
```

### `config.js` — feature flags

```js
export const GAME_FEATURES = {
  hints: true, // indices pendant la manche
  extraAnswers: true, // réponses alternatives acceptées
  streakBonus: true, // bonus de série de bonnes réponses
  achievements: true, // vérification des succès
  eloRanked: true, // calcul ELO en fin de partie
};
```

Chaque module vérifie son flag en entrée de fonction. Désactiver une mécanique = changer un booléen dans ce fichier, sans toucher à la logique.

### Règle d'interface entre modules

Les modules ne s'importent pas entre eux directement. Tout passe par `index.js` qui injecte les dépendances. Chaque module exporte des fonctions pures (input → output) sans effets de bord Socket.io — seul `core.js` émet des événements Socket.io.

---

## Phase 3 — Nettoyage fichier par fichier

Ordre d'attaque (taille décroissante, risque croissant en dernier) :

| Priorité | Fichier                    | Lignes | Actions                                                                                 |
| -------- | -------------------------- | ------ | --------------------------------------------------------------------------------------- |
| 1        | `playlists/+page.svelte`   | 1858   | Extraire : `PlaylistEditor`, `TrackRow`, `TrackSearchResults`, `PlaylistCard`           |
| 2        | `+page.svelte` (homepage)  | 1847   | Extraire : `DailyChallenge` (futur), sections rooms, appliquer `EmptyState`, `LoadMore` |
| 3        | `socket/game.js`           | 1584   | Split modulaire (Phase 2)                                                               |
| 4        | `game/+page.svelte`        | 1187   | Extraire : `ScoreBoard`, `AnswerInput`, `TrackPlayer`, `GameTimer`                      |
| 5        | `classements/+page.svelte` | 969    | Extraire : `LeaderboardRow`, appliquer `TabBar`, `LoadMore`, `EmptyState`               |
| 6        | `settings/+page.svelte`    | 702    | Appliquer `Modal` pour les confirmations, `Toast` centralisé                            |
| 7        | `AuthModal.svelte`         | 409    | Migrer vers `Modal.svelte` wrapper                                                      |
| 8        | Fichiers restants          | <400   | Code mort + CSS orphelin uniquement                                                     |

### Pour chaque fichier, checklist :

- [ ] Supprimer les variables `$state` jamais lues
- [ ] Supprimer les imports non utilisés
- [ ] Supprimer les fonctions jamais appelées
- [ ] Supprimer le CSS dont les sélecteurs n'ont aucun élément correspondant
- [ ] Remplacer les patterns dupliqués par les composants de la Phase 1
- [ ] Vérifier visuellement dans le navigateur avant commit
- [ ] Commit avec message `refactor(<page>): extract components, remove dead code`

---

## CSS — règle de rangement

| Type de style                           | Où il va                         |
| --------------------------------------- | -------------------------------- |
| Reset, nav, footer, boutons globaux     | `static/css/base.css`            |
| Animations, keyframes, blobs            | `static/css/animations.css`      |
| Styles spécifiques à une page/composant | `<style>` scoped dans le fichier |
| Styles Mode Salon                       | `static/css/salon.css`           |
| Styles page de jeu                      | `static/css/game.css`            |

Pas de nouvelle feuille CSS globale. Pas de styles inline (`style="..."`) sauf valeurs dynamiques.

---

## Ce que ce chantier ne fait PAS

- Aucun changement de comportement ou de feature
- Aucune modification des API ou de la BDD
- Aucun changement de design visuel
- Pas de migration vers un framework CSS
