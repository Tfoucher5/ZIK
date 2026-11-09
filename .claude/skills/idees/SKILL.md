---
name: idees
description: Brainstorm produit de ZIK par l'agent idees — meilleures fonctionnalités et améliorations d'expérience, côté visuel, joueur en ligne, joueur en soirée, organisateur ou ZIK Pro, classées par impact et effort. Utilise ce skill quand Théo demande des idées, « qu'est-ce qu'on pourrait ajouter », « comment améliorer l'expérience », ou quand la liste du plan est presque terminée.
argument-hint: "[axe : visuel | joueur | soiree | organisateur | pro | tout] [précision libre]"
context: fork
agent: idees
background: false
allowed-tools: Bash(git log *) Bash(ls *)
---

Cherche les meilleures idées pour ZIK sur cet axe : $ARGUMENTS (si vide : tout).

- Tours précédents : !`ls docs/idees 2>/dev/null || echo "aucun"`
- Livré récemment : !`git log --oneline origin/develop -25 2>/dev/null || true`

Suis ta méthode et rends le rapport au format prévu.

Après le rapport (pour Claude, dans la session principale) :

1. Enregistre le rapport dans `docs/idees/AAAA-MM-JJ-<axe>.md`, avec en tête la date et l'axe, et une section « Décisions de Théo » vide.
2. Présente à Théo le top 5 et les questions, sans rien ajouter au plan.
3. Quand Théo tranche : remplis « Décisions de Théo » (retenue, refusée, plus tard), puis ajoute au plan (`docs/audit/2026-11-02-a-valider.md` ou le plan en cours) seulement les idées retenues. Le tout dans une PR `docs(idees): …` vers `develop`.
