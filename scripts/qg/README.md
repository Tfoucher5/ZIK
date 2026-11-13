# QG : l'équipe d'agents en direct

Tableau de bord 3D local : l'organigramme de ZIK (Théo, CEO, chefs, équipes, board), qui travaille en ce moment et sur quoi, les tokens et le coût du jour.

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

- Un nœud allumé qui pulse travaille ; sa ligne d'état dit ce qu'il fait. Des particules circulent du chef vers l'agent qu'il pilote.
- « Board en séance » apparaît quand au moins 3 membres du board travaillent ensemble.
- Cliquer sur un nœud : ses missions, tokens et coût.
- Le coût est un **équivalent API** (tarifs publics par modèle, cache compris) : avec un abonnement Claude, ce n'est pas ce que tu paies, mais ça mesure ce que chaque équipe consomme.
