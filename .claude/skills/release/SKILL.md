---
name: release
description: Prépare une mise en production de ZIK (develop vers master) — vérifie l'état du staging, la version, les notes, et ouvre la PR de release. À lancer uniquement par Théo avec /release.
disable-model-invocation: true
argument-hint: "[version voulue, sinon calculée]"
allowed-tools: Bash(git log *) Bash(git fetch *) Bash(git rev-parse *) Bash(date *) Bash(node -p *)
---

# Release

- Date et heure à Paris : !`TZ=Europe/Paris date '+%A %d/%m/%Y %H:%M' 2>/dev/null || true`
- Version actuelle : !`node -p "require('./package.json').version" 2>/dev/null || true`
- Contenu de develop absent de master : !`git log --oneline origin/master..origin/develop 2>/dev/null | head -60 || true`
- Version demandée : $ARGUMENTS

## Étapes

Ne fusionne rien toi-même : tu prépares, Théo décide.

1. **Soirées en cours.** Rappelle à Théo de vérifier dans l'admin les soirées en cours avant de fusionner : le redémarrage les met en pause. Ce n'est pas bloquant, il décide.
2. **Il y a quelque chose à livrer.** Si la liste des commits est vide, dis-le et arrête.
3. **Le staging est sain**, chaque point vérifié et noté :
   - CI verte sur `develop` (`gh run list --branch develop --limit 3`) ;
   - dernier déploiement de `[DEV] - Développement` réussi (MCP Railway `list-deployments`) ;
   - sondes de `/admin/statut` au vert sur le staging, si la phase 2 est faite ;
   - scénario Playwright du salon vert sur le staging, si il existe ;
   - migrations en attente appliquées sur le staging sans nouvel avertissement des conseillers.
4. **Version.** Une `feat` dans la liste = version mineure ; seulement `fix`, `perf`, `chore`, `docs` = correctif. Incrémente-la partout où elle apparaît (`package.json` et les pages qui l'affichent : cherche l'ancienne version avec Grep).
5. **Notes.** Rédige les notes de release : d'abord ce qui change pour les joueurs et les clients Pro, puis le technique. Ajoute une entrée dans `src/lib/data/news.js` seulement si l'expérience change pour eux.
6. **Branche de release** `release/vX.Y.Z` depuis `develop` avec le bump de version et les notes, puis PR vers `master` (`gh pr create --base master --title "release vX.Y.Z"`), après confirmation de Théo.
7. **Après le merge** (fait par Théo) : rappelle de reporter `master` dans `develop` si la branche de release a reçu des commits, et de surveiller `/admin/statut` et les logs Railway pendant 30 minutes.

Rapport final : version, contenu, état de chaque vérification, risques à surveiller.
