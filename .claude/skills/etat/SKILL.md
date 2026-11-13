---
name: etat
description: Met à jour le second cerveau chiffré de ZIK — l'agent analyste sort les indicateurs de la semaine et Claude les écrit dans docs/strategie/etat.md. Utilise ce skill chaque lundi (via /ceo semaine), avant un /board, ou quand Théo demande les chiffres.
argument-hint: "[période, 7 jours par défaut]"
allowed-tools: Bash(date *)
---

# État chiffré

Période : $ARGUMENTS (si vide : les 7 derniers jours)

- Maintenant, à Paris : !`TZ=Europe/Paris date '+%A %d/%m/%Y %H:%M' 2>/dev/null || true`

1. Lance l'agent `analyste` sur la période.
2. Écris son tableau en tête de `docs/strategie/etat.md`, sous un titre `## Semaine du JJ/MM au JJ/MM`, au-dessus des semaines précédentes. Garde les 8 dernières semaines, supprime les plus anciennes.
3. Commit `docs(etat): semaine du JJ/MM` sur une branche `chore/etat-<date>` et PR vers `develop` (fusion en squash si la CI est verte).

Rendu à Théo : les 3 lignes « À retenir ».
