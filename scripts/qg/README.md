# QG : l'équipe d'agents en direct

Tableau de bord local sur une seule page : limite d'utilisation, qui fait quoi, chantiers, flux en direct et décisions à trancher, sans passer par le terminal.

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
- **Limite d'utilisation** : fenêtres de 5 h et de la semaine, pourcentage et heure de remise à zéro, lus dans `boite/limites.json` écrit par la barre d'état (ci-dessous). Sans elle : estimation d'après les journaux (début de la fenêtre de 5 h, heure de reprise des messages « limit · resets 9:50pm »).
- **Qui fait quoi** : sessions et agents au travail, avec type d'agent, tâche (description du lancement) et depuis combien de temps.
- **Chantiers** : en cours, reste à faire, fait, lus dans `docs/strategie/chantiers.md` (tenu à jour par la session CEO).
- **En direct** : une ligne par action, en français (« Lit reclaim.js », « Lance les tests », « Ouvre une PR »), avec l'agent et l'heure. Jamais la commande brute.

## Barre d'état (limite exacte)

Claude Code passe à la barre d'état les limites d'utilisation (`rate_limits`, abonnés Pro et Max). `statusline.mjs` les écrit dans `boite/limites.json` et affiche « modèle · 5 h x % · semaine y % ». À ajouter dans `~/.claude/settings.json` :

```json
"statusLine": { "type": "command", "command": "node C:/Users/Teamr/Documents/GitHub/ZIK/scripts/qg/statusline.mjs" }
```

## Ce qu'il lit

Les journaux que Claude Code écrit déjà sur le PC (`~/.claude/projects/`, ou `CLAUDE_CONFIG_DIR`), relus chaque seconde : sessions, agents lancés (`subagents/`), outils utilisés. Les 36 dernières heures seulement. Rien n'est envoyé ailleurs : le serveur n'écoute que sur `127.0.0.1`, refuse tout autre nom d'hôte et n'accepte un envoi de réponses que depuis sa propre page.

## Routes

| Route             | Réponse                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `GET /flux`       | flux SSE, chaque seconde : `{ maintenant, limite, sessions, agents, enAttente, flux }`         |
| `GET /a-trancher` | décisions, avec `envoye` (date) et `reponse` si Théo a déjà répondu                            |
| `GET /chantiers`  | `[{ titre, statut, etat, equipe, "prochaine etape" }]`, `etat` : `en-cours`, `a-faire`, `fait` |
| `GET /limites`    | contenu de `boite/limites.json` ou `null`                                                      |
| `POST /reponses`  | `{ reponses: [{ titre, reponse }] }` → ajouté à `boite/reponses.jsonl`                         |
| `GET /voir?f=…`   | fichier à relire (voir ci-dessous), 403 hors des dossiers autorisés                            |

`GET /voir?f=<chemin>` : chemin absolu ou relatif au dépôt (`docs/…`). Servi seulement depuis la machine (`127.0.0.1`) et si le chemin réel (liens résolus) est sous le dépôt, `~/Documents/GitHub/ZIK-memes` ou `<temp>/claude/` ; `..` et chemins réseau refusés. Types : `.mp4`, `.webm` (lecteur du navigateur, avance rapide par `Range`), `.png`, `.jpg`, `.gif`, `.webp`, `.svg`, `.txt`, `.html`, `.md` (texte lisible sur fond sombre) ; autre extension → 415. HTML, SVG et Markdown sont isolés (`CSP sandbox`) : une maquette ne peut pas envoyer de réponses au QG. Une maquette qui charge des fichiers voisins (CSS, images en relatif) ne les trouve pas : la garder autonome.
