# Optimisation performance globale — Design

**Date** : 2026-07-07
**Objectif** : site rapide et fluide partout — chargement des pages, navigation, démarrage du son en jeu — le plus proche possible de l'instantané.
**Contrainte** : rendu visuel identique au pixel près (la refonte graphique n'est pas dégradée).
**Hébergement** : VPS, serveur Node direct (`server.js`, adapter-node), pas de CDN devant.

## Contexte / constats

- CSS servis depuis `static/css/` (~150 Ko non minifiés : base 21 Ko, game 58 Ko, salon 72 Ko) avec versioning manuel `?v=` mais sans `Cache-Control` long → revalidation à chaque visite.
- Compression : gzip à la volée (`compression`), pas de brotli, pas de précompression au build.
- Fonts Google externes (2 connexions DNS/TLS à la première visite).
- Audio jeu : `preview_url` Deezer reçue au `round_start`, puis `src` → `load()` → `loadedmetadata` → seek → `play()`. Aucun préchargement : latence réseau Deezer payée au début de chaque round.
- Effets visuels coûteux potentiels : aurora blobs animés, backdrop-blur, glow, noise.
- Déjà en place (à conserver) : `data-sveltekit-preload-data="hover"`, manual chunks (supabase, socket.io), cache profil sessionStorage (TTL 5 min), preconnect Deezer, fonts async.

## Approche retenue

Passe complète par couches, avec mesure de référence au début et re-mesure après chaque couche pour prouver le gain.

### Couche 0 — Mesure de référence
Build prod local + Lighthouse (home, rooms, playlists, game) + waterfall réseau. Chiffres de départ notés (poids transféré, LCP, TBT). Aucune modification.

### Couche 1 — Réseau, cache, compression
- `adapter({ precompress: true })` dans `svelte.config.js` : `.br`/`.gz` générés au build et servis statiquement. Le middleware `compression` reste pour les réponses dynamiques (HTML).
- `Cache-Control: public, max-age=31536000, immutable` sur `/css/*` et `/favicon/*` via `server.js` — sans risque grâce au versioning `?v=` existant (un bump invalide le cache).
- Self-host des fonts : woff2 (Barlow 400/500/600, Barlow Condensed 700/800/900 + italic 900, JetBrains Mono 400/500/700, sous-ensemble latin) dans `static/fonts/`, `@font-face` local avec `font-display: swap`. Suppression des `preconnect` Google devenus inutiles.

### Couche 2 — CSS / JS
- Script post-build qui minifie les CSS dans `build/client/css/` (le dev et les URLs restent inchangés).
- Audit du bundle JS (analyse des chunks) : vérifier que supabase/socket.io ne chargent pas sur des pages qui n'en ont pas besoin ; purge du code mort trouvé.
- Vérification du chemin critique de rendu (seul `theme.css`, petit, reste bloquant — acceptable).

### Couche 3 — Audio jeu (gain perçu principal)

**Constat corrigé après lecture du code** : le jeu classique a déjà un prefetch serveur du round suivant (yt-dlp/preview, `game.prefetchedRound`) et un proxy opaque (`/api/game/audio?v=<id>`, `Cache-Control: no-store`). Le mécanisme de sync (`start_round` → clients chargent l'audio → `player_ready` → `round_start_sync` à 75 % de prêts ou 6 s) donne déjà une fenêtre de préchargement client. Les gains restants :

- **`player_ready` honnête** : aujourd'hui émis immédiatement après `loadAudio()` (avant tout buffering). L'émettre à `canplaythrough` (avec fallback timeout court) pour que la fenêtre de sync couvre réellement le téléchargement audio → démarrage simultané et instantané pour tous.
- **Salon : prefetch de la recherche YouTube** : `startNextRound` du Salon fait `YouTube.search()` au début de chaque round (latence à chaque manche). Précharger la recherche du round N+1 pendant le round N, comme le fait déjà le jeu classique.
- Pas de nouvel endpoint proxy : celui qui existe couvre déjà l'anti-triche.

### Couche 4 — Fluidité runtime
- Animations aurora/glow : compositing GPU pur (transform/opacity uniquement, pas de `filter` ni de propriété layout animée), pause hors écran et quand l'onglet est caché.
- Réduction des couches `backdrop-filter` redondantes/empilées, sans changer le rendu.
- `content-visibility: auto` sur les listes longues (rooms, classements).
- Covers Deezer : `loading="lazy"`, `decoding="async"`, dimensions explicites (zéro CLS).

## Critères de succès
- Poids transféré première visite nettement réduit (CSS minifié + brotli + fonts locales).
- Visites suivantes : CSS/fonts/favicon servis depuis le cache navigateur (0 requête réseau).
- Démarrage du son au round : quasi instantané (audio préchargé) au lieu de la latence Deezer actuelle.
- Scroll et animations fluides sans changement visuel perceptible.
- Lighthouse : amélioration mesurée sur LCP/TBT par rapport à la référence couche 0.

## Hors périmètre
- Aucun changement visuel ou fonctionnel.
- Pas de CDN / changement d'hébergement.
- Pas de refactoring non lié à la performance.

## Validation finale
Re-mesure globale, `npm run lint`, bump de version, confirmation utilisateur avant commit/push.
