# Baseline perf — avant optimisation (2026-07-07)

## CSS (build/client/css, non minifiés, servis sans cache long)

- base.css : 20994 o
- game.css : 58451 o
- salon.css : 71799 o
- theme.css : 8459 o
- animations.css : 2379 o

**Total CSS brut : 162082 o (~158 Ko)**

## JS (top chunks immutable)

1. C8Fhqtzq.js : 208433 o
2. 22.ylq8b2jo.js : 50180 o
3. 17.B6ZffpP6.js : 49849 o
4. 23.DYeHfIRL.js : 42943 o
5. ZIhDv19l.js : 41708 o
6. 4.D2E12hxf.js : 37837 o
7. 26.BhqvNnUD.js : 37268 o
8. BeilM0hW.js : 36623 o
9. BWcP8e4G.js : 34220 o
10. 31.3GP5_DNQ.js : 31132 o
11. B8eFN3ds.js : 30626 o
12. 18.JQYpWZfw.js : 27234 o
13. 33.CxWHwttg.js : 21219 o
14. 34.JMLfStZ7.js : 16617 o
15. 20.58CxEsXU.js : 16224 o

**Total top 15 JS : 602282 o (~588 Ko)**
**Largest chunk : C8Fhqtzq.js (208433 o, ~203 Ko)**

## Compression

- Précompression build : **présente** (.br et .gz générés — adapter-node v5 précompresse par défaut, contrairement à l'hypothèse de la spec)
- Compression à la volée : middleware `compression` (gzip uniquement) pour les réponses dynamiques
- Le service des .br par sirv reste à vérifier avec curl (Task 1)

## Fonts

- Google Fonts externes (2 connexions : fonts.googleapis.com + fonts.gstatic.com)
- Familles : Barlow (400/500/600), Barlow Condensed (700/800/900 + italic 900), JetBrains Mono (400/500/700)

## Audio jeu

- **Mode Classique** : player_ready émis avant buffering complet
- **Mode Salon** : recherche YouTube synchrone à chaque round (pas de cache audio persistant)

## Observations

- Build produit 79 fichiers .js (chunks SvelteKit + node_modules)
- Tous CSS/JS sont source-maps-less en prod
- Pas de lazy-loading CSS supplémentaire détecté (tous chargés au premier appel)

## Après optimisation (2026-07-08)

### CSS (build/client/css, minifiés post-build, servis en brotli avec cache immutable)

| Fichier             | Brut avant | Minifié | Brotli servi |
| ------------------- | ---------- | ------- | ------------ |
| base.css            | 20994 o    | 15840 o | 3050 o       |
| game.css            | 58451 o    | 36729 o | 7035 o       |
| salon.css           | 71799 o    | 53534 o | 8724 o       |
| theme.css           | 8459 o     | 4632 o  | 1095 o       |
| animations.css      | 2379 o     | 1196 o  | 448 o        |
| fonts.css (nouveau) | —          | 6639 o  | 407 o        |

**Total CSS transféré (br) : ~20,8 Ko contre ~158 Ko bruts avant — ≈ −87 %**
(les sources avaient aussi légèrement maigri entre-temps : styles fix + new colors)

### Changements qualitatifs

- Cache `public, max-age=31536000, immutable` sur `/css/*`, `/fonts/*`, `/favicon/*` (visites suivantes : zéro requête)
- Fonts self-hostées : 20 woff2 locaux (latin + latin-ext), plus aucune connexion à fonts.googleapis.com / fonts.gstatic.com (−2 handshakes TLS render-path)
- Preload des 2 fonts critiques (barlow-400, barlow-condensed-800)
- Minification CSS post-build (`scripts/minify-css.mjs`, esbuild) + recompression br/gz cohérente
- `player_ready` (jeu classique) émis au vrai buffering (`canplaythrough`, fallback 4 s) — sync audio réelle entre joueurs
- Salon : recherche YouTube du round suivant préfetchée pendant le round courant — transition inter-manches quasi instantanée dès la manche 2
- Images de listes en `loading="lazy" decoding="async"` ; `content-visibility: auto` sur les lignes classements/playlists
