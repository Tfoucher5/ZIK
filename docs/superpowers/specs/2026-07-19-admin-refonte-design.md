# Refonte interface admin ZIK — Design

**Date :** 2026-07-19
**Statut :** validé par Theo
**Objectif :** transformer l'admin en outil de pilotage de croissance, avec un look simple, clean, dans le thème du site, et toutes les données nécessaires au suivi de la croissance.

## Contexte

- Admin actuel : style « terminal Matrix » vert/noir, dashboard = 7 compteurs bruts sans tendances, pages listes basiques (users, reports, rooms, playlists, live, errors).
- Besoin : piloter la croissance (le site entre en phase d'acquisition), moderniser le visuel, améliorer le fonctionnel quotidien (recherche, actions rapides, temps réel, alertes).
- Aucune analytics web en place → intégration **Umami Cloud** (gratuit ≤ 100k events/mois, RGPD-friendly, sans bannière cookies).

## Approche retenue

Refonte **par phases sur la structure existante** (routes `(admin)` conservées), chaque phase mergeable indépendamment :

1. **Phase 1 — Dashboard croissance** (le cœur)
2. **Phase 2 — Design system admin** + restyle des pages
3. **Phase 3 — Fonctionnel** (recherche/filtres, actions rapides, live enrichi, alertes)

Choix techniques :

- **Courbes en SVG maison** (composants Svelte, zéro dépendance). Pas de Chart.js.
- **Agrégats côté SQL** : fonctions RPC Supabase pour les séries temporelles. Migrations fournies en `.sql` à appliquer à la main (le MCP Supabase pointe sur un projet vide).
- **Umami proxifié côté serveur** : la clé API ne quitte jamais le serveur, cache 5 min.

## Phase 1 — Dashboard croissance (`/admin/dashboard`)

### Ligne héro — 4 StatCards avec delta vs les 7 jours précédents (↗ +12 %)

| Carte | Source |
|---|---|
| Visiteurs 7j | API Umami |
| Nouveaux inscrits 7j | `profiles.created_at` |
| Joueurs actifs 7j (DAU distinct, invités inclus) | `game_players` × `games.started_at` |
| Parties 7j | `games` |

### Courbe principale

Série commutable **30 / 60 / 90 jours**, 3 tracés superposables : visiteurs (Umami), inscriptions, joueurs actifs. Tooltip au survol. C'est la vue « mes actions de visibilité paient-elles ? ».

### Rangée secondaire

- **Sources de trafic** : top référents (Umami)
- **Top pages** (Umami)
- **Conversion visiteur → inscrit** : inscrits ÷ visiteurs uniques (%)
- **Ratio invités / connectés** parmi les joueurs
- **Rétention J7** : % des inscrits d'une semaine N qui jouent en semaine N+1

### Bloc ops compact (bas de page)

Reports en attente, erreurs 24h, rooms live, uptime, toggle maintenance — l'existant, condensé.

### Données

- **RPC SQL** (migration à appliquer à la main) : `signups_per_day(days int)`, `active_players_per_day(days int)`, `games_per_day(days int)`, `retention_j7()`, ratio invités/connectés.
- **`/api/admin/stats` (+server.js)** : endpoint protégé `requireAdmin`, agrège RPC + API Umami, cache serveur 5 min (module en mémoire, comme le state salon).
- **Env vars** : `UMAMI_API_KEY`, `UMAMI_SITE_ID` (+ URL API Umami Cloud).

## Phase 2 — Design system admin

### Direction visuelle

- Abandon du Matrix vert. **Dérivé sombre de l'Aurora Glass du site** : fond sombre, cartes glass discrètes, cohérence de marque avec zik-music.fr.
- **Simple, clean, ordonné** : grille régulière, beaucoup d'air, hiérarchie typographique claire, pas d'effets superflus (pas de scan-lines, pas de noise agressif).
- Typo : Bricolage Grotesque (titres) + JetBrains Mono (chiffres/données) conservées.
- Couleurs sémantiques : vert = croissance/positif, ambre = attention, rouge = danger/négatif. Deltas colorés selon signe.

### Composants (`src/lib/admin/`)

| Composant | Rôle |
|---|---|
| `StatCard` | chiffre + label + delta coloré + sparkline optionnelle |
| `TrendChart` | courbe SVG multi-séries, tooltip, sélecteur de période |
| `Sparkline` | mini-courbe SVG inline |
| `AdminTable` | table triable par colonnes + pagination |
| `SearchInput` | recherche avec debounce |
| `ActionMenu` | menu kebab par ligne avec confirmation inline |
| `Badge` | pastilles statut/compteur |

Restyle de toutes les pages admin avec ces composants.

## Phase 3 — Fonctionnel

- **Recherche & filtres** : recherche instantanée server-side (users par username/email, rooms, playlists), filtres combinables (rôle, invité, dates) via query params — généralisation du pattern `goto(?${p})` existant.
- **Actions rapides** : depuis les listes, sans page détail — bannir/changer rôle (users), fermer (rooms), officialiser (playlists). Confirmation inline, log via `logAdminAction`.
- **Live enrichi** (`/admin/live`) : joueurs connectés par room en temps réel (state socket serveur déjà en mémoire), auto-refresh.
- **Alertes** : badges dans la nav admin — compteur reports pending (visible si > 0), compteur erreurs des dernières 24h (source : même table que `/admin/errors`, visible si > 0) — chargés côté layout. Pas d'emails (YAGNI).

## Hors périmètre code (actions Theo)

- Créer le compte Umami Cloud + ajouter le site → récupérer `SITE_ID` et clé API.
- Ajouter les env vars sur Railway.
- Appliquer les migrations SQL fournies.
- (Déjà fait dans ce cycle : restauration `static/og.png`, ajout `/classements` au sitemap — corrections issues de l'audit URLs.)
- Config DNS apex `zik-music.fr` (HTTPS cassé — hors scope admin, voir audit).

## Script Umami

Ajout du script de tracking dans `src/app.html` (ou layout `(site)` uniquement — à trancher à l'implémentation : le layout `(site)` évite de tracker l'admin et le portfolio, c'est le choix retenu par défaut).

## Tests / vérification

- `npm run lint` avant chaque PR (règle projet).
- Vérification manuelle par phase : dashboard avec données réelles de prod, RPC testées via SQL avant intégration.
- Les RPC doivent retourner des séries complètes (jours à zéro inclus, via `generate_series`) pour des courbes sans trous.

## Versioning

Bump de version mineure à chaque merge de phase (règle projet).
