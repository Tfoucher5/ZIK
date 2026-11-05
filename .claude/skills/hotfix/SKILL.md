---
name: hotfix
description: Corrige en urgence un bug de production ZIK sans passer par develop — branche depuis master, test qui reproduit, correctif minimal, PR vers master, report dans develop. À lancer uniquement par Théo avec /hotfix.
disable-model-invocation: true
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

1. Si des modifications traînent, demande quoi en faire avant tout.
2. Si la cause n'est pas encore établie, lance d'abord l'agent `incident` (ou `/incident`).
3. `git fetch origin` puis `git switch -c hotfix/<sujet> origin/master`.
4. **Écris d'abord le test qui reproduit le bug** et vérifie qu'il échoue.
5. Corrige avec le diff minimal. Le test passe, la suite complète aussi (`npx vitest run`), ainsi que `npx eslint .` et `npm run build`.
6. `/relire` avec `origin/master` comme base.
7. Version : incrément de correctif (`X.Y.Z+1`) dans `package.json` et partout où elle est affichée.
8. Après confirmation de Théo : push, `gh pr create --base master --title "fix(<zone>): … (vX.Y.Z)"`.
9. **Soirées en cours** : rappelle de les vérifier dans l'admin avant de fusionner, d'annoncer la maintenance aux salons ouverts s'il y en a, et de fusionner entre deux parties si possible.
10. Après le merge : ouvre une PR `master` → `develop` (ou cherry-pick) pour que `develop` ait le correctif, et rappelle de surveiller `/admin/statut` et les logs.
