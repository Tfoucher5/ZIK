---
name: hotfix
description: Corrige en urgence un bug de production ZIK sans passer par develop — branche depuis master, test qui reproduit, correctif minimal, PR vers master prête pour Théo, report dans develop. Utilise ce skill dès qu'un bug de prod est établi (après /incident), ou quand Théo lance /hotfix.
argument-hint: "[bug à corriger]"
allowed-tools: Bash(git status *) Bash(git fetch *) Bash(git log *) Bash(git rev-parse *) Bash(date *)
---

# Hotfix

Bug : $ARGUMENTS

- Heure à Paris : !`TZ=Europe/Paris date '+%A %d/%m/%Y %H:%M' 2>/dev/null || true`
- Modifications en cours : !`git status --short 2>/dev/null | head -10 || true`
- Derniers commits de master : !`git log --oneline origin/master -8 2>/dev/null || true`

## Étapes

Un hotfix est le plus petit changement qui supprime le problème, rien de plus. Le reste attend une branche normale.

1. Si des modifications traînent, mets-les de côté sur leur branche (commit ou stash nommé), jamais dans le hotfix.
2. Si la cause n'est pas encore établie, lance d'abord l'agent `incident` (ou `/incident`).
3. `git fetch origin` puis `git switch -c hotfix/<sujet> origin/master`.
4. **Écris d'abord le test qui reproduit le bug** et vérifie qu'il échoue.
5. Corrige avec le diff minimal. Le test passe, la suite complète aussi (`npx vitest run`), ainsi que `npx eslint .` et `npm run build`.
6. `/relire` avec `origin/master` comme base.
7. Version : incrément de correctif (`X.Y.Z+1`) dans `package.json` et partout où elle est affichée.
8. Push, `gh pr create --base master --title "fix(<zone>): … (vX.Y.Z)"`.
9. CI verte : préviens Théo que c'est prêt. Il fusionne (squash) en tenant compte des soirées en cours.
10. Après le merge : PR `master` → `develop` en merge commit, déploiement `[PROD]` en `SUCCESS` (piège SKIPPED), `/healthz` OK.
