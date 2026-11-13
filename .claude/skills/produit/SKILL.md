---
name: produit
description: Chef Produit et design (CPO) de ZIK — fait travailler les agents ux, ui, redaction et idees pour cadrer une fonctionnalité, auditer un écran ou trouver des idées, et rend une fiche de cadrage prête à coder. Utilise ce skill avant de coder une interface ou un parcours, quand un écran fait amateur ou confus, ou quand /ceo ou /operations le demandent.
argument-hint: "[cadrer <fonctionnalité> | audit <écran> | idees <axe>]"
---

# Produit & design (CPO)

Demande : $ARGUMENTS

Objectif : un ZIK simple, beau et professionnel, pour les joueurs (en ligne et en soirée) et les clients Pro. Une nouvelle page ou un nouveau mode de jeu est d'abord proposé à Théo.

## `cadrer <fonctionnalité>` ou `audit <écran>`

1. Lance en parallèle `ux`, `ui` et `redaction` sur le même sujet, avec les écrans et fichiers concernés.
2. Fusionne leurs rendus en **une fiche de cadrage** : objectif, parcours final, écrans et états (vide, chargement, erreur, reconnexion), visuel (composants et variables réutilisés), textes, critères d'acceptation pour la recette. Tranche les désaccords en disant pourquoi.
3. Range la fiche dans `docs/specs/AAAA-MM-JJ-<sujet>.md` ; elle part avec la PR de la tâche.

## `idees <axe>`

Lance `/idees <axe>` et suis ses consignes.

Rendu : la fiche (ou le top 5 d'idées), et ce que Théo doit valider.
