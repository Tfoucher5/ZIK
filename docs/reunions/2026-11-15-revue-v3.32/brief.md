# Revue de la v3.32.0 — brief commun

Théo (fondateur) refuse la release v3.32.0 (PR #428) en l'état. Toutes les équipes revoient le **concept, l'UX, l'UI et les textes** de ce qu'elle contient.

## Ce qu'on veut

ZIK doit **paraître pro**, offrir un service **fonctionnel et fiable**, **facile** à utiliser, et vraiment **agréable et fun**.

## Ce que contient la v3.32.0 (`git log origin/master..origin/develop`)

| PR   | Contenu                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------ |
| #418 | Page `/jouer` : entrée du jeu en ligne (ancien accueil sans la soirée)                                 |
| #419 | Page `/soiree` : vitrine ZIK Soirée pour les organisateurs                                             |
| #420 | `/` devient un aiguillage : champ « J'ai un code » + portes « Jouer en ligne » / « Animer une soirée » |
| #421 | `/` : texte SEO et FAQ sous les portes                                                                 |
| #424 | Navigation propre à chaque univers (jeu / soirée / aiguillage), libellés ZIK Soirée                    |
| #425 | La porte soirée lance la création (`/salon`), reprise sur l'écran TV                                   |
| #426 | Libellés et états de la création de soirée                                                             |
| #427 | La création retient la dernière préparation                                                            |
| #429 | Grand QR et code sur la TV entre deux parties (+ #430 petit écran)                                     |
| #431 | Messages d'erreur de la création en français clair                                                     |
| #432 | « ZIK Soirée » partout, code de 6 caractères, FAQ des scores                                           |
| #433 | Partager le podium en story depuis le téléphone                                                        |
| #434 | Reprendre sa place depuis un autre téléphone, coupures réseau affichées                                |

Détail : `gh pr view <n>`. Cadrage d'origine : `docs/specs/2026-11-14-deux-univers.md`, `docs/specs/2026-11-14-parcours-soiree.md`. Charte : `DESIGN.md`. Chiffres : `docs/strategie/etat.md`.

## Où regarder

- Code : branche `develop` (dépôt local à jour).
- En vrai : staging `https://zik-dev-dev-developpement.up.railway.app` (contient la v3.32). Prod actuelle pour comparer : `https://www.zik-music.fr`. Lecture seule, aucune partie en prod.

## Rappels chiffrés (semaine du 06/11)

220 salons à plusieurs (×2), 4,3 joueurs en moyenne, 1 689 visites (391 Google), 36 inscriptions, 15 achats ZIK Pro. On joue sans compte. Les clients Pro sont des bars, campings, entreprises, associations : la soirée se passe en public.

## Format de chaque compte rendu (max ~600 mots)

1. **Verdict** en une phrase (on garde, on retouche, on refait).
2. **Ce qui marche** (à garder).
3. **Problèmes**, du plus grave au moins grave : constat, preuve (fichier:ligne, URL, capture), gravité (bloquant / important / confort).
4. **Propositions** concrètes, classées impact / effort (S, M, L).
5. **Questions** pour les autres pôles.
