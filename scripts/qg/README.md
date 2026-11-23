# QG : l'équipe d'agents en direct

Tableau de bord local : la ZIK TOWER en 3D au centre (chaque agent est un personnage avec son prénom, liste dans `public/noms.js`), et autour, tout ce qu'il faut pour suivre et répondre sans passer par le terminal.

## Lancer

`/qg` dans Claude Code : lance le serveur s'il ne répond pas déjà, ouvre le navigateur et surveille les réponses envoyées.

À la main :

```bash
node scripts/qg/serveur.mjs
```

Puis ouvrir http://localhost:4747. Rien à installer : Node seul, Three.js est chargé depuis jsDelivr. Si la 3D ne se charge pas, le tableau de bord reste utilisable.

Options : `--port 5000`, `--filtre ZIK` (dossiers de projet suivis, `ZIK` par défaut), `--tous` (toutes les sessions Claude Code du PC).

## Les plans de la ZIK Tower

**Le plan est la source de vérité.** La tour du QG (niveaux, noyau, murs, portes, pièces, accès, postes, mobilier) est décrite dans `public/tour/plan.js` et `public/tour/niveaux/<niveau>.js` : données pures, en mètres, origine au coin nord-ouest, x vers l'est, y vers le sud. La 3D se construit à partir de ces données ; une salle ajoutée, déplacée ou renommée l'est d'abord là, et se voit donc sur le plan.

