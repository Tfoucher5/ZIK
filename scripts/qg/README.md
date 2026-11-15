# QG : l'équipe d'agents en direct

Tableau de bord 3D local : l'étage des bureaux de ZIK, pensé comme un vrai plateau (façades en biais, décrochés, noyau avec ascenseurs, escalier et toilettes). L'Entrée des artistes (accueil avec Nora et le néon ZIK), open space par service, bureaux de Claire (CEO), Théo et Victor (avocat), salles de réunion aux noms de musique (Le Disque d'Or pour le board, Le Larsen, La Démo, Le Refrain, La Grosse Caisse, Le Tempo), La Platine (studio son), cabines d'appel dans l'open space, La Discothèque, La Fosse (juke-box, vinyles, casque géant), Le Bœuf (cuisine), Les Choristes (postes des renforts). Chaque agent est un personnage avec son prénom (liste dans `public/noms.js`). Tokens et coût du jour.

## Lancer

```bash
node scripts/qg/serveur.mjs
```

Puis ouvrir http://localhost:4747. Rien à installer : Node seul, Three.js est chargé depuis jsDelivr.

Options : `--port 5000`, `--filtre ZIK` (dossiers de projet suivis, `ZIK` par défaut), `--tous` (toutes les sessions Claude Code du PC).

## Ce qu'il lit

Les journaux que Claude Code écrit déjà sur le PC (`~/.claude/projects/`, ou `CLAUDE_CONFIG_DIR`), relus chaque seconde : sessions, agents lancés (`subagents/`), outils utilisés, consommation de tokens. Les 36 dernières heures seulement. Rien n'est envoyé ailleurs : le serveur n'écoute que sur `127.0.0.1`.

L'organigramme vient du tableau « L'entreprise d'agents » du `CLAUDE.md` : un agent ou un chef ajouté là apparaît tout seul. Un agent hors organigramme (Explore, general-purpose…) s'affiche dans « Renforts ».

Le panneau « À trancher » (en haut à gauche, toujours affiché) lit `docs/strategie/a-trancher.md`, relu toutes les 5 secondes : le badge donne le nombre de décisions qui attendent Théo, chaque ligne se déplie (chantier, depuis, question, options, recommandation, lien). Une décision tranchée est retirée du fichier et notée dans `docs/strategie/decisions.md`.

## Lire l'écran

- Un agent au travail est assis à son poste, tape, son écran s'allume ; sa bulle dit ce qu'il fait. Au repos, il va à la cuisine, au salon, dans une cabine d'appel, aux toilettes ou à une fenêtre, sur une place libre. Les trajets contournent murs, meubles et chaises et passent par les portes, qui s'ouvrent à son approche.
- Un chef qui pilote un agent va se tenir à côté de lui. Un agent lancé plusieurs fois arrive en copies sur les postes libres de son service ; les agents hors organigramme sortent de l'ascenseur, s'installent aux « Renforts » et repartent à la fin.
- Brainstorm : dès que deux agents de réflexion d'un même service travaillent (pas dev, test-writer, reviewer, recette, incident), ils se retrouvent dans la salle de réunion du service, le chef à la télé, qui s'allume et affiche qui travaille sur quoi.
- « Board en séance » (au moins 3 membres au travail ensemble) : ils rejoignent la salle du board, le CEO préside debout et la télé de la salle s'allume.
- La lumière suit l'heure du PC : jour ou nuit.
- Menu « Réglages » en haut : afficher ou masquer les noms des salles et espaces, les noms des agents, leur activité et les panneaux ; chaque panneau se replie en cliquant sur son titre. Les réglages restent d'une ouverture à l'autre.
- Glisser pour tourner, molette pour zoomer, cliquer sur un personnage : ses missions, tokens et coût.
- Le coût est un **équivalent API** (tarifs publics par modèle, cache compris) : avec un abonnement Claude, ce n'est pas ce que tu paies, mais ça mesure ce que chaque équipe consomme.
