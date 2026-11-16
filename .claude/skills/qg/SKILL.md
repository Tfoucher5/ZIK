---
name: qg
description: Ouvre le QG de ZIK (tableau de bord local de l'équipe d'agents) — démarre le serveur s'il ne répond pas sur le port 4747, ouvre le navigateur, puis surveille les réponses que Théo envoie depuis « À trancher ». Utilise ce skill quand Théo tape /qg ou demande à voir le QG.
allowed-tools: Bash(curl *) Bash(node scripts/qg/serveur.mjs*) Bash(start *)
---

# QG

- Le QG répond-il déjà : !`curl -s -o /dev/null -w "%{http_code}" http://localhost:4747/ 2>/dev/null || true`

1. **Serveur.** Si la ligne ci-dessus n'affiche pas `200`, lance `node scripts/qg/serveur.mjs` en arrière-plan (depuis la racine du dépôt), puis vérifie qu'il répond. S'il répond déjà, ne lance rien : un second serveur échouerait sur le port pris.
2. **Navigateur.** `start http://localhost:4747` (Windows).
3. **Boîte aux lettres.** Les réponses que Théo envoie depuis la fenêtre « À trancher » arrivent, une ligne JSON par réponse (`date`, `titre`, `reponse`), dans `scripts/qg/boite/reponses.jsonl`. Surveille ce fichier en arrière-plan (outil Monitor). À chaque nouvelle ligne : applique la réponse, note la décision dans `docs/strategie/decisions.md` et retire la section de `docs/strategie/a-trancher.md` (le QG affiche « envoyé, en attente de Claude » jusque-là). Une réponse floue : demande à Théo.

Rendu à Théo : une ligne (QG ouvert, serveur lancé ou déjà là).
