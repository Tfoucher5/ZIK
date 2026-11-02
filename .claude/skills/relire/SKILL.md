---
name: relire
description: Relecture indépendante de la branche en cours par l'agent reviewer, contre le CLAUDE.md, avec verdict fusionnable ou bloqué. Utilise ce skill avant toute PR, tout merge ou toute release, quand Théo demande une relecture ou « est-ce que c'est bon », et à la fin de chaque tâche.
argument-hint: "[branche de base, develop par défaut]"
context: fork
agent: reviewer
background: false
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git rev-parse *)
---

Relis la branche courante de ZIK et rends ton verdict selon ta grille.

- Branche : !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`
- Base demandée : $ARGUMENTS (si vide : `origin/develop` ; pour une branche `hotfix/*` : `origin/master`)
- Commits : !`git log --oneline origin/develop..HEAD 2>/dev/null | head -40 || true`
- Fichiers touchés : !`git diff --stat origin/develop...HEAD 2>/dev/null | tail -60 || true`

Lis le diff complet et chaque fichier modifié en entier, lance les contrôles, puis rends le rapport au format prévu.
