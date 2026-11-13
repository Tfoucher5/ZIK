# QG : l'équipe d'agents en direct

Tableau de bord 3D local : les bureaux de ZIK (direction, salle du board, un open space par service, café), avec Théo, le CEO, les chefs, leurs équipes et le board en personnages qui vivent au rythme du vrai travail. Tokens et coût du jour.

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

- Un agent au travail est assis à son poste, tape, son écran s'allume ; sa bulle dit ce qu'il fait. Un agent au repos se promène : café, canapé, couloir.
- Un chef qui pilote un agent va se tenir à côté de lui. Un agent lancé plusieurs fois arrive en copies sur les postes libres de son service ; les agents hors organigramme arrivent aux « Renforts » et repartent à la fin.
- « Board en séance » (au moins 3 membres au travail ensemble) : ils rejoignent la salle du board et l'écran s'allume.
- Glisser pour tourner, molette pour zoomer, cliquer sur un personnage : ses missions, tokens et coût.
- Le coût est un **équivalent API** (tarifs publics par modèle, cache compris) : avec un abonnement Claude, ce n'est pas ce que tu paies, mais ça mesure ce que chaque équipe consomme.
