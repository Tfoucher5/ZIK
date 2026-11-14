# QG : l'équipe d'agents en direct

Tableau de bord 3D local : l'étage des bureaux de ZIK, pensé comme un vrai plateau (façades en biais, décrochés, noyau avec ascenseurs, escalier et sanitaires). Accueil avec le néon ZIK, open space par service, bureaux de Claire (CEO), Théo et Victor (avocat), salles de réunion nommées (L'Olympia pour le board, Abbey Road, Motown, Woodstock, Montreux, La Cigale), cabines, Bibliothèque, Backstage (juke-box, vinyles, casque géant), Comptoir, coworking. Chaque agent est un personnage avec son prénom (liste dans `public/noms.js`). Tokens et coût du jour.

## Lancer

```bash
node scripts/qg/serveur.mjs
```

Puis ouvrir http://localhost:4747. Rien à installer : Node seul, Three.js est chargé depuis jsDelivr.

Options : `--port 5000`, `--filtre ZIK` (dossiers de projet suivis, `ZIK` par défaut), `--tous` (toutes les sessions Claude Code du PC).

## Ce qu'il lit

Les journaux que Claude Code écrit déjà sur le PC (`~/.claude/projects/`, ou `CLAUDE_CONFIG_DIR`), relus chaque seconde : sessions, agents lancés (`subagents/`), outils utilisés, consommation de tokens. Les 36 dernières heures seulement. Rien n'est envoyé ailleurs : le serveur n'écoute que sur `127.0.0.1`.

L'organigramme vient du tableau « L'entreprise d'agents » du `CLAUDE.md` : un agent ou un chef ajouté là apparaît tout seul. Un agent hors organigramme (Explore, general-purpose…) s'affiche dans « Renforts ».

## Lire l'écran

- Un agent au travail est assis à son poste, tape, son écran s'allume ; sa bulle dit ce qu'il fait. Au repos, il va à la cuisine, au salon ou à une fenêtre. Les trajets contournent murs et meubles et passent par les portes.
- Un chef qui pilote un agent va se tenir à côté de lui. Un agent lancé plusieurs fois arrive en copies sur les postes libres de son service ; les agents hors organigramme sortent de l'ascenseur, s'installent aux « Renforts » et repartent à la fin.
- Brainstorm : dès que deux agents de réflexion d'un même service travaillent (pas dev, test-writer, reviewer, recette, incident), ils se retrouvent dans la salle de réunion du service, le chef au tableau.
- « Board en séance » (au moins 3 membres au travail ensemble) : ils rejoignent la salle du board, le CEO préside debout et l'écran s'allume.
- La lumière suit l'heure du PC : jour ou nuit.
- Boutons du haut : afficher ou masquer les noms des pièces, des agents, leur activité et les panneaux ; chaque panneau se replie en cliquant sur son titre. Les réglages restent d'une ouverture à l'autre.
- Glisser pour tourner, molette pour zoomer, cliquer sur un personnage : ses missions, tokens et coût.
- Le coût est un **équivalent API** (tarifs publics par modèle, cache compris) : avec un abonnement Claude, ce n'est pas ce que tu paies, mais ça mesure ce que chaque équipe consomme.
