# Système de thème — réparation + 6 thèmes — Design

_2026-07-07_

## Problème

Le système de thème (`data-theme` sur `<html>`, `theme.css`, localStorage
`zik_theme`, anti-FOUC dans `app.html`) existe mais n'est appliqué que
partiellement : des centaines de couleurs en dur dans `base.css`, `game.css`,
les pages du site et les composants ignorent le thème. Seul le sombre est
cohérent partout.

## Périmètre

- **Thématisé** : site public ((site) hors salon) + page de jeu `/game`.
- **Intouché** : Mode Salon (identité TV sombre), admin, portfolio.

## Approche retenue

Variabilisation systématique : remplacer les couleurs en dur par les variables
de thème, en enrichissant `theme.css` des variables manquantes. Pas d'overrides
par thème, pas de refonte tokens.

## Nouvelles variables (définies par chaque thème)

| variable      | rôle                                           |
| ------------- | ---------------------------------------------- |
| `--overlay`   | fond assombri derrière les modales             |
| `--modal-bg`  | fond des boîtes de modale                      |
| `--on-accent` | texte posé sur `--accent` (noir, accents vifs) |

Les couleurs **sémantiques** restent fixes : QCM (rouge/bleu/jaune/vert),
`--success`/`--danger`/`--warn`, or des podiums, ombres noires portées.

## Règles de conversion

- `rgba(255,255,255,x)` → `rgb(var(--c-glass) / x)`
- fonds sombres fixes (`#080808`, `#0f0f0f`, `#0a0a0a`…) → `var(--bg)` / `var(--bg2)`
- magenta/violets en dur (`#ff00ff`, `#cc00cc`…) → `var(--accent)` / `var(--accent2)`
- `#000` posé sur accent → `var(--on-accent)`
- gris texte en dur → `var(--text)` / `var(--mid)` / `var(--dim)`
- box-shadow noires : conservées telles quelles

## Trois nouveaux thèmes (blocs `html[data-theme=…]` dans theme.css)

- **ocean** : fond `#050b13`, accent cyan `#22d3ee`, secondaire `#0ea5e9`
- **sunset** : fond `#140806`, accent orange `#fb923c`, secondaire `#f43f5e`
- **emeraude** : fond `#04100a`, accent menthe `#34d399`, secondaire `#a3e635`

Tous sombres, accents vifs, `--mid`/`--dim` teintés avec contraste suffisant.
Teintes exactes ajustables lors de la vérification visuelle.

## Settings

6 pastilles dans le sélecteur existant ; pastille « clair » resynchronisée sur
le vrai `--bg`. Au changement de thème, la meta `theme-color` suit le fond.

## Fichiers balayés

`static/css/base.css`, `static/css/game.css`, pages (site) : rooms, accueil,
docs, playlists, classements, user/[username], settings, nouveautés,
room/[code], results/[id], reset-password, +error ; composants lib : AuthModal,
ReportModal, ContactModal, AchievementsPanel, AchievementToast, HeroSection,
TabBar, Toast, RoomCard, AnnouncementPopup, TrackSearch, ProfileView (reliquats).

## Vérification

Serveur dev + navigateur : bascule des 6 thèmes sur accueil, rooms,
classements, docs, profil, settings, game — screenshots, aucun texte/bloc
illisible.

## Versioning

Pas de bump.
