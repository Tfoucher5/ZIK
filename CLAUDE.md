# ZIK — Instructions pour Claude

## Projet

Application web **ZIK** (Blind Test Multijoueur) — https://www.zik-music.fr
Stack : **SvelteKit 5** (Svelte 5 runes), Vite, Socket.io, Supabase, Node.js, hébergé sur Railway.

Le cœur du produit est **ZIK Soirée** (ex « mode salon »), utilisé en public par des clients **ZIK Pro** (bars, campings, entreprises, associations). Une panne en pleine soirée abîme l'image de nos clients devant leur public : chaque changement est traité avec ce niveau d'exigence, même si ça ralentit le développement.

Plan en cours : `docs/audit/2026-11-02-audit.md` (audit complet) et `docs/audit/2026-11-02-a-valider.md` (tâches par phase, à cocher au fil de l'eau).

## Règles générales

- Répondre en **français**
- Parles comme un homme de cromagnon pour dépenser moins de tokens
- Pas de commentaires inutiles dans le code, sauf si la logique n'est pas évidente
- Pas de refactoring non demandé, pas de features supplémentaires
- Préférer modifier un fichier existant plutôt qu'en créer un nouveau
- Toujours supprimer les morceaux de code inutiles ou inutilisés
- Toujours demander confirmation avant `git push`, `git commit`, un merge, ou toute écriture sur une base (staging comme prod)
- Ne jamais toucher à la prod directement : ni SQL dans le dashboard, ni variable Railway, ni déploiement manuel. Tout passe par une PR

## Environnements

| Env     | Branche   | Railway                                  | Supabase        | Usage                                           |
| ------- | --------- | ---------------------------------------- | --------------- | ----------------------------------------------- |
| Prod    | `master`  | `[PROD] - Production` (www.zik-music.fr) | projet `ZIK`    | Joueurs et clients réels                        |
| Staging | `develop` | `[DEV] - Développement`                  | base de staging | Recette d'une release complète, tests de charge |

- Le `.env` local pointe sur la **base de staging**, jamais sur la prod
- Hors prod : clés Stripe de test, clé Resend limitée, paire VAPID dédiée, clés Turnstile de test, prospection désactivée. Un test ne doit jamais envoyer de mail, de notification ou de paiement réel
- Données de test : seulement sur le staging, régénérables par le script de seed. Jamais de donnée de test en prod
- Une variable ajoutée = ajoutée dans `.env.example` (avec un commentaire qui dit où l'obtenir) et dans les deux environnements Railway

## Branches et mises en prod

- Une tâche = une branche depuis `develop` : `feature/<sujet>`, `fix/<sujet>`, `chore/<sujet>`. Retour dans `develop` par PR
- `master` ne reçoit que des PR `release vX.Y.Z` depuis `develop`, ou des `hotfix/<sujet>` partis de `master` (et reportés ensuite dans `develop`)
- Pas de push direct sur `master` ni `develop`. Fusion en squash, un commit par PR
- Message de commit et titre de PR : `type(zone): description (vX.Y.Z)`, types `feat`, `fix`, `perf`, `chore`, `docs`, `test`
- Version : toujours incrémentée dans la PR de release (dans toutes les pages concernées et dans le commit)
- **Gel des mises en prod du jeudi 18h au dimanche 2h** (heure de Paris) : aucune release. Seul un hotfix critique passe, après annonce de maintenance aux salons depuis l'admin

## Définition de « terminé »

Une PR n'est prête que si tout est vrai :

1. `npx eslint .`, `npx prettier --check .`, `npx svelte-check`, `npm run build` : verts
2. `npx vitest run` vert, avec des tests nouveaux pour tout code nouveau ou corrigé. Un bug corrigé = un test qui l'aurait attrapé
3. Couverture tenue sur `src/lib/server/socket/` et `src/lib/server/services/` (seuil dans `vitest.config.js`, on ne le baisse jamais)
4. Tout handler Socket.io nouveau ou modifié passe par `safe()` avec un schéma de validation, et a son test d'entrées hostiles
5. Toute migration a ses politiques RLS et ses droits explicites, et les conseillers Supabase du staging ne remontent rien de nouveau
6. Interface modifiée : contrôle visuel sur le staging après fusion dans `develop` (pas d'environnement par PR), en desktop et en mobile (390 px)
7. `/relire` (agent `reviewer`) sans point bloquant
8. Release : scénario Playwright du salon vert sur le staging, sondes de `/admin/statut` au vert

Si un point ne peut pas être tenu, le dire dans la PR et demander, ne pas fusionner.

## Skills et agents

Commandes (dans `.claude/skills/`), dans l'ordre d'une tâche :

| Commande                   | Rôle                                                                                      | Déclenchement                                        |
| -------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/demarrer <item du plan>` | état git propre, item trouvé dans le plan, branche depuis `develop`, plan annoncé         | Théo ou Claude au début d'une tâche                  |
| `/tests`                   | agent `test-writer` : tests manquants du diff                                             | Claude après le code, ou Théo                        |
| `/relire`                  | agent `reviewer` : relit le diff contre ce fichier, verdict fusionnable / bloqué          | Claude avant toute PR, ou Théo                       |
| `/migration <changement>`  | migration Supabase selon les règles, testée sur le staging                                | Claude dès qu'un changement de schéma est nécessaire |
| `/terminer`                | Définition de terminé vérifiée, plan coché, commit + PR vers `develop` après confirmation | Claude quand la tâche est finie, ou Théo             |
| `/release`                 | gel, staging, version, notes, PR `develop` → `master`                                     | Théo seulement                                       |
| `/hotfix <bug>`            | branche depuis `master`, test qui reproduit, correctif minimal, report dans `develop`     | Théo seulement                                       |
| `/incident <symptôme>`     | agent `incident` : enquête prod en lecture seule, rapport                                 | Claude dès qu'un problème prod est signalé, ou Théo  |

Règles chargées automatiquement selon les fichiers touchés : `zik-socket` (temps réel, salon, partie), `zik-supabase` (base, migrations, services), `zik-ui` (`.svelte`, CSS).

Agents (dans `.claude/agents/`, contexte séparé) : `reviewer` (lecture seule), `test-writer`, `incident` (lecture seule, aucune action prod).

## Base de données (Supabase)

- **Toute** modification de schéma passe par un fichier dans `supabase/migrations/`, appliqué par la CI : staging sur `develop`, prod sur `master`. Jamais de SQL de structure tapé à la main
- Tables rangées par domaine (`catalog`, `play`, `salon`, `cards`, `social`, `ops`) ; `public` ne garde que ce qui est lu par le navigateur. Une nouvelle table va dans le schéma de son domaine
- RLS activé partout. Dans les politiques : `(select auth.uid())`, jamais `auth.uid()` nu. Une politique par action et par rôle
- Fonctions : `security invoker` par défaut. `security definer` seulement si nécessaire, avec `set search_path = ''`, une vérification de l'appelant, et `revoke execute ... from anon, authenticated` si elle est réservée au serveur
- Une clé étrangère = un index
- Côté serveur : `supabase` (clé anonyme) subit les RLS ; `getAdminClient()` pour tout ce que le serveur écrit ou doit tout voir (scores, stats, admin). Une fonction qui modifie des scores n'est jamais appelable par la clé anonyme
- Supabase Realtime n'est pas utilisé : tout le temps réel passe par Socket.io

## Temps réel (Socket.io) et ZIK Soirée

- Logique serveur dans `src/lib/server/socket/` (`game/`, `salon/`), point d'entrée `index.js` de chacun
- Chaque handler est enregistré via `safe(socket, nom, schema, fn)` : payload validé par un schéma, exception attrapée et journalisée. Un message mal formé ne doit jamais faire tomber le process
- Le serveur est la seule source de vérité : chrono (heure de fin), scores, phase
- Les téléphones des joueurs ne reçoivent jamais la réponse ni le média (`videoId`, `audioUrl`) ; le média ne part qu'aux écrans authentifiés par la clé de régie
- Un joueur parti en cours de partie reste compté : son score figure dans le résultat final, le classement de soirée et son profil
- L'état des salons est en mémoire (`globalThis.__zik_salonRooms`) et sauvegardé dans Postgres (`salon.snapshots`) à chaque changement de phase et sur `SIGTERM`, puis restauré quand un écran ou un téléphone rejoint un code absent de la mémoire (`salon/snapshot.js`). Tout nouveau champ d'état doit être sérialisable et couvert par le test d'instantané
- Aucun appel YouTube côté serveur pendant une partie : les vidéos sont résolues à l'import des playlists
- Pour les bugs Socket.io, commencer par `salon/` ou `game/`, puis les logs Railway et `/admin/statut`

## Tests

- Unitaires et intégration : Vitest. Les tests d'intégration démarrent un vrai serveur Socket.io en mémoire et des `socket.io-client`, avec YouTube, Deezer et Stripe simulés
- Bout en bout : Playwright, un écran TV, une régie et des téléphones (contextes mobiles), sur le staging
- Charge : uniquement sur le staging, jamais sur la prod, source vidéo simulée
- Un test ne dépend jamais du réseau réel ni de la base de prod

## Surveillance

- Sondes internes toutes les 60 s, `/healthz` pour Railway, historique dans `ops.health_checks`, erreurs dans `ops.errors`
- Page publique `/statut`, page détaillée `/admin/statut`, alertes push et mail aux admins
- Toute nouvelle dépendance externe (API, service) ajoute sa sonde
- Pas de service tiers payant ou à quota : on fait nous-mêmes

## Stack & conventions

- **Svelte 5 runes** : `$state`, `$derived`, `$effect`, `$props` — pas les anciens stores Svelte 4
- **SvelteKit** : load functions côté serveur dans `+page.server.js`, client dans `+page.js`
- **Supabase** : client navigateur dans `src/lib/client/supabase.js`, serveur dans `src/lib/server/config.js` (`supabase` anonyme, `getAdminClient()`)
- **CSS** : pas de framework CSS. Feuilles globales dans `static/css/`, découpées par sous-dossier (`game/`, `salon/`, `base/`, `admin/`) et chargées dans l'ordre par un `{#each}` de `<link>` (pas d'import Vite : le CSS doit disparaître quand on quitte la page). Sinon `<style>` scoped dans les composants
- `/nouveautes` (`src/lib/data/news.js`) : seulement ce qui change l'expérience des joueurs ou des clients Pro. Pas d'entrée pour un changement purement technique

## Organisation du code

- **Taille des fichiers** : moins de 300 lignes par fichier (hors données statiques de `src/lib/data/`). Au-delà, découper avant d'ajouter du code
- **Où ranger quoi** (aucun fichier en vrac à la racine de `src/lib` ni de `src/lib/components`) :
  - `+page.svelte` assemble des composants, sans grosse logique ni gros bloc de styles. Pas de composant dans les dossiers de routes
  - `src/lib/components/<domaine>/` : composants d'un domaine (`card/`, `game/`, `salon/host/`, `admin/cards/`…), un composant = une responsabilité, avec ses styles scoped. Composants génériques dans `ui/`, coque du site (nav, menus) dans `layout/`
  - État d'une page riche (socket, nombreux `$state`) : classe dans un `.svelte.js` à côté des composants (ex : `game/gameSession.svelte.js`), les réactions socket dans un module séparé (`gameHandlers.js`, `salon/play/playerEvents.js`)
  - `src/lib/client/` : singletons navigateur (supabase, toast, notifications, push, thème)
  - `src/lib/shared/` : logique pure utilisée côté client et serveur, par domaine
  - `src/lib/data/` : contenus statiques (nouveautés, thèmes, offres Pro…)
  - `src/lib/server/services/<domaine>/` (`admin/`, `music/`, `notify/`, `rooms/`, `cards/`, `health/`) : accès BDD et logique métier. Les `+server.js` et `+page.server.js` restent fins (lecture des paramètres, appel du service, réponse)
- **Imports** : `$lib/…` dans les `.svelte` et les routes. Les `.js` de `src/lib` importent en relatif : `server.js` charge le code serveur avec Node pur, et vitest ne connaît pas l'alias `$lib`
- **Pas de duplication** : chercher un composant, un utilitaire ou une variable CSS existants avant d'en créer (ex : couleurs de rareté `--rc` dans `static/css/cards.css`)
- Toujours lire un fichier avant de le modifier

## Économiser des tokens : Graphify + Ponytail

- **Graphify** (graphe du code dans `graphify-out/`, ignoré par git) :
  - Pour comprendre une archi, trouver qui appelle quoi ou tracer un flux : `graphify query "<question>"` (ou `path "A" "B"`, `explain "X"`) **avant** de lire des fichiers ou lancer un agent Explore
  - Lire `graphify-out/GRAPH_REPORT.md` (god nodes, communautés) plutôt que parcourir le repo
  - Après de gros changements : `/graphify . --update` (code seul = AST, gratuit). Ne pas relancer l'extraction des docs/images sans demande (coûte des sous-agents)
  - Si absent : `uv tool install graphifyy` puis `/graphify .` en mode code seul
- **Ponytail** (actif par défaut, niveau `full`) : plus petit diff complet, réutiliser l'existant, pas de code « pour plus tard ». `/ponytail-review` avant une PR, `/ponytail-audit` pour chercher le code mort, `/ponytail-debt` pour lister les `shortcut:`

## Vidéos promo (TikTok, Reels, Shorts)

- Tout se passe sur la branche **`promo/memes`**, dans le worktree `C:\Users\Teamr\Documents\GitHub\ZIK-memes`, dossier `promo/montage/` (Remotion). Jamais de code promo sur `master` ni `develop`
- Suivre le skill Claude **`zik-montage`** : direction artistique, musiques validées, catalogue des formats déjà faits, méthode de rendu
- Une musique différente par vidéo (sons FR viraux ou connus), validée par l'utilisateur, ajoutée dans TikTok et jamais incrustée dans la vidéo à poster
- Prises de vue : pages publiques en lecture seule sur la prod, parties uniquement sur le staging ou en local derrière la passerelle en lecture seule (`scripts/gateway.mjs`)

## MCPs disponibles

- **Supabase** : inspecter la base. Écritures et migrations uniquement sur le staging, via `/migration`
- **Railway** : lire logs, métriques, déploiements. Aucune modification de `[PROD]` sans demande explicite
- **Stripe** : système de paiement (abonnements, factures), mode test hors prod
- **Notion** : tâches et doc projet
