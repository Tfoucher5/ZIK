---
name: terminer
description: Termine une tâche ZIK et ouvre la PR vers develop — passe tous les contrôles de la Définition de terminé, lance la relecture, rédige la PR, coche le plan. Utilise ce skill quand Théo dit que c'est fini, qu'on peut ouvrir la PR, pousser ou fusionner une branche de travail (« c'est bon on push », « ouvre la PR », « on termine »).
argument-hint: "[notes pour la PR]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git rev-parse *) Bash(git merge-base *)
---

# Terminer une tâche

Branche : !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`
Commits depuis develop : !`git log --oneline origin/develop..HEAD 2>/dev/null | head -30 || true`
Fichiers modifiés : !`git diff --stat origin/develop...HEAD 2>/dev/null | tail -40 || true`
Non commité : !`git status --short 2>/dev/null | head -20 || true`

Notes de Théo : $ARGUMENTS

## Étapes

Arrête-toi au premier point rouge, corrige ou demande, puis reprends. Une PR n'est ouverte que si tout est vert, c'est la règle du `CLAUDE.md`.

1. **On n'est pas sur `master` ni `develop`.** Sinon, arrête-toi.
2. **Contrôles**, chacun lancé et son résultat noté :
   - `npx eslint .`
   - `npx prettier --check .`
   - `npx svelte-check`
   - `npx vitest run` (et `--coverage` si le seuil est configuré)
   - `npm run build`
3. **Tests manquants.** Si du code nouveau ou corrigé n'a pas de test, lance l'agent `test-writer` (ou `/tests`), puis relance `npx vitest run`.
4. **Relecture.** Lance `/relire`. Tout point « Bloquant » ou « À corriger avant fusion » est traité avant d'aller plus loin.
5. **Interface.** Si des `.svelte` ou du CSS ont changé, rappelle à Théo le contrôle visuel desktop 1440 px et mobile 390 px sur la preview de la PR, et TV 1920×1080 ou régie 1024 px si concernés.
6. **Plan.** Coche l'item dans `docs/audit/2026-11-02-a-valider.md` (et ajoute une ligne si on a fait plus que prévu), dans un commit `docs(plan): …`.
7. **Commit et push**, après confirmation de Théo :
   - message au format `type(zone): description` (sans numéro de version : il est fixé à la release) ;
   - `git push -u origin <branche>`.
8. **PR vers `develop`** avec `gh pr create --base develop`, titre au même format, et ce corps :

```
## Ce qui change
- …

## Pourquoi
Item du plan : « … » (phase N)

## Vérifications
- [x] eslint · prettier · svelte-check · build
- [x] vitest : X/Y
- [x] /relire : fusionnable
- [ ] Contrôle visuel sur la preview (si interface)

## Risques et points d'attention
- …
```

9. **Annonce** : lien de la PR, résultat des contrôles, ce qui reste à vérifier à la main.