- Bouton « Plans » de la barre (ou http://localhost:4747/plans.html) : coupe cliquable, un plan par niveau (sous-sol au toit), légende « pièce · usage · qui · pourquoi », altimétrie. Rendu par `tour/dessin.js` (plans), `tour/coupe.js` et `tour/page.js`, styles dans `plans*.css`.
- Une pièce : `id`, `nom`, `usage`, `poly`, `acces` (`public`, `employes`, `pole:<chef>`, `direction`, `fondateur`, `service`), `mobilier` (types de `tour/outils.js`) ; `occupants` est déduit des postes. Les salles de réunion (`reunion: true`) portent un nom de festival (`FESTIVALS`), les autres un nom tiré de la musique.
- Une porte : position, largeur, axe, sens, et `entre` (les deux lieux qu'elle relie, `rue` ou `service` pour dehors). Une porte entre un lieu public et un lieu qui ne l'est pas a un `controle` (portiques, badge, accueil, issue).
- `__tests__/plan-tour.test.js` garde la cohérence : emprise, chevauchements, portes qui relient ce qu'elles annoncent, noyau, arrêts des ascenseurs, un poste par agent de `noms.js`, festivals uniques, café public isolé du reste. Lancer `npx vitest run scripts/qg` après chaque changement de plan.

## La ZIK TOWER en 3D

La scène (`scene.js`) monte la tour depuis le plan, posée au sol de la ville (rue au niveau du hall) : `tour3d/structure.js` (dalles, façades, noyau, ascenseurs, coupe), `tour3d/interieur.js` (mobilier, postes, places de pause) pour chaque niveau, `ville.js` autour. Repère : `tour3d/repere.js`.

- **Ascenseur du QG** (en bas à droite) : un bouton par niveau, du toit (T) au sous-sol (-1), et « Ville » (vue de départ, toute la tour). Touches : `0` RDC, `1` à `7` les étages, `-` sous-sol, `T` toit, `V` ville. La caméra vole vers le niveau et la tour est coupée au-dessus.
- **Accès** (`tour3d/acces.js`) : une grille de chemins par niveau et par jeu de droits, construite depuis le plan (pièces permises, murs, portes permises ouvertes, rue autour du RDC). Droits : tout le monde `employes` (et le café public), son pôle `pole:<id>`, `direction` pour les chefs, Claire, Victor et Gérard, tout pour Théo ; les passants n'ont que `public`. Une porte ne s'ouvre que si l'agent a le droit des deux côtés : un passant ne franchit jamais les portiques, un employé n'entre pas au penthouse.
- **Ascenseurs** : changer de niveau, c'est marcher au palier, appeler la cabine, y disparaître et réapparaître au palier d'arrivée. A1 et A2 pour tous, l'ascenseur privé pour la direction et Théo (correspondance au N6 ou au RDC si besoin), jamais le monte-charge.
- **Agenda** (`tour3d/agenda.js`, `tour3d/vie.js`, heure du PC) : un agent qui travaille (flux) est à son poste, ou en réunion dans la salle de son pôle dès qu'ils sont deux (board à Woodstock). Au repos : arrivée par le hall entre 8 h et 9 h, café, déjeuner au restaurant (Motown, Stax) entre 12 h et 14 h, pauses au sport, en salle de jeux, à l'atrium ou en terrasse, départ entre 18 h et 20 h (un sur six reste jusqu'à 23 h). Théo vit au penthouse, Nora tient l'accueil de 8 h à 20 h. Des passants entrent au Cavern Club, s'assoient et repartent.
- **Lumière** (`tour3d/lumiere.js`) : soleil à l'heure réelle (aube rosée, jour, coucher doré, nuit bleue), ciel et brume mêlés en continu, fenêtres allumées de 8 h à 20 h ou dès que quelqu'un est là, lampadaires la nuit.

## Le tableau de bord

Un bouton « Masquer le tableau de bord » cache tout (la 3D reste) ; le choix est gardé.

- **À trancher** (bouton orange, badge = décisions sans réponse) : ouvre une fenêtre plein écran. Chaque décision de `docs/strategie/a-trancher.md` avec ses champs, des boutons rapides pour ses options et une zone de réponse libre. Les brouillons restent dans le navigateur. « Copier toutes mes réponses » donne un texte prêt à coller dans le terminal (`- titre → réponse`). « Envoyer » les ajoute, datées, dans `scripts/qg/boite/reponses.jsonl` (ignoré par git), que la session lancée par `/qg` surveille ; la décision affiche « envoyé, en attente de Claude » jusqu'à ce qu'elle soit retirée du fichier. Le champ `- **Lien** :` est cliquable s'il est une adresse http ou un chemin local (`C:\…`, `docs/…`) : il s'ouvre dans un nouvel onglet par `/voir` (vidéo dans le lecteur du navigateur, Markdown lisible).
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
| `GET /voir?f=…`     | fichier à relire (voir ci-dessous), 403 hors des dossiers autorisés                            |

`GET /voir?f=<chemin>` : chemin absolu ou relatif au dépôt (`docs/…`). Servi seulement depuis la machine (`127.0.0.1`) et si le chemin réel (liens résolus) est sous le dépôt, `~/Documents/GitHub/ZIK-memes` ou `<temp>/claude/` ; `..` et chemins réseau refusés. Types : `.mp4`, `.webm` (lecteur du navigateur, avance rapide par `Range`), `.png`, `.jpg`, `.gif`, `.webp`, `.svg`, `.txt`, `.html`, `.md` (texte lisible sur fond sombre) ; autre extension → 415. HTML, SVG et Markdown sont isolés (`CSP sandbox`) : une maquette ne peut pas envoyer de réponses au QG. Une maquette qui charge des fichiers voisins (CSS, images en relatif) ne les trouve pas : la garder autonome.

`GET /agents`, relu à chaque appel (un agent ajouté apparaît sans redémarrer) :

- `id` : nom du fichier `.claude/agents/<id>.md`.
- `nom`, `role` : `public/noms.js` (`chef-argent` prend la fiche de `argent`). Un agent absent de `noms.js` reçoit un prénom par défaut stable, tiré de son `id`, et son `id` comme rôle.
- `equipe` : premier mot de « (équipe X) » dans la `description` (`Argent`, `Produit`, `Marketing`, `Opérations`…) ; `board` pour les `chef-*` et les membres du board ; sinon le chef qui l'a dans son équipe au `CLAUDE.md` (`Technique` pour `dev`) ; sinon `renforts`.
- `model` : champ `model` du frontmatter, ou `null`.
