---
name: release
description: Met en production ZIK (develop vers master) — vérifie la porte de mise en prod du CLAUDE.md, la version, les notes, ouvre la PR de release et prévient Théo, qui fusionne. Utilise ce skill quand develop contient des changements à livrer, ou quand Théo lance /release.
argument-hint: "[version voulue, sinon calculée]"
allowed-tools: Bash(git log *) Bash(git fetch *) Bash(git rev-parse *) Bash(date *) Bash(node -p *)
---

# Release

- Date et heure à Paris : !`TZ=Europe/Paris date '+%A %d/%m/%Y %H:%M' 2>/dev/null || true`
- Version actuelle : !`node -p "require('./package.json').version" 2>/dev/null || true`
- Contenu de develop absent de master : !`git log --oneline origin/master..origin/develop 2>/dev/null | head -60 || true`
- Version demandée : $ARGUMENTS

## Étapes

Tu prépares jusqu'à la PR verte, Théo fusionne quand aucune soirée ne tourne. Pas d'attente de ton côté.

1. **Il y a quelque chose à livrer.** Si la liste des commits est vide, dis-le et arrête.
2. **Le staging est sain**, chaque point vérifié et noté :
   - CI verte sur `develop` (`gh run list --branch develop --limit 3`) ;
   - dernier déploiement de `[DEV] - Développement` réussi (MCP Railway `list-deployments`) ;
   - sondes de `/admin/statut` au vert sur le staging ;
   - scénario Playwright du salon vert sur le staging (`npm run e2e`, `.env` de staging) ;
   - contrôle visuel desktop et mobile (390 px) des écrans touchés, fait par toi sur `[DEV]` ;
   - migrations en attente appliquées sur le staging sans nouvel avertissement des conseillers.
3. **Version.** Une `feat` dans la liste = version mineure ; seulement `fix`, `perf`, `chore`, `docs` = correctif. Incrémente-la partout où elle apparaît (`package.json` et les pages qui l'affichent : cherche l'ancienne version avec Grep).
4. **Notes.** Rédige les notes de release : d'abord ce qui change pour les joueurs et les clients Pro, puis le technique. Ajoute une entrée dans `src/lib/data/news.js` seulement si l'expérience change pour eux.
5. **Branche de release** `release/vX.Y.Z` depuis `develop` avec le bump de version et les notes, puis PR vers `master` (`gh pr create --base master --title "release vX.Y.Z"`). CI verte, workflow « Scénario salon » compris (lancé par le push de la branche de release) : préviens Théo que c'est prêt (il fusionne en merge commit, jamais squash), et passe à la tâche suivante.
6. **Après le merge** (quand Théo le signale ou à la reprise) : déploiement `[PROD]` en `SUCCESS` (piège SKIPPED), `/healthz` OK, report `master` → `develop` en merge commit. Pas de surveillance prolongée.

Message à Théo : version, contenu, état de chaque vérification, ce qu'il peut tester en prod.
