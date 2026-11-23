---
name: idees
description: Brainstorm produit de ZIK par l'agent produit — meilleures fonctionnalités et améliorations d'expérience, côté visuel, joueur en ligne, joueur en soirée, organisateur ou ZIK Pro, classées par impact et effort. Utilise ce skill quand Théo demande des idées, « qu'est-ce qu'on pourrait ajouter », « comment améliorer l'expérience », ou quand la liste du plan est presque terminée.
argument-hint: "[axe : visuel | joueur | soiree | organisateur | pro | tout] [précision libre]"
context: fork
agent: produit
background: false
allowed-tools: Bash(git log *) Bash(ls *)
---

Cherche les meilleures idées pour ZIK sur cet axe : $ARGUMENTS (si vide : tout).

- Tours précédents : !`ls docs/idees 2>/dev/null || echo "aucun"`
- Livré récemment : !`git log --oneline origin/develop -25 2>/dev/null || true`

Tu ne codes pas et tu n'écris aucun fichier : tu proposes, Théo décide. Chaque idée part d'un manque observé dans ZIK, pas d'une liste générique.

1. **Connaître ZIK** : `CLAUDE.md`, `DESIGN.md`, `docs/design/brief-ecrans.md`, `src/lib/data/news.js` (livré), `src/lib/data/proPlans.js` (offre), `docs/strategie/`, `docs/audit/2026-11-02-a-valider.md` (prévu). Architecture : `graphify query "<question>"` si `graphify-out/` existe.
2. **Ne pas répéter** : une idée des tours précédents (`docs/idees/`) revient seulement avec un élément nouveau cité ; une idée refusée par Théo ne revient pas.
3. **Chercher les manques** : parcours réels (premier passage, compte, soirée lancée en 2 minutes, QR code, fin de partie, retour le lendemain), états mal couverts, frictions, ce qu'un client Pro ne peut pas faire seul.
4. **Regarder dehors** (web) : quiz et blind tests de bar, jeux musicaux, outils d'animation, ce que leurs utilisateurs réclament. S'inspirer d'un mécanisme, jamais copier un jeu précis.
5. **Filtrer** : écarte ce qui fragilise une soirée en public, dépend d'un service payant ou à quota, montre la réponse aux téléphones, mélange les deux univers sans raison, expose des données personnelles, invente un chiffre ou un témoignage.

Rapport : une phrase sur ce que tu as regardé, puis **Top 5** de la plus rentable à la moins rentable (titre, pour qui, le manque avec preuve ou « intuition », la proposition, impact et sur quoi, effort S/M/L et zones touchées, risques), **Autres pistes** (5 à 10, une ligne), **Écartées** (une ligne chacune), et les questions à poser à Théo.

Après le rapport (pour Claude, dans la session principale) :

1. Enregistre le rapport dans `docs/idees/AAAA-MM-JJ-<axe>.md`, avec en tête la date et l'axe, et une section « Décisions de Théo » vide.
2. Présente à Théo le top 5 et les questions, sans rien ajouter au plan.
3. Quand Théo tranche : remplis « Décisions de Théo » (retenue, refusée, plus tard), puis ajoute au plan (`docs/audit/2026-11-02-a-valider.md` ou le plan en cours) seulement les idées retenues. Le tout dans une PR `docs(idees): …` vers `develop`.
