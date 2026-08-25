# Nettoyage du contenu à faible valeur (refus AdSense) — design

**Date :** 2026-08-25
**Version cible :** 3.4.0
**Contexte :** AdSense a refusé zik-music.fr pour « Contenu à faible valeur informative ».

## Problème

Le sitemap expose environ 126 URL (comptage réel en base au 2026-08-25 ; les `limit(200)`
et `limit(365)` du code sont des plafonds, pas des volumes) :

| Type d'URL               | Nombre réel | Ce que voit un crawler non connecté                                                                                                                             |
| ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/room/[code]`           | 90          | Le même gabarit à chaque fois. Seuls le nom, l'emoji et la description changent ; le bloc « Comment jouer au blind test sur ZIK ? » est identique mot pour mot. |
| `/zikle/archives/[date]` | 21          | Un mur de login. Le corps de page se limite à « Zikle #N » et « Les jours passés sont réservés aux comptes ».                                                   |
| Pages à contenu réel     | 15          | `/`, `/docs`, `/vs/*`, `/nouveautes`, `/playlists`, `/classements`, `/salon`, pages légales.                                                                    |

Environ 88 % des pages indexables sont donc dupliquées ou vides. Le volume absolu reste
modeste — on n'est pas devant une ferme de contenu — mais la proportion est mauvaise et
c'est le facteur correctible le plus net.

Un second facteur pèse sans doute autant : le contenu réel de ZIK est le jeu, et il est
invisible pour un crawler, qui doit saisir un pseudo et lancer une partie pour voir quoi
que ce soit. La section 3 y répond partiellement pour les pages de room.

Les pages `/vs/*` sont du contenu original et factuel : elles ne sont pas en cause.
`/user/[username]` est déjà en `noindex`.

## Périmètre

Ce chantier ne touche à **aucun emplacement publicitaire** : ni `/room/[code]` ni
`/zikle/archives/[date]` n'ont jamais porté de slot, et toutes les pages qui en portent
aujourd'hui les conservent à l'identique.

Il n'ajoute **aucun contenu rédigé à la main** : tout le contenu nouveau est dérivé de
données déjà présentes en base.

Restent hors périmètre, pour une éventuelle spec ultérieure si Google refuse encore :
ouvrir publiquement les résultats des Zikle passés, et enrichir les pages de playlists.

## Changements

### 1. Sitemap — `src/routes/sitemap.xml/+server.js`

- Supprimer entièrement le bloc qui génère les URL `/zikle/archives/[date]`, ainsi que
  les imports `getAdminClient` et `todayParis` qui ne servent plus qu'à lui.
- Restreindre la requête `rooms` aux rooms officielles : ajouter `.eq("is_official", true)`
  au filtre existant sur `is_public`.
- `STATIC_PAGES` reste inchangé, y compris l'entrée `/zikle/archives` : la page index
  explique le concept du Zikle et garde une valeur propre.

Comptage en base au 2026-08-25 : 90 rooms publiques, dont **17 officielles**, toutes
pourvues d'une description. Le sitemap passe donc de ~126 à **32 URL**, toutes porteuses
de contenu.

### 2. `noindex` sur les pages sans contenu propre

**`/zikle/archives/[date]/+page.svelte`** — remplacer `<meta name="robots" content="index, follow" />`
par `content="noindex, follow"`. La page est un mur de login pour tout visiteur non
connecté ; le lien vers `/zikle` doit rester suivi, d'où `follow`.

**`/room/[code]/+page.svelte`** — rendre la directive conditionnelle :
`index, follow` quand `room.is_official` vaut vrai, `noindex, follow` sinon. Le `load`
de `+page.server.js` sélectionne déjà `is_official`, aucun changement côté serveur.

La balise `<link rel="canonical">` est conservée dans les deux cas : elle reste utile pour
consolider les variantes d'URL, même sur une page non indexée.

### 3. Différencier les pages de room

Les 17 rooms officielles forment 8 paires de quasi-doublons — « Rap FR » / « RAP FR -
Casual », « Années 2000 » / « Années 2000 - Casual », etc. Vérification en base : les deux
membres de chaque paire ont une description **rigoureusement identique**, seul `game_mode`
diffère (`classic` pour la principale, `qcm` pour la « Casual »).

Décision : **garder les 17 indexées et différencier leur contenu** par de la donnée propre
à chaque room. Le bloc `.room-seo-block` actuel — identique mot pour mot sur les 90 pages —
est supprimé, CSS compris, et remplacé par les blocs suivants.

Ces blocs s'affichent sur **toutes** les rooms, pas seulement les officielles : la donnée
existe pour chacune, et une room de joueur en `noindex` reste une page vue par des humains
qui gagne à être informative.

#### 3.1 « Comment se joue cette room » — deux variantes selon `game_mode`

Deux textes distincts, choisis sur `room.game_mode` :

- **`classic`** — saisie libre du titre et de l'artiste, orthographe tolérée, points
  attribués à la vitesse de réponse, partie comptabilisée au classement ELO.
- **`qcm`** — quatre propositions par manche, aucune saisie, accessible sans connaître
  l'orthographe exacte.

Cela sépare enfin chaque room de sa variante « Casual ».

#### 3.2 Fiche technique de la room

Chiffres lus en base, différents d'une room à l'autre : nombre de manches
(`rooms.max_rounds`), durée d'une manche (`rooms.round_duration`), et nombre de titres de
la playlist associée (`custom_playlists.track_count` via `rooms.playlist_id`).

Si `playlist_id` est nul, le nombre de titres est simplement omis — pas de valeur de
remplacement.

#### 3.3 Artistes les plus présents

Les dix artistes les plus fréquents de la playlist de la room, avec leur nombre de titres.

**Interdit : ne jamais afficher les titres.** La tracklist est la réponse du blind test ;
seuls les noms d'artistes sont exposés. Sur une playlist de cent titres et plus, c'est un
repère sur le contenu de la room, pas un spoiler exploitable. Arbitrage validé par Theo le
2026-08-25.

Implémentation : `custom_playlist_tracks` ne se prête pas à un `GROUP BY` via supabase-js.
Sélectionner la seule colonne `artist` pour la `playlist_id` de la room, puis agréger côté
serveur dans le `load`. Sondage du 2026-08-25 : la playlist « RAP FR » compte 586 titres et
la lecture passe avec le client anon, la RLS ne bloque pas.

**Limite connue.** Les deux membres d'une paire pointent sur la **même** `playlist_id`
(vérifié en base pour les 8 paires). Ce bloc et le nombre de titres seront donc identiques
entre « Rap FR » et « RAP FR - Casual ». La différenciation repose sur les trois autres
éléments, qui diffèrent réellement : le texte des règles, le nombre de manches (10 en
classique contre 20 en QCM) et le classement hebdomadaire, propre au code de la room.
La duplication résiduelle est assumée : elle porte sur une liste de dix noms, non sur le
corps de la page.

#### 3.4 Classement hebdomadaire de la room

Appeler la fonction Postgres existante `weekly_leaderboard_by_room(p_room_code)` via
`supabase.rpc()` et afficher le top 10 : rang, pseudo, score.

C'est le bloc qui a le plus de valeur : contenu unique par room, renouvelé chaque semaine
sans intervention. Si la fonction ne renvoie aucune ligne — room jamais jouée cette
semaine — le bloc entier est masqué plutôt que d'afficher un tableau vide.

#### 3.5 Chargement et cache

Ces trois requêtes supplémentaires (playlist, artistes, classement) rejoignent le `load`
de `+page.server.js`, où elles s'exécutent en parallèle via `Promise.all`. Chacune est
tolérante à l'échec : une erreur masque son bloc et laisse la page se rendre.

Poser un `setHeaders({ "cache-control": "public, max-age=600" })` : ce contenu n'a pas
besoin d'être frais à la seconde et ces pages sont crawlées en rafale.

**Vérification RLS à faire à l'implémentation.** La policy SELECT de
`custom_playlist_tracks` autorise la lecture si la playlist liée est `is_official`,
`is_public` ou rattachée à une room. Le `load` utilise le client anon exporté par
`src/lib/server/config.js` : confirmer que la lecture passe bien pour les 17 rooms
officielles avant de considérer le bloc 3.3 comme acquis.

#### 3.6 Lien vers `/docs`

Le lien vers `/docs` que contenait l'ancien bloc est conservé, sous la forme d'une ligne
« Comment ça marche ? » placée à côté du lien « Voir toutes les rooms » existant.

### 4. Version

Passer de `3.3.2` à `3.4.0`. Occurrences à mettre à jour :

- `package.json` ligne 3 (`"version"`)
- `src/routes/(site)/+layout.svelte` ligne 227 (`v3.3.2` dans le pied de page)
- `src/lib/news.js` — nouvelle entrée en tête de `NEWS`, tag `Amélioration`, version
  `3.4.0`

**Piège :** `package.json` ligne 20 contient `"node-fetch": "^3.3.2"`. C'est une
coïncidence de numéro, à ne surtout pas modifier — un rechercher-remplacer global sur
`3.3.2` casserait la dépendance.

Les paramètres `?v=3.3.2` sur `/css/game.css` et `/css/salon.css` invalident le cache
immutable de ces fichiers. Aucun des deux n'est modifié ici, donc ils restent en l'état.

## Vérification

1. `npm run lint` passe.
2. `/sitemap.xml` en local ne contient plus aucune URL `/zikle/archives/<date>` et ne liste
   que des rooms officielles.
3. Le code source d'une page `/room/<code>` non officielle contient `noindex, follow` ;
   celui d'une room officielle contient `index, follow`.
4. `/zikle/archives/<date>` contient `noindex, follow`.
5. Une page `/room/<code>` ne contient plus la chaîne « Comment jouer au blind test ».
6. Deux pages d'une même paire — par exemple `KDP2G9` (Rap FR, `classic`) et `U5N9N9`
   (RAP FR - Casual, `qcm`) — présentent bien deux textes de règles différents.
7. Une page de room officielle affiche un nombre de titres, une liste d'artistes, et le
   classement hebdomadaire s'il existe des résultats.
8. **Aucun titre de morceau n'apparaît** dans le code source d'une page de room.

## Après déploiement

Demander un nouvel examen dans le dashboard AdSense, puis soumettre le sitemap mis à jour
dans la Search Console pour accélérer la désindexation des pages retirées.

Google ne motive pas ses décisions au-delà du libellé générique : rien ne garantit que ce
chantier suffise. Il est de toute façon utile au référencement indépendamment d'AdSense, et
il permet de savoir si les 111 pages dupliquées ou vides étaient à elles seules la cause du
refus avant d'engager un chantier plus lourd.
