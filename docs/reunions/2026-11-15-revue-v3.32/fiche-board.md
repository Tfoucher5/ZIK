# Fiche du board — 15/11/2026 — Que faire de la v3.32 ?

**Question** : faut-il sortir la v3.32 après des retouches ciblées, ou la retravailler plus en profondeur avant toute mise en prod ?

Théo l'a refusée en l'état. Objectif : ZIK doit paraître pro, être fiable, facile, agréable et fun.

## Options

- **A. Ne rien faire** : sortir la v3.32 telle quelle et corriger après.
- **B. Retouches « porte de prod » puis release, le fun dans une v3.33.** Avant la release, seulement ce qui casse ou fait amateur devant le public :
  - reconnexion qui bloque une manche (B1, B2, B3 de la recette) ;
  - cache `phone.css` ;
  - reprise de place : sans régie, abus, jeton non sauvegardé ;
  - TV de fin de partie qui montre les réglages de l'hôte ;
  - gérant qui crée depuis son téléphone ;
  - « salon », mélange tu/vous et masculin restants ;
  - `/salon` qui prend la place de `/soiree` dans Google, `llms.txt` ;
  - bug « JOUEREN LIGNE ».

  Ensuite une v3.33 « fun et vente » : arrivée animée, podium or, argent et bronze, phrase de commentaire à la révélation, story en bouton principal avec `ref`, bandeau « 12/12 » non bloquant, nom du pass.

- **C. Tout dans la v3.32** : les retouches de B et le lot fun et vente avant de sortir quoi que ce soit.
- **D. Refonte** : revenir sur l'aiguillage `/` et les deux univers, repenser le concept avant de sortir.

## Chiffres (`docs/strategie/etat.md`, semaine du 06/11)

- 220 salons à plusieurs par semaine (×2), 4,3 joueurs en moyenne. Sur 30 jours : 191 salons à 1 joueur, 44 au-delà de 12.
- 1 689 visites, dont 391 depuis Google et 71 depuis ChatGPT. 36 inscriptions, 15 achats ZIK Pro.
- 353 arrivées directes sur `/salon/play` (les invités ne passent pas par `/`).

## Contraintes (`CLAUDE.md`)

- Une panne en pleine soirée abîme l'image d'un client Pro devant son public.
- Un dev seul, aidé d'agents.
- Une PR par tâche, définition de terminé complète, recette sur le staging.
- Nouvelle page ou nouveau mode de jeu : Théo décide. Ce qui touche à l'argent ou à Stripe : Théo décide.

## Déjà décidé (`docs/strategie/decisions.md`)

- 13/11 : pas d'offre « Maison ». Le pass Soirée est rendu visible aux groupes, avec la source « maison » dans Stripe (pas encore fait).
- 14/11 (Théo) : séparation en deux univers et aiguillage `/`, feu vert donné sur la fiche `docs/specs/2026-11-14-deux-univers.md`.

## Fichiers utiles

Lire d'abord les comptes rendus des pôles dans `docs/reunions/2026-11-15-revue-v3.32/` : `client-pro.md`, `argent-offres.md`, `marketing-seo.md`, `marketing-contenu.md`, `produit-ux.md`, `produit-ui.md`, `produit-redaction.md`, `produit-idees.md`, `tech-architecte.md`, `operations-recette.md`.

## Format de l'avis (200 mots max)

Vote (A, B, C ou D, éventuellement « B si … »), les 3 raisons, ce que tu mets en premier, ce que tu refuses, et ta condition.
