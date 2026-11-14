---
name: tech
description: Chef Technique (CTO) de ZIK — fait coder une tâche par son équipe : plan de l'agent architecte, code par un ou plusieurs agents dev en parallèle (worktrees), tests par test-writer, relecture par reviewer, puis /terminer. Utilise ce skill dès qu'une tâche de code est prête (après /demarrer et, si interface, /produit), ou quand /operations ou /ceo le demandent.
argument-hint: "[tâche à coder]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git rev-parse *)
---

# Technique (CTO)

Tâche : $ARGUMENTS

Branche : !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`

Si la branche est `master` ou `develop`, lance d'abord `/demarrer`.

1. **Plan** : agent `architecte` avec la tâche et la fiche de cadrage si elle existe (`docs/specs/`). Taille L ou plan qui touche l'argent, une nouvelle page ou un nouveau mode de jeu : montre le plan à Théo avant de coder.
2. **Migration** nécessaire : `/migration` avant le code qui en dépend.
3. **Code** : un agent `dev` par morceau du plan. Morceaux indépendants : lance-les en parallèle avec `isolation: "worktree"`, puis rapatrie chaque diff sur la branche de la tâche et règle les conflits. Morceaux liés : l'un après l'autre, sur la branche.
4. **Contrôle** : relis toi-même le diff complet. Ce qui sort du plan ou du `CLAUDE.md` repart chez `dev`.
5. **Tests** : `/tests` (agent `test-writer`) pour ce qui manque.
6. **Relecture** : `/relire`. Bloquant ou « à corriger » : retour à l'étape 3.
7. **Fin** : `/terminer`.

Incident en prod pendant la tâche : tout s'arrête, `/incident` d'abord.

Rendu : PR, contrôles, ce qui reste à vérifier en vrai.
