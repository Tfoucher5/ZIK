# ZIK — Instructions pour Claude

## Projet

Application web **ZIK** (Blind Test Multijoueur) — https://www.zik-music.fr  
Stack: **SvelteKit 5** (Svelte 5 runes), Vite, Socket.io, Supabase, Node.js

## Règles générales

- Répondre en **français**
- Pas de commentaires inutiles dans le code, sauf si la logique n'est pas évidente
- Pas de refactoring non demandé, pas de features supplémentaires
- Préférer modifier un fichier existant plutôt qu'en créer un nouveau
- Ne pas ajouter de gestion d'erreur pour des cas impossibles
- Toujours tester lint avant de push et de faire une Pull Request (PR)
- Parles comme un homme de cromagnon pour dépenser moins de tokens
- Toujours incrémenter le numéro de version convenablement à chaque merge (dans toutes les pages concernées et dans les commits)
- Toujours supprimer les morceaux de code inutiles ou inutilisés.

## Stack & conventions

- **Svelte 5 runes** : utiliser `$state`, `$derived`, `$effect`, `$props` — pas les anciens stores Svelte 4
- **SvelteKit** : load functions côté serveur dans `+page.server.js`, client dans `+page.js`
- **Socket.io** : la logique serveur est dans `src/lib/server/socket/` (`game/`, `salon/`)
- **Supabase** : client navigateur dans `src/lib/client/supabase.js`, serveur dans `src/lib/server/config.js` (`supabase` anonyme, `getAdminClient()`)
- **CSS** : pas de framework CSS. Feuilles globales dans `static/css/`, découpées par sous-dossier (`game/`, `salon/`, `base/`, `admin/`) et chargées dans l'ordre par un `{#each}` de `<link>` (pas d'import Vite : le CSS doit disparaître quand on quitte la page). Sinon `<style>` scoped dans les composants

## Bonnes pratiques de développement

- **Taille des fichiers** : moins de 300 lignes par fichier (hors données statiques de `src/lib/data/`). Au-delà, découper avant d'ajouter du code
- **Où ranger quoi** (aucun fichier en vrac à la racine de `src/lib` ni de `src/lib/components`) :
  - `+page.svelte` assemble des composants, sans grosse logique ni gros bloc de styles. Pas de composant dans les dossiers de routes
  - `src/lib/components/<domaine>/` : composants d'un domaine (`card/`, `game/`, `salon/host/`, `admin/cards/`…), un composant = une responsabilité, avec ses styles scoped. Composants génériques dans `ui/`, coque du site (nav, menus) dans `layout/`
  - État d'une page riche (socket, nombreux `$state`) : classe dans un `.svelte.js` à côté des composants (ex : `game/gameSession.svelte.js`), les réactions socket dans un module séparé (`gameHandlers.js`, `salon/play/playerEvents.js`)
  - `src/lib/client/` : singletons navigateur (supabase, toast, notifications, push, thème)
  - `src/lib/shared/` : logique pure utilisée côté client et serveur, par domaine
  - `src/lib/data/` : contenus statiques (nouveautés, thèmes, offres Pro…)
  - `src/lib/server/services/<domaine>/` (`admin/`, `music/`, `notify/`, `rooms/`, `cards/`) : accès BDD et logique métier. Les `+server.js` et `+page.server.js` restent fins (lecture des paramètres, appel du service, réponse)
- **Imports** : `$lib/…` dans les `.svelte` et les routes. Les `.js` de `src/lib` importent en relatif : `server.js` charge le code serveur avec Node pur, et vitest ne connaît pas l'alias `$lib`
- **Pas de duplication** : chercher un composant, un utilitaire ou une variable CSS existants avant d'en créer (ex : couleurs de rareté `--rc` dans `static/css/cards.css`)
- **Supabase côté serveur** : `supabase` utilise la clé anonyme et subit les RLS (rooms et playlists privées invisibles). Lire avec `getAdminClient()` quand le serveur doit tout voir
- **Vérifier avant de livrer** : `npx eslint .`, `npx vitest run`, `npx svelte-check`, et pour toute modif d'interface un contrôle visuel en desktop et en mobile (390 px)
- **Tests locaux** : le serveur de dev tape sur la BDD de prod. Ne pas créer de données de test (une room `auto_start` lance une partie dès qu'on la rejoint) ; si ça arrive, les supprimer
- Fais des fichiers réduits en taille, pas de gros fichiers. Privilégie les composants et modules réutilisables.

## Économiser des tokens : Graphify + Ponytail

- **Graphify** (graphe du code dans `graphify-out/`, ignoré par git) :
  - Pour comprendre une archi, trouver qui appelle quoi ou tracer un flux : `graphify query "<question>"` (ou `path "A" "B"`, `explain "X"`) **avant** de lire des fichiers ou lancer un agent Explore
  - Lire `graphify-out/GRAPH_REPORT.md` (god nodes, communautés) plutôt que parcourir le repo
  - Après de gros changements : `/graphify . --update` (code seul = AST, gratuit). Ne pas relancer l'extraction des docs/images sans demande (coûte des sous-agents)
  - Si absent : `uv tool install graphifyy` puis `/graphify .` en mode code seul
- **Ponytail** (actif par défaut, niveau `full`) : plus petit diff complet, réutiliser l'existant, pas de code « pour plus tard ». `/ponytail-review` avant une PR, `/ponytail-audit` pour chercher le code mort, `/ponytail-debt` pour lister les `shortcut:`

## Avant de coder

- Toujours lire le fichier avant de le modifier
- Pour les bugs Socket.io, vérifier `src/lib/server/socket/game/` et `salon/` (point d'entrée `index.js` de chacun)
- Le state des salons est sur `globalThis.__zik_salonRooms` (survie hot-reload)

## Git

- Toujours demander confirmation avant `git push` ou `git commit`
- Branch principale : `master`

## MCPs disponibles

- **Supabase** : pour inspecter/modifier la BDD (tables, SQL, migrations)
- **Notion** : pour consulter les tâches et la doc projet
- **Stripe** : pour le systeme de paiement (abonnements, factures)
