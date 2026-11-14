---
name: board
description: Board d'agents de ZIK — même fiche pour les 5 chefs, l'avocat du diable et un client Pro, avis séparés, un tour de réponse, puis synthèse avec décision recommandée et critère d'arrêt, rangée dans le journal des décisions. Utilise ce skill pour les grosses décisions (nouvelle offre, prix, nouveau mode de jeu, nouvelle page, gros chantier, changement de cap), quand Théo lance /board ou dit « mets tous les agents dessus ».
argument-hint: "[question à trancher]"
allowed-tools: Bash(date *)
---

# Board

Question : $ARGUMENTS

Membres : `chef-argent`, `chef-operations`, `chef-produit`, `chef-tech`, `chef-marketing`, `avocat`, `client-pro`. Le board conseille ; Théo décide. Il ne touche ni au code, ni à la base, ni à l'argent.

## 1. La fiche

Écris une fiche d'une page :

- **Question** : fermée, une phrase (« Faut-il … ? »).
- **Options** : 2 à 4, dont « ne rien faire ».
- **Chiffres** : depuis `docs/strategie/etat.md` (s'il date de plus de 7 jours, lance `/etat` d'abord).
- **Contraintes** : celles du `CLAUDE.md` qui comptent ici (budget, fiabilité des soirées, dev seul).
- **Déjà décidé** : lignes liées de `docs/strategie/decisions.md`.
- **Fichiers utiles** : 3 à 5 chemins.

Montre la fiche à Théo en une ligne et lance sans attendre, sauf s'il a demandé à la relire.

## 2. Tour 1

Lance les 7 membres **en parallèle**, chacun avec exactement la même fiche et la consigne « Tour 1 ».

## 3. Tour 2

Relance les 7 membres en parallèle avec la fiche, les 7 avis du tour 1 et la consigne « Tour 2 ». Pas de tour 3.

## 4. Synthèse

Toi, en arbitre neutre :

```
Décision recommandée : …
Votes : oui N · non N · oui si N (qui a changé d'avis au tour 2 et pourquoi)
Arguments décisifs : 3 max, avec leur auteur
Désaccords restants : …
Le test le moins cher pour trancher : quoi, en combien de temps
Critère d'arrêt : « si … d'ici le JJ/MM, on arrête »
Ce que Théo doit décider : …
```

## 5. Journal

Ajoute en tête de `docs/strategie/decisions.md` : date, question, recommandation, votes, critère d'arrêt, et une ligne « Décision de Théo : en attente ». Quand Théo tranche, remplis-la. Le tout dans une PR `docs(decisions): …` vers `develop`.
