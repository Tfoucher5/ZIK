---
name: demarrer
description: Démarre proprement une nouvelle tâche ZIK — retrouve l'item dans le plan, crée la branche depuis develop avec le bon nom, prépare la liste des étapes. Utilise ce skill quand Théo dit qu'il attaque, commence ou reprend une tâche, une phase, un bug ou une fonctionnalité (« on attaque la phase 0 », « je veux corriger le buzzer », « nouvelle feature »), avant d'écrire la moindre ligne de code.
argument-hint: "[sujet de la tâche]"
allowed-tools: Bash(git status *) Bash(git branch *) Bash(git fetch *) Bash(git log *) Bash(git rev-parse *)
---

# Démarrer une tâche

Tâche demandée : $ARGUMENTS

## État du dépôt au lancement

- Branche courante : !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`
- Modifications en cours : !`git status --short 2>/dev/null | head -20 || true`
- Branches distantes : !`git branch -r 2>/dev/null | head -20 || true`

## Étapes

1. **Rien ne doit traîner.** S'il y a des modifications non commitées, arrête-toi et demande à Théo quoi en faire (commit sur leur branche, stash, abandon). Ne les embarque jamais dans la nouvelle branche.
2. **Retrouver la tâche dans le plan.** Cherche-la dans `docs/audit/2026-11-02-a-valider.md` (phases 0 à 5). Cite l'item tel qu'il est écrit, sa phase, et les items de la même phase dont il dépend. Si la tâche n'y est pas, dis-le et demande si on l'ajoute au plan avant de commencer.
3. **Vérifier l'ordre des phases.** Une tâche de la phase N suppose la phase N-1 terminée, sauf une urgence de phase 0. Si ce n'est pas le cas, signale-le en une phrase et laisse Théo décider.
4. **Créer la branche** depuis `develop` à jour :
   - `git fetch origin`
   - nom : `feature/<sujet>` (nouvelle fonction), `fix/<sujet>` (bug), `chore/<sujet>` (outillage, docs, dépendances) ; sujet en kebab-case, court, en français sans accents (`fix/joueurs-partis-score`) ;
   - `git switch -c <nom> origin/develop`.
     Si `develop` n'existe pas encore sur le dépôt (avant la phase 1), dis-le et pars de `master` en le signalant.
5. **Lire avant d'écrire.** Charge les fichiers concernés, la fiche de l'écran dans `docs/design/brief-ecrans.md` si c'est de l'interface, et les règles du domaine (`zik-socket`, `zik-supabase`, `zik-ui` se chargent selon les fichiers touchés).
6. **Planifier.** Écris la liste des étapes avec l'outil de tâches : code, tests (régression et entrées hostiles si temps réel), vérifications de la « Définition de terminé » du `CLAUDE.md`, puis `/terminer`. Si la tâche touche à la fois la base et le code, la migration vient en premier.
7. **Annonce en trois lignes** : branche créée, item du plan, première étape. Puis commence.
