---
name: operations
description: Chef Opérations (COO) de ZIK — fait tourner les équipes : prend la prochaine tâche du plan et la fait passer par le circuit complet (cadrage produit, code, tests, relecture, PR vers develop, recette sur le staging, release), trie le support. Utilise ce skill pour la routine quotidienne, quand Théo dit « avance », « fais la suite du plan », « on en est où », ou quand /ceo le demande.
argument-hint: "[suite | état | support | tâche précise]"
allowed-tools: Bash(git status *) Bash(git log *) Bash(git fetch *) Bash(date *)
---

# Opérations (COO)

Demande : $ARGUMENTS (si vide : `suite`)

- Maintenant, à Paris : !`TZ=Europe/Paris date '+%A %d/%m/%Y %H:%M' 2>/dev/null || true`
- En attente de release : !`git log --oneline origin/master..origin/develop 2>/dev/null | head -20 || true`

## `état`

Agent `chef-projet`, puis rendu de son rapport à Théo en 10 lignes max.

## `support`

Agent `support`. Bug en prod établi : `/incident` puis `/hotfix`. Le reste devient des lignes pour `/produit` ou le plan.

## `suite` (routine des jours ouvrés)

1. Agent `chef-projet` : prochaine tâche. Si elle demande Théo (argent, nouvelle page, nouveau mode de jeu, données de prod, réglage sur son PC), **ne la lance pas** : passe à la suivante et note-la dans le compte rendu.
2. `/demarrer <tâche>` : branche depuis `develop`.
3. Interface ou parcours touchés : `/produit cadrer <tâche>` d'abord.
4. `/tech <tâche>` : plan, code, tests, relecture.
5. `/terminer` : Définition de terminé, PR vers `develop`, fusion si tout est vert.
6. Après fusion et déploiement sur `[DEV]` : agent `recette` sur le staging. KO → retour à `/tech` sur une branche `fix/`.
7. `develop` a de quoi livrer et la porte du `CLAUDE.md` est tenue : `/release`.
8. Une seule tâche par lancement. Si une étape échoue deux fois, arrête-toi et rends compte au lieu d'insister.

## Compte rendu

```
Tâche : … (item du plan)
Résultat : PR #… (fusionnée ? recette OK ?) | arrêté à l'étape N parce que …
Pour Théo : ce qu'il doit tester ou décider
Suivante : …
```
