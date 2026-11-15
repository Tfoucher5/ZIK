# QG : l'équipe d'agents en direct

Tableau de bord local : l'étage des bureaux de ZIK en 3D au centre (chaque agent est un personnage avec son prénom, liste dans `public/noms.js`), et autour, tout ce qu'il faut pour suivre et répondre sans passer par le terminal.

## Lancer

`/qg` dans Claude Code : lance le serveur s'il ne répond pas déjà, ouvre le navigateur et surveille les réponses envoyées.

À la main :

```bash
node scripts/qg/serveur.mjs
```

Puis ouvrir http://localhost:4747. Rien à installer : Node seul, Three.js est chargé depuis jsDelivr. Si la 3D ne se charge pas, le tableau de bord reste utilisable.

Options : `--port 5000`, `--filtre ZIK` (dossiers de projet suivis, `ZIK` par défaut), `--tous` (toutes les sessions Claude Code du PC).

## Le tableau de bord

Un bouton « Masquer le tableau de bord » cache tout (la 3D reste) ; le choix est gardé.

- **À trancher** (bouton orange, badge = décisions sans réponse) : ouvre une fenêtre plein écran. Chaque décision de `docs/strategie/a-trancher.md` avec ses champs, des boutons rapides pour ses options et une zone de réponse libre. Les brouillons restent dans le navigateur. « Copier toutes mes réponses » donne un texte prêt à coller dans le terminal (`- titre → réponse`). « Envoyer » les ajoute, datées, dans `scripts/qg/boite/reponses.jsonl` (ignoré par git), que la session lancée par `/qg` surveille ; la décision affiche « envoyé, en attente de Claude » jusqu'à ce qu'elle soit retirée du fichier.
- **Limite d'utilisation** : fenêtres de 5 h et de la semaine, pourcentage et heure de remise à zéro, lus dans `boite/limites.json` écrit par la barre d'état (ci-dessous). Sans elle : estimation d'après les journaux (début de la fenêtre de 5 h, heure de reprise des messages « limit · resets 9:50pm »).
- **Qui fait quoi** : sessions et agents au travail, avec prénom, rôle, tâche (description du lancement) et depuis combien de temps.
- **Chantiers** : en cours, reste à faire, fait, lus dans `docs/strategie/chantiers.md` (tenu à jour par la session CEO).
- **En direct** (à droite) : une ligne par action, en français (« Lit reclaim.js », « Lance les tests », « Ouvre une PR »), avec le prénom et l'heure. Jamais la commande brute.

## Barre d'état (limite exacte)

Claude Code passe à la barre d'état les limites d'utilisation (`rate_limits`, abonnés Pro et Max). `statusline.mjs` les écrit dans `boite/limites.json` et affiche « modèle · 5 h x % · semaine y % ». À ajouter dans `~/.claude/settings.json` :

```json
"statusLine": { "type": "command", "command": "node C:/Users/Teamr/Documents/GitHub/ZIK/scripts/qg/statusline.mjs" }
```

## Ce qu'il lit

Les journaux que Claude Code écrit déjà sur le PC (`~/.claude/projects/`, ou `CLAUDE_CONFIG_DIR`), relus chaque seconde : sessions, agents lancés (`subagents/`), outils utilisés. Les 36 dernières heures seulement. Rien n'est envoyé ailleurs : le serveur n'écoute que sur `127.0.0.1`, refuse tout autre nom d'hôte et n'accepte un envoi de réponses que depuis sa propre page.

L'organigramme vient du tableau « L'entreprise d'agents » du `CLAUDE.md`.

## Routes (contrat pour la 3D)

| Route               | Réponse                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /flux`         | flux SSE, chaque seconde : `{ maintenant, limite, sessions, agents, enAttente, flux }`         |
| `GET /organigramme` | `{ chefs: [{ id, nom, skill, equipe }], board }`, lu dans le `CLAUDE.md`                       |
| `GET /agents`       | `[{ id, nom, role, equipe, model }]`, voir ci-dessous                                          |
| `GET /a-trancher`   | décisions, avec `envoye` (date) et `reponse` si Théo a déjà répondu                            |
| `GET /chantiers`    | `[{ titre, statut, etat, equipe, "prochaine etape" }]`, `etat` : `en-cours`, `a-faire`, `fait` |
| `GET /limites`      | contenu de `boite/limites.json` ou `null`                                                      |
| `POST /reponses`    | `{ reponses: [{ titre, reponse }] }` → ajouté à `boite/reponses.jsonl`                         |

`GET /agents`, relu à chaque appel (un agent ajouté apparaît sans redémarrer) :

- `id` : nom du fichier `.claude/agents/<id>.md`.
- `nom`, `role` : `public/noms.js` (`chef-argent` prend la fiche de `argent`). Un agent absent de `noms.js` reçoit un prénom par défaut stable, tiré de son `id`, et son `id` comme rôle.
- `equipe` : premier mot de « (équipe X) » dans la `description` (`Argent`, `Produit`, `Marketing`, `Opérations`…) ; `board` pour les `chef-*` et les membres du board ; sinon le chef qui l'a dans son équipe au `CLAUDE.md` (`Technique` pour `dev`) ; sinon `renforts`.
- `model` : champ `model` du frontmatter, ou `null`.
