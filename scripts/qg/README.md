# QG : l'équipe d'agents en direct

Console de pilotage locale sur une seule page : qui travaille (une carte par instance d'agent), ce que chacun fait, la chronologie des 30 dernières minutes, le flux en direct, les chantiers et les décisions à trancher, sans passer par le terminal.

## Lancer

`/qg` dans Claude Code : lance le serveur s'il ne répond pas déjà, ouvre le navigateur et surveille les réponses envoyées.

À la main :

```bash
node scripts/qg/serveur.mjs
```

Puis ouvrir http://localhost:4747. Rien à installer : Node seul.

Options : `--port 5000`, `--filtre ZIK` (dossiers de projet suivis, `ZIK` par défaut), `--tous` (toutes les sessions Claude Code du PC).

## Le tableau de bord

- **À trancher** (bouton orange, badge = décisions sans réponse) : ouvre une fenêtre plein écran. Chaque décision de `docs/strategie/a-trancher.md` avec ses champs, des boutons rapides pour ses options et une zone de réponse libre. Les brouillons restent dans le navigateur. « Copier toutes mes réponses » donne un texte prêt à coller dans le terminal (`- titre → réponse`). « Envoyer » les ajoute, datées, dans `scripts/qg/boite/reponses.jsonl` (ignoré par git), que la session lancée par `/qg` surveille ; la décision affiche « envoyé, en attente de Claude » jusqu'à ce qu'elle soit retirée du fichier. Le champ `- **Lien** :` est cliquable s'il est une adresse http ou un chemin local (`C:\…`, `docs/…`) : il s'ouvre dans un nouvel onglet par `/voir` (vidéo dans le lecteur du navigateur, Markdown lisible).
- **Indicateurs** (en haut) : instances au travail, dev en parallèle (plafond 4), fenêtres de 5 h et de la semaine (pourcentage et remise à zéro lus dans `boite/limites.json` écrit par la barre d'état ; sans elle, estimation d'après les journaux), PR fusionnées depuis minuit.
- **Équipe** : une ligne par agent du `CLAUDE.md` (un agent inconnu, comme Explore, a sa ligne le temps de sa mission), rôles au travail en haut. Une carte par instance, numérotée (`dev #1`, `dev #2`…) : branche, durée, action en cours avec son icône, tâche du lancement, bande des dernières actions colorées par famille. Une carte arrive et part en fondu.
- **Chronologie** : une piste par instance sur 30 minutes, un segment par action coloré par famille (lit, écrit, tests, vérifie, git et PR, web, base, prod, question, réfléchit). Une attente de plus de 3 minutes n'est pas dessinée. Familles et segments : `public/familles.js`.
- **En direct** : une ligne par action, en français (« Lit reclaim.js », « Lance les tests », « Ouvre une PR »), avec l'instance et l'heure, filtrable (code, tests, git et PR, questions). Jamais la commande brute.
- **Chantiers** : en cours, reste à faire, fait, lus dans `docs/strategie/chantiers.md`.

## Barre d'état (limite exacte)

Claude Code passe à la barre d'état les limites d'utilisation (`rate_limits`, abonnés Pro et Max). `statusline.mjs` les écrit dans `boite/limites.json` et affiche « modèle · 5 h x % · semaine y % ». À ajouter dans `~/.claude/settings.json` :

```json
"statusLine": { "type": "command", "command": "node C:/Users/Teamr/Documents/GitHub/ZIK/scripts/qg/statusline.mjs" }
```

## Ce qu'il lit

Les journaux que Claude Code écrit déjà sur le PC (`~/.claude/projects/`, ou `CLAUDE_CONFIG_DIR`), relus chaque seconde : sessions, agents lancés (`subagents/`), outils utilisés. Les 36 dernières heures seulement. Rien n'est envoyé ailleurs : le serveur n'écoute que sur `127.0.0.1`, refuse tout autre nom d'hôte et n'accepte un envoi de réponses que depuis sa propre page.

## Routes

| Route             | Réponse                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /flux`       | flux SSE, chaque seconde : `{ maintenant, limite, prFusionnees, sessions, agents, enAttente, flux }, sessions et agents avec `traces` (30 dernières minutes)` |
| `GET /a-trancher` | décisions, avec `envoye` (date) et `reponse` si Théo a déjà répondu                                                                                           |
| `GET /chantiers`  | `[{ titre, statut, etat, equipe, "prochaine etape" }]`, `etat` : `en-cours`, `a-faire`, `fait`                                                                |
| `GET /limites`    | contenu de `boite/limites.json` ou `null`                                                                                                                     |
| `POST /reponses`  | `{ reponses: [{ titre, reponse }] }` → ajouté à `boite/reponses.jsonl`                                                                                        |
| `GET /voir?f=…`   | fichier à relire (voir ci-dessous), 403 hors des dossiers autorisés                                                                                           |

`GET /voir?f=<chemin>` : chemin absolu ou relatif au dépôt (`docs/…`). Servi seulement depuis la machine (`127.0.0.1`) et si le chemin réel (liens résolus) est sous le dépôt, `~/Documents/GitHub/ZIK-memes` ou `<temp>/claude/` ; `..` et chemins réseau refusés. Types : `.mp4`, `.webm` (lecteur du navigateur, avance rapide par `Range`), `.png`, `.jpg`, `.gif`, `.webp`, `.svg`, `.txt`, `.html`, `.md` (texte lisible sur fond sombre) ; autre extension → 415. HTML, SVG et Markdown sont isolés (`CSP sandbox`) : une maquette ne peut pas envoyer de réponses au QG. Une maquette qui charge des fichiers voisins (CSS, images en relatif) ne les trouve pas : la garder autonome.
