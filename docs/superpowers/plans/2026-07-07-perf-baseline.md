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
- Précompression build : **présente** (.br et .gz générés pour tous fichiers CSS/JS)
- Compression à la volée : via middleware `compression` Express (gzip uniquement, pas brotli)
- Fichiers .br disponibles mais serveur n'envoie que .gz par défaut

## Fonts
- Google Fonts externes (2 connexions : fonts.googleapis.com + fonts.gstatic.com)
- Police primaire : Montserrat
- Police secondaire : Inter

## Audio jeu
- **Mode Classique** : player_ready émis avant buffering complet
- **Mode Salon** : recherche YouTube synchrone à chaque round (pas de cache audio persistant)

## Observations
- Build produit 79 fichiers .js (chunks SvelteKit + node_modules)
- Tous CSS/JS sont source-maps-less en prod
- Pas de lazy-loading CSS supplémentaire détecté (tous chargés au premier appel)
