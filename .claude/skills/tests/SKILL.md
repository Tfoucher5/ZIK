---
name: tests
description: Fait écrire par l'agent test-writer les tests manquants de la branche en cours (régressions, entrées hostiles Socket.io, instantané de salon, intégration). Utilise ce skill quand Théo demande des tests, quand du code a été ajouté ou corrigé sans test, ou avant /terminer.
argument-hint: "[fichiers ou fonctionnalité à couvrir]"
context: fork
agent: test-writer
background: false
allowed-tools: Bash(git diff *) Bash(git log *)
---

Écris les tests manquants de la branche courante de ZIK.

- Cible précisée par Théo : $ARGUMENTS (si vide : tout ce que la branche ajoute ou corrige)
- Fichiers de code touchés : !`git diff --name-only origin/develop...HEAD -- src server.js 2>/dev/null | grep -v __tests__ | head -60 || true`
- Tests déjà touchés : !`git diff --name-only origin/develop...HEAD 2>/dev/null | grep __tests__ | head -40 || true`

Couvre d'abord les régressions des bugs corrigés, puis les entrées hostiles de chaque handler Socket.io touché, puis la logique et l'instantané. Termine par `npx vitest run` et ton rapport.
