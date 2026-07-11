# AdSense — Emplacements v2 — Design

**Date :** 2026-07-09
**Objectif :** Étendre la couverture pub au-delà des 4 slots initiaux (voir `2026-07-08-adsense-design.md`), sans jamais gêner le jeu.

## Décisions (brainstorm 2026-07-09)

- **Tout le monde voit les pubs** (invités + inscrits), sauf le super_admin (masquage conservé). `AdSlot` ne dépend plus de `authReady` : la pub s'affiche sans attendre la résolution de l'auth (déjà dans le working tree).
- **Mode Salon : zéro pub**, ni TV ni téléphone joueur. Reste hors périmètre définitivement.
- **Pas de sticky mobile** (ni ancre Google, ni tiroir custom) : uniquement des encarts dans le flux.
- **Jamais pendant une manche active** — inchangé.
- La rotation des créas est gérée par AdSense : plusieurs instances du même slot ID sur une page reçoivent chacune une pub différente.

## Nouveaux emplacements

| Page / moment        | Position                                        | Slot               | Fréquence             |
| -------------------- | ----------------------------------------------- | ------------------ | --------------------- |
| /rooms               | pub-tuile dans le patchwork (case `pw-e`)       | roomsTile          | 1 par chunk           |
| Home                 | carte pub dans le collage des rooms officielles | homeCard           | 1 seule, ~5ᵉ position |
| Profil (ProfileView) | rail gauche, sous les infos, sticky             | profileRail        | 1 seule               |
| /docs                | milieu de page, entre deux grandes sections     | content (existant) | 1                     |

## Détail par emplacement

### 1. /rooms — pub-tuile patchwork

- Le patchwork passe de **chunks de 8 rooms à chunks de 7** : la case `pw-e` (2x2, sans avatars) est réservée à un `AdSlot` en mode `fill`. Aucune room n'est perdue, elles glissent dans les cases suivantes.
- Label « Publicité » visible sur la tuile (policy AdSense : une pub ne doit pas se confondre avec le contenu — ici des tuiles cliquables).
- Mobile (patchwork en colonne flex) : la tuile pub devient un bloc pleine largeur avec hauteur plafonnée (~250px).
- Si l'unité est unfilled ⇒ la tuile se replie (comportement existant de `AdSlot`).

### 2. Home — carte pub dans le collage

- Une carte insérée en ~5ᵉ position de la `collage-grid` (10 cartes max), même gabarit/rotation que les cartes `cc` mais non cliquable, avec label « Publicité ».
- Une seule sur la page (le slot `home` existant plus bas reste en place).

### 3. Profil — encart rail

- Dans `ProfileView.svelte`, un seul encart ~300x250 en bas du rail gauche (`.tour` grid), `position: sticky` au scroll desktop.
- Mobile : le rail passe en colonne, l'encart suit naturellement dans le flux.
- Pas d'autre pub sur le profil (décision : « pas TROP »). Vaut pour `/profile` et `/user/[username]`.

### 4. /docs — milieu de page

- Un `AdSlot` `content` supplémentaire inséré à mi-hauteur entre deux grandes sections (la page est très longue, celui du bas est rarement vu).

## Technique

### `src/lib/ads.js`

```js
export const AD_SLOTS = {
  home: "9885285379",
  content: "7418105373",
  gameLobby: "1352189238",
  gameOver: "1487920606",
  roomsTile: "", // à créer : zik-rooms-tile (display responsive)
  homeCard: "", // à créer : zik-home-card (display responsive)
  profileRail: "", // à créer : zik-profile-rail (display carré/rectangle)
};
```

Slot vide ⇒ rien ne s'affiche : on peut déployer avant de créer les unités dans le dashboard.

### `AdSlot.svelte` — mode `fill`

- Nouvelle prop `variant` (`'box'` par défaut, `'fill'`).
- `fill` : le cadre remplit son conteneur (pas de `max-width: 728px`, pas de `margin: auto`, hauteur 100%) — utilisé par la pub-tuile, la carte home et le rail profil.
- Label « Publicité » et repli sur `unfilled` conservés dans les deux modes.

## Dashboard AdSense (à faire ensemble)

1. **Annonces → Par unité** : créer 3 unités display responsive : `zik-rooms-tile`, `zik-home-card`, `zik-profile-rail`.
2. Coller les 3 slot IDs dans `src/lib/ads.js`.
3. Rappel : site encore en examen Google — les unités resteront vides tant que la validation n'est pas passée ; le code se déploie quand même (cadres repliés).

## Test

- /rooms : 1 pub-tuile par chunk de patchwork, créas différentes entre elles, rooms toutes présentes (7 par chunk + 1 pub).
- Home : 1 carte pub dans le collage, non cliquable, label visible.
- Profil : 1 encart dans le rail, sticky desktop, dans le flux mobile.
- /docs : 2 encarts (milieu + bas).
- Salon (TV + téléphone) : toujours aucune pub.
- super_admin : rien nulle part ; invité : tout visible sans login.
- Adblocker / unfilled : tuile, carte et rail se replient sans trou moche.
- CLS : hauteurs réservées, pas de saut.

## Hors périmètre

- Auto ads, ancres, sticky, vignettes.
- Mode Salon.
- Pubs pendant une manche, quelle qu'elle soit.
