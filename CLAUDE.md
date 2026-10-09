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
- **Socket.io** : la logique serveur est dans `src/lib/server/socket/`
- **Supabase** : client browser dans `src/lib/supabase.js`, serveur dans `src/lib/supabaseServer.js`
- **CSS** : pas de framework CSS, styles dans `static/css/` ou `<style>` scoped dans les composants

## Bonnes pratiques de développement

- **Taille des fichiers** : viser moins de 300 lignes par fichier. Au-delà, découper avant d'ajouter du code
- **Où ranger quoi** :
  - `+page.svelte` assemble des composants, sans grosse logique ni gros bloc de styles
  - Composants d'un domaine dans `src/lib/components/<domaine>/` (ex : `card/`, `leaderboard/`), un composant = une responsabilité, avec ses styles scoped
  - État et chargement de données partagés par plusieurs composants : module `.svelte.js` (classe avec runes) à côté des composants
  - Accès BDD et logique métier serveur dans `src/lib/server/services/`, les `+server.js` restent fins (lecture des paramètres, appel du service, réponse)
- **Pas de duplication** : chercher un composant, un utilitaire ou une variable CSS existants avant d'en créer (ex : couleurs de rareté `--rc` dans `static/css/cards.css`)
- **Supabase côté serveur** : `supabase` utilise la clé anonyme et subit les RLS (rooms et playlists privées invisibles). Lire avec `getAdminClient()` quand le serveur doit tout voir
- **Vérifier avant de livrer** : `npx eslint .`, `npx vitest run`, `npx svelte-check`, et pour toute modif d'interface un contrôle visuel en desktop et en mobile (390 px)
- **Tests locaux** : le serveur de dev tape sur la BDD de prod. Ne pas créer de données de test (une room `auto_start` lance une partie dès qu'on la rejoint) ; si ça arrive, les supprimer
- Fais des fichiers réduits en taille, pas de gros fichiers. Privilégie les composants et modules réutilisables.

## Avant de coder

- Toujours lire le fichier avant de le modifier
- Pour les bugs Socket.io, vérifier `src/lib/server/socket/game.js` et `salon.js`
- Le state des salons est sur `globalThis.__zik_salonRooms` (survie hot-reload)

## Git

- Toujours demander confirmation avant `git push` ou `git commit`
- Branch principale : `master`

## MCPs disponibles

- **Supabase** : pour inspecter/modifier la BDD (tables, SQL, migrations)
- **Notion** : pour consulter les tâches et la doc projet
- **Stripe** : pour le systeme de paiement (abonnements, factures)
