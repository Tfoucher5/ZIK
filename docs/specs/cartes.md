# Cartes musicales - spécification

- **Date :** 2026-10-04 (v3, après deux relectures de Theo)
- **Statut :** spec, rien n'est codé
- **Périmètre MVP :** carte gagnée en fin de manche (classique et QCM), visionneuse de carte, page collection rangée par artiste puis album, 6 raretés, sets artiste et album
- **Hors MVP :** deck, bonus en partie, sets thématiques

## Principe directeur

Les cartes sont la récompense du blind test, pas une app à côté. On ne gagne
une carte qu'en trouvant un titre en jeu ; la collection donne envie de
rejouer pour compléter les artistes et les albums.

## Décisions déjà prises

| #   | Décision                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Rare = très écouté.** Plus un titre est écouté, plus sa carte est rare. Les gens veulent les gros tubes.                                                                             |
| D2  | **Popularité = Deezer.** Plus de trafic que Last.fm et une audience française, comme celle de ZIK. YouTube écarté (on ne sait jamais si on compte le clip, les lyrics ou un reupload). |
| D3  | **Rareté figée** : calculée une fois, ne descend jamais. Rien de ce qui se passe dans ZIK ne la modifie.                                                                               |
| D4  | **6 raretés** : Commune (gris), Peu commune (vert), Rare (bleu), Épique (violet), Légendaire (doré), Mythique (rose pailleté).                                                         |
| D5  | **Les hautes raretés demandent un exploit** (vitesse, nombre de joueurs) en plus d'être premier : sinon les tubes, qui passent le plus, seraient les plus faciles.                     |
| D6  | **Le QCM compte** : les joueurs moins connaisseurs doivent pouvoir collectionner aussi.                                                                                                |
| D7  | **Départ en cours de partie** : le joueur garde ses cartes s'il a joué au moins la moitié des manches, il les perd sinon.                                                              |
| D8  | **Minimum de joueurs** pour gagner une carte, et des garde-fous partout, **sans jamais pénaliser un joueur rapide ou acharné**.                                                        |
| D9  | **Pas de plafond** d'obtention (ni par jour, ni par partie).                                                                                                                           |
| D10 | **Rangement par artiste, puis par album.**                                                                                                                                             |
| D11 | **Un seul composant de carte réutilisable partout**, plus une visionneuse pour regarder une carte en grand. Des cartes très soignées : c'est elles qui donnent envie.                  |

---

## 0. Ce que le code actuel impose

| #   | Constat                                                                                                                                                                                                 | Conséquence pour les cartes                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| C1  | Le catalogue `tracks` (clé `norm_key = artiste\|titre`) est la source unique des titres des playlists. `buildTrackFromRow` porte `id` = `tracks.id` jusqu'à `room.game.currentTrack`.                   | Une carte s'accroche au catalogue.                                                                                       |
| C2  | Les rooms éphémères (`POST /api/rooms/custom`) construisent leurs titres avec `buildTrack` **sans `id`**.                                                                                               | Pas de carte dans une room éphémère.                                                                                     |
| C3  | `tracks` ne stocke ni album, ni année, ni popularité. `external_id` est un id Deezer **ou** Spotify selon `source`.                                                                                     | Étape d'enrichissement (6.4).                                                                                            |
| C4  | Le catalogue a des doublons : `norm_key` ne normalise que casse et espaces (« Titre », « Titre - Remastered 2011 », « Titre (feat. X) » = trois lignes).                                                | Table `cards` dédoublonnée ; plusieurs `tracks` pointent la même carte.                                                  |
| C5  | `game.firstFullFinder` existe : premier à avoir tout trouvé (classique) ou à avoir bien répondu (QCM), affiché en fin de manche (« 🏆 1er »).                                                           | Le candidat à la carte est ce joueur ; on garde l'ordre complet pour passer au suivant si le premier n'est pas éligible. |
| C6  | **`join_room` fait confiance au `userId` envoyé par le client.** Aucun JWT vérifié sur le socket de jeu (seul `presence:hello` le fait).                                                                | **Prérequis bloquant** : sans ça, n'importe qui joue sous le compte d'un autre.                                          |
| C7  | `saveGameResults` est le point unique de fin de partie (fin normale **et** `adminEndGame`), protégé par `_ended`. Le départ en cours de partie passe par le timer de `leaveRoom` → `saveMidGamePlayer`. | Attribution définitive branchée à ces deux endroits.                                                                     |
| C8  | `lastRoundData` part au client pendant la manche ; la règle anti-spoiler interdit d'y mettre artiste ou titre.                                                                                          | Aucune info de carte avant `round_end` : une Mythique annoncée trahirait un tube.                                        |
| C9  | `submit_guess` n'a aucune limite de débit.                                                                                                                                                              | Limite de débit (G8), réglée pour ne jamais gêner un humain.                                                             |
| C10 | Les layouts de `/game` et `/salon/*` sont réinitialisés (`@`) et ne reçoivent pas les CSS du layout `(site)` ; les CSS de `static/css/` sont en cache immuable avec un `?v=`.                           | Les variables de rareté doivent être chargées dans les deux layouts.                                                     |
| C11 | Le site utilise Barlow et Barlow Condensed (`base.css`), et un système de 6 thèmes (`theme.css`, `data-theme`).                                                                                         | Les cartes gardent ces polices (rien de plus à charger) et doivent rester lisibles sur les 6 thèmes.                     |

---

## 1. Obtention des cartes

### Règle de base

- **Une carte = un titre.** L'artiste et l'album servent au rangement.
- La carte de la manche revient au **premier joueur éligible** dans l'ordre
  des trouveurs :
  - mode classique : premier à avoir tout trouvé (artiste, titre, feats,
    réponses supplémentaires) ;
  - mode QCM : premier à avoir donné la bonne réponse.
- Si le premier n'est pas éligible (invité, condition non remplie), la carte
  passe au suivant. Si personne ne l'est, pas de carte : elle reste à prendre
  une prochaine fois.
- Un **invité** premier voit la carte avec « Crée un compte pour gagner tes
  cartes » (levier de conversion).

Il faut garder l'**ordre** des trouveurs : `game.fullFinders = []`, alimenté
à côté de `firstFullFinder` dans `submit_guess` et `submit_choice`, avec le
temps de réponse de chacun.

### Conditions d'exploit par rareté

| Rareté      | Temps max (classique) | Temps max (QCM) | Comptes actifs dans la room |
| ----------- | --------------------- | --------------- | --------------------------- |
| Commune     | -                     | -               | 2                           |
| Peu commune | -                     | -               | 2                           |
| Rare        | -                     | -               | 2                           |
| Épique      | 15 s                  | 6 s             | 3                           |
| Légendaire  | 10 s                  | 4 s             | 3                           |
| Mythique    | 6 s                   | 3 s             | 4, hors playlist du joueur  |

- Temps = délai entre `round_start_sync` (`game.startTime`) et la réponse
  qui complète le titre.
- Le QCM a des temps plus courts : avec 4 choix, la bonne réponse se donne
  bien plus vite qu'en tapant.
- Si la condition n'est pas remplie, le joueur voit ce qui a manqué :
  « Mythique ratée - il fallait trouver en moins de 6 s (8,2 s) ». Ça donne
  envie de revenir.

Ces conditions **favorisent** les joueurs rapides : ce sont eux qui
décrochent les hautes raretés. Valeurs en constantes serveur.

### Pas de doublons (décision du 2026-10-06)

Une carte se possède une fois : la collection est un objectif à compléter,
sans autre enjeu. Un trouveur qui possède déjà la carte la laisse au suivant
dans l'ordre des trouveurs, à condition que celui-ci remplisse les
conditions d'exploit. Le premier voit « Déjà dans ta collection ».
`user_cards.copies` reste en base, toujours à 1. Pas d'échanges.

### Cartes provisoires et départ en cours de partie

Une carte gagnée en manche est **provisoire**. Elle devient définitive :

- en fin de partie (`saveGameResults`, fin normale ou coupée par l'admin) si
  le joueur est encore dans la room ;
- à son départ (timer de `leaveRoom`) s'il a été présent sur **au moins la
  moitié des manches** (`ceil(maxRounds / 2)`, en comptant les manches où il
  était là en fin de manche).

Sinon ses cartes provisoires sont perdues. Message au gain : « Reste jusqu'à
la manche 5 pour la garder », puis « Carte sécurisée » une fois le seuil
passé.

### Pas d'argent, pas de hasard payant

- Aucune carte ne s'achète, ni directement ni via booster, monnaie ou
  abonnement. Aucun lien avec `/soutenir` ni avec ZIK Pro.
- Aucun tirage aléatoire : la carte dépend du titre joué et de la
  performance du joueur.
- Aucun échange ni revente : une carte revendable contre de l'argent
  ferait entrer ZIK dans le régime des JONUM (loi SREN 2024).

### Garde-fous

**Règle de conception : un garde-fou bloque sur la structure de la partie
(qui joue, combien, sur quelle playlist), jamais sur la performance.** La
vitesse et le volume de réponses ne retirent jamais une carte
automatiquement : ils alimentent des signaux que l'admin regarde. Un joueur
qui trouve en 1,2 s parce qu'il connaît le titre par cœur doit avoir sa
carte.

Toutes les vérifications se font côté serveur, au moment de désigner le
gagnant dans `endRound`. Aucune donnée du client n'est crue.

**Bloquants (structure de la partie)**

| #   | Garde-fou                                                                                                                                                                             | Contre quoi                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| G1  | `join_room` vérifie le JWT (`verifyToken`). Sans token valide : invité, donc pas de carte.                                                                                            | Jouer sous le compte d'un autre (C6).                      |
| G2  | Au moins **2 comptes actifs** dans la room (plus pour les hautes raretés). « Actif » = a répondu au moins une fois sur les 3 dernières manches, et n'est pas en délai de déconnexion. | Farm en solo, rooms remplies de comptes qui ne jouent pas. |
| G3  | Plusieurs comptes derrière la **même IP** ne comptent que pour un dans le minimum de joueurs. Ils gagnent tous normalement, ils ne débloquent juste pas le minimum à eux seuls.       | Une personne avec plusieurs comptes sur une machine.       |
| G4  | Room dont la playlist appartient au joueur : il lui faut **2 autres comptes actifs**, et pas de Mythique.                                                                             | Playlist perso de tubes connus par cœur.                   |
| G5  | Un titre ajouté à une playlist depuis **moins de 24 h** ne donne pas de carte dans cette playlist.                                                                                    | Ajouter un titre, le farmer, le retirer.                   |
| G6  | Partie de **5 manches minimum**.                                                                                                                                                      | Parties de 3 manches relancées en boucle.                  |
| G7  | Pas de carte dans les rooms éphémères (C2) ni sur une manche sautée par l'admin.                                                                                                      |                                                            |

**Non bloquants (performance)**

| #   | Garde-fou                                                                                                                                                                                   | Effet sur le joueur                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| G8  | `submit_guess` : au plus **4 réponses par seconde** par socket. Les réponses en trop sont ignorées.                                                                                         | Aucun : personne ne tape 4 réponses par seconde.            |
| G9  | Signal admin quand un titre est complété en moins de 1 s (classique) ou quand un joueur dépasse 40 réponses dans une manche. Ligne dans `card_signals`, **la carte est donnée quand même**. | Aucun.                                                      |
| G10 | Un compte neuf (moins de 24 h) gagne ses cartes normalement, mais elles s'affichent « en attente » jusqu'aux 24 h, puis arrivent dans la collection.                                        | Petite attente pour un nouveau compte, aucune carte perdue. |

**Après coup**

| #   | Garde-fou                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G11 | Chaque attribution est journalisée (`card_grants` : partie, manche, temps, comptes actifs, IP hachée). Aucune carte sans ligne de journal.                                                                                                        |
| G12 | Écran admin : signaux, comptes qui gagnent toujours avec les mêmes partenaires, taux d'Épiques et plus anormaux. Révocation d'une carte ou de toutes les cartes d'un compte, journalisée dans `admin_audit_log`. **Aucune sanction automatique.** |
| G13 | Toutes les écritures passent par des fonctions SQL `security definer` appelées par le serveur ; aucune policy d'écriture côté client.                                                                                                             |

---

## 2. Contenu d'une carte

### Données et sources

Une seule source externe : **Deezer**, déjà utilisé par le jeu.

| Champ                 | Source                                                   | Note                                                                              |
| --------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Titre, artiste, feats | `tracks` (canonique, pas les `custom_title` de playlist) | Les surcharges de playlist (nom de film…) ne remontent pas sur la carte.          |
| Artiste (rangement)   | Deezer `artist.id`                                       | Identifiant stable pour regrouper.                                                |
| Album                 | Deezer `album.id`, choisi parmi les versions (6.4)       | Album studio ou EP en priorité, jamais une compilation.                           |
| Année                 | La plus ancienne `release_date` parmi les versions       | Évite « Bohemian Rhapsody, 2011 » (remaster).                                     |
| Genre                 | Deezer `album.genres` (premier genre)                    | Filtres de la collection.                                                         |
| Pochette              | Deezer `album.cover_xl` (1000 px)                        | Liée, pas copiée, comme le fait déjà le jeu.                                      |
| Popularité            | Deezer `track.rank`                                      | Fixe la rareté (section 3). Affichée en note sur 100 (`rank / 10 000`, ex. 98,5). |
| Fans de l'artiste     | Deezer `artist.nb_fan`                                   | Vrai compteur (The Weeknd : 14,7 M). Affiché, ne sert pas à la rareté.            |
| ISRC                  | Deezer `track.isrc`                                      | Sert au dédoublonnage et au lien avec les titres Spotify.                         |
| Taux de réussite ZIK  | `track_stats`                                            | Affiché à partir de 20 joueurs exposés, sinon « - ».                              |
| Obtention             | `user_cards.first_obtained_at`                           |                                                                                   |
| Premier à l'avoir     | `cards.first_owner_id`                                   | Premier compte à l'avoir obtenue. Ne change jamais.                               |
| Numéro                | `cards.number`                                           | Ordre de création, « n° 42 ».                                                     |

### Ce que vaut le `rank` Deezer

Ce n'est **pas un nombre d'écoutes** : Deezer ne publie aucun compteur
d'écoutes par titre. `rank` est un indice de popularité calculé par Deezer,
de 0 à 1 000 000, qui reflète surtout l'écoute **récente**. C'est le meilleur
signal public disponible, et il est mesuré sur une audience largement
française.

Relevés réels du 2026-10-04 (meilleure version de chaque titre) :

| Titre                                 | `rank`  |
| ------------------------------------- | ------- |
| The Weeknd - Blinding Lights          | 984 833 |
| Ed Sheeran - Shape of You             | 968 208 |
| Queen - Bohemian Rhapsody             | 958 949 |
| Louise Attaque - J't'emmène au vent   | 956 347 |
| Stromae - Alors on danse              | 952 441 |
| Daft Punk - Veridis Quo               | 928 445 |
| Jul - Tchikita                        | 926 525 |
| Angèle - Balance ton quoi             | 904 667 |
| MGMT - Kids                           | 900 466 |
| Aya Nakamura - Djadja                 | 878 016 |
| Sexion d'Assaut - Avant qu'elle parte | 817 466 |
| Radiohead - Weird Fishes / Arpeggi    | 810 854 |
| Christophe Maé - Il est où le bonheur | 807 574 |
| Mylène Farmer - Libertine             | 761 586 |
| The Cure - Lovesong                   | 748 254 |
| Indochine - 3e sexe                   | 690 426 |

Deux enseignements :

- L'échelle est **très tassée en haut** : tous les tubes sont entre 750 000
  et 985 000. Les seuils de rareté doivent donc être serrés dans cette zone.
- Les versions dérivées (live, remix, remaster) ont un `rank` bien plus bas
  que l'original (Blinding Lights remix : 468 331). Il faut toujours prendre
  la meilleure version (I2).

### Point juridique

- **Aucune photo d'artiste** : on n'utilise jamais `artist.picture`, même si
  l'API la renvoie. Droit à l'image, et photos souvent sous droits de
  photographe.
- Pochettes affichées comme dans le jeu : URL Deezer liée, pas hébergée chez
  nous. Le design de la carte encadre la pochette, il ne la modifie pas (pas
  de recadrage déformant, pas de texte imprimé dessus, pas de filtre qui la
  dénature). Les effets de lumière passent **au-dessus**, dans une couche
  séparée. Seule exception : l'étiquette du disque reprend la pochette en
  rond, comme les étiquettes illustrées des vrais vinyles.
- Le partage (image PNG de la carte) affiche « zik-music.fr » ; la carte
  affichée porte aussi l'adresse en petit au recto et au verso.
- Mention en pied de la collection et au verso de la carte : « Données et
  pochettes : Deezer ».

---

## 3. Rareté

### Formule

Une seule entrée : `p` = **`rank` Deezer maximum** parmi les versions qui
correspondent au titre (voir I2).

```
rareté(p) =
  Mythique     si p ≥ S5
  Légendaire   si S4 ≤ p < S5
  Épique       si S3 ≤ p < S4
  Rare         si S2 ≤ p < S3
  Peu commune  si S1 ≤ p < S2
  Commune      si p < S1
```

### Seuils

Seuils **absolus**, fixés une fois au lancement puis gravés en constantes
(« barème v1 »). Ils ne suivent pas la croissance du catalogue.

Seuils calibrés le 2026-10-05 sur le catalogue enrichi (12 857 cartes), aux
centiles des parts visées (les seuils de départ, 700 k à 975 k, donnaient 65 % de Communes) :

| Rareté      | Couleur       | `rank` Deezer     | Exemples relevés                                         | Part visée |
| ----------- | ------------- | ----------------- | -------------------------------------------------------- | ---------- |
| Commune     | gris          | < 495 000         | Indochine - 3e sexe                                      | ~35 %      |
| Peu commune | vert          | 495 000 - 679 999 | Mylène Farmer - Libertine, The Cure - Lovesong           | ~27 %      |
| Rare        | bleu          | 680 000 - 804 999 | Aya Nakamura - Djadja, Christophe Maé, Radiohead         | ~20 %      |
| Épique      | violet        | 805 000 - 909 999 | Daft Punk - Veridis Quo, Jul - Tchikita, Angèle, MGMT    | ~12 %      |
| Légendaire  | doré          | 910 000 - 979 999 | Shape of You, Bohemian Rhapsody, Louise Attaque, Stromae | ~5 %       |
| Mythique    | rose pailleté | ≥ 980 000         | Blinding Lights                                          | ~1 %       |

Calibrage après enrichissement :

```sql
select rarity, count(*), round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from cards
group by rarity
order by min(deezer_rank);
```

Les playlists ZIK étant surtout des tubes, la distribution réelle sera
probablement plus haute que celle des exemples. Si les parts s'éloignent trop
de la cible, on ajuste **les seuils avant l'ouverture**, jamais après.

### Rareté figée, avec une exception pour les sorties récentes

- **Règle générale** : la rareté est figée à la création de la carte et ne
  descend **jamais**.
- **Exception** : un titre sorti depuis moins de 12 mois a une rareté
  **provisoire**, réévaluée chaque mois **à la hausse seulement**, puis figée
  à 12 mois. Sans ça, un tube ajouté au catalogue la semaine de sa sortie,
  avant son pic, resterait bas pour toujours.

Une carte provisoire porte la mention « en ascension » ; quand elle monte,
ses possesseurs reçoivent une notification (« Ta carte X est passée
Épique »).

Seule autre exception : **correction admin** quand l'enrichissement a pris
le mauvais titre. Elle peut baisser une rareté, pour tous les possesseurs,
et laisse une ligne dans `admin_audit_log`.

### Incohérences possibles et traitement

| #   | Incohérence                                                                                                                                                       | Traitement                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Le `rank` mesure l'écoute **récente** : un classique très connu mais moins streamé aujourd'hui sort plus bas qu'il ne « mérite » (Indochine - 3e sexe : Commune). | Assumé et cohérent avec D1 : on mesure l'écoute, pas la notoriété historique. Le gel évite au moins qu'il descende encore.                                                                                                   |
| I2  | Versions dérivées (live, remix, remaster) avec un `rank` bien plus bas que l'original.                                                                            | On prend le `rank` **maximum** parmi les résultats Deezer dont artiste et titre nettoyés (`cleanString`) correspondent.                                                                                                      |
| I3  | Le même morceau existe en plusieurs lignes `tracks` (C4).                                                                                                         | Une carte par (artiste Deezer, titre nettoyé) ; `tracks.card_id` → carte.                                                                                                                                                    |
| I4  | Titre saisonnier : un chant de Noël enrichi en décembre, au pic, serait figé Mythique.                                                                            | Les cartes créées entre le 1er décembre et le 6 janvier sont provisoires, comme les sorties récentes, et leur rareté est recalculée mi-janvier (cette fois à la baisse possible, la carte n'ayant pas encore pu être figée). |
| I5  | Titre absent de Deezer (import manuel, titre retiré, BO).                                                                                                         | Pas de carte (`tracks.card_id` nul), la manche se joue normalement.                                                                                                                                                          |
| I6  | Mauvaise correspondance (reprise, karaoké, homonyme).                                                                                                             | Correspondance exigée sur artiste **et** titre nettoyés, sinon pas de carte. Bouton « signaler la carte » (table `reports`) et correction admin.                                                                             |
| I7  | Les hautes raretés sont les titres les plus joués dans ZIK, donc les plus faciles.                                                                                | Conditions d'exploit (section 1).                                                                                                                                                                                            |
| I8  | L'écart entre deux raretés hautes tient à peu de chose (Légendaire à 979 999, Mythique à 980 000).                                                                | Inévitable avec des seuils ; le gel garantit au moins que personne ne voit sa carte changer de catégorie.                                                                                                                    |

---

## 4. Collection et sets

### Rangement : artiste, puis album, puis titre

La collection se navigue en entonnoir :

1. **Artistes** : grille des artistes dont on a au moins une carte (nom,
   pochette de l'album le plus représenté, jamais de photo), avec la
   progression « 7 / 23 cartes ».
2. **Artiste** : ses albums (pochette, année, « 3 / 5 »), plus une rangée
   « Singles et hors album ».
3. **Album** : les cartes de l'album, possédées en clair, manquantes en
   silhouette.

Vue « Toutes mes cartes » à côté, avec filtres rareté (6 pastilles), genre,
décennie, recherche artiste, et tri par date
d'obtention, rareté ou artiste.

Cartes manquantes en silhouette seulement, sans titre : sinon la collection
devient l'antisèche des playlists.

Route : `/collection` (privée) ; onglet « Cartes » dans `/user/[username]`
(masqué si `profiles.is_private`).

### Sets

| Type    | Contenu                                                                                                 | Phase |
| ------- | ------------------------------------------------------------------------------------------------------- | ----- |
| Artiste | Toutes les cartes du catalogue ZIK de cet artiste Deezer. Créé dès 3 cartes.                            | MVP   |
| Album   | Toutes les cartes rattachées au même album Deezer (album ou EP, jamais compilation). Créé dès 3 cartes. | MVP   |
| Thème   | Fait à la main par l'admin (« Années Star Ac », « Génériques de dessins animés »).                      | 4     |

Les sets contiennent **les titres présents dans ZIK**, pas la discographie
complète : on ne peut gagner une carte que si le titre passe en jeu.

Un set suit le catalogue : un nouveau titre de l'album le fait grandir
(`3/4` devient `3/5`). Un set terminé **reste terminé**, avec un badge
« + 1 nouvelle carte ».

### Récompense d'un set terminé

Pas de monnaie, pas de carte bonus.

- Album terminé : badge « Disque d'or » avec la pochette, affichable sur le
  profil (même mécanique que `featured_achievements`), +100 XP.
- Artiste terminé : badge « Discographie », +250 XP.
- Notification aux amis : « pseudo a complété l'album Random Access
  Memories ».

---

## 5. Utilisation en jeu (phase 3, hors MVP)

### Room « joue avec ton deck »

- Le joueur choisit 20 à 100 cartes possédées ; ZIK génère une playlist
  privée à partir de leurs `tracks`.
- **Le propriétaire du deck ne gagne aucune carte** dans sa room deck.
- Usage visé : **défier un ami avec son deck**. L'ami peut gagner les cartes,
  avec les garde-fous habituels.

### Bonus en partie

Recommandation : **cosmétique uniquement**. Pastille « dans ta collection »
en fin de manche. Pas de bonus de points : ça fausserait l'ELO et les
classements.

---

## 6. Technique

### 6.1 Tables Supabase

Toutes en RLS, écriture **uniquement** via fonctions `security definer`
appelées par le serveur (G13).

```sql
create table public.card_artists (
  deezer_id   bigint primary key,
  name        text not null,
  nb_fan      int,
  created_at  timestamptz not null default now()
);

create table public.card_albums (
  deezer_id   bigint primary key,
  artist_id   bigint not null references public.card_artists(deezer_id),
  title       text not null,
  record_type text,                          -- album | ep | single
  year        smallint,
  genre       text,
  cover_url   text,
  dominant_color text,                       -- teinte de fond de la carte (6.5)
  created_at  timestamptz not null default now()
);
create index card_albums_artist_idx on public.card_albums (artist_id);

create table public.cards (
  id                uuid primary key default gen_random_uuid(),
  number            int generated always as identity unique,
  deezer_track_id   bigint not null,
  artist_id         bigint not null references public.card_artists(deezer_id),
  album_id          bigint references public.card_albums(deezer_id),
  title_key         text not null,           -- cleanString(titre)
  title             text not null,
  artist            text not null,           -- affiché, avec feats
  year              smallint,
  isrc              text,
  deezer_rank       int not null,
  rarity            text not null check (rarity in
                      ('common','uncommon','rare','epic','legendary','mythic')),
  rarity_scale      smallint not null default 1,      -- barème v1
  rarity_locked_at  timestamptz,             -- nul tant que la rareté est provisoire
  first_owner_id    uuid references public.profiles(id) on delete set null,
  first_owned_at    timestamptz,
  created_at        timestamptz not null default now(),
  unique (artist_id, title_key)
);
create index cards_album_idx  on public.cards (album_id);
create index cards_rarity_idx on public.cards (rarity);
create index cards_provisional_idx on public.cards (created_at) where rarity_locked_at is null;

alter table public.tracks
  add column card_id uuid references public.cards(id) on delete set null,
  add column card_checked_at timestamptz;
create index tracks_card_idx on public.tracks (card_id);

-- G5 : vérifier que custom_playlist_tracks.created_at existe toujours
-- après la migration catalogue, sinon l'ajouter.

create table public.user_cards (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  card_id           uuid not null references public.cards(id) on delete cascade,
  copies            int not null default 1 check (copies >= 1),
  first_obtained_at timestamptz not null default now(),
  last_obtained_at  timestamptz not null default now(),
  visible_at        timestamptz not null default now(),   -- G10 : compte neuf
  primary key (user_id, card_id)
);
create index user_cards_card_idx on public.user_cards (card_id);
create index user_cards_user_date_idx on public.user_cards (user_id, first_obtained_at desc);

create table public.card_grants (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  card_id         uuid not null references public.cards(id) on delete cascade,
  game_id         uuid references public.games(id) on delete set null,
  room_id         text not null,
  round           smallint not null,
  mode            text not null check (mode in ('classic','qcm')),
  answer_ms       int not null,
  active_accounts smallint not null,
  ip_hash         text not null,
  is_new          boolean not null,
  status          text not null default 'pending'
                    check (status in ('pending','granted','lost','revoked')),
  created_at      timestamptz not null default now()
);
create index card_grants_user_idx on public.card_grants (user_id, created_at desc);
create index card_grants_game_idx on public.card_grants (game_id);

create table public.card_signals (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  grant_id   bigint references public.card_grants(id) on delete cascade,
  reason     text not null,                -- very_fast | many_guesses
  details    jsonb,
  reviewed   boolean not null default false,
  created_at timestamptz not null default now()
);
create index card_signals_open_idx on public.card_signals (created_at desc) where not reviewed;

create table public.track_stats (
  track_id        uuid primary key references public.tracks(id) on delete cascade,
  rounds_played   int not null default 0,
  players_exposed int not null default 0,
  found_full      int not null default 0,
  last_played_at  timestamptz
);

create table public.card_sets (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('artist','album','theme')),
  key        text not null,                -- id Deezer artiste/album, slug thème
  name       text not null,
  cover_url  text,
  card_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, key)
);

create table public.card_set_items (
  set_id  uuid not null references public.card_sets(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  primary key (set_id, card_id)
);
create index card_set_items_card_idx on public.card_set_items (card_id);

create table public.user_card_sets (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  set_id       uuid not null references public.card_sets(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, set_id)
);
```

RLS en lecture :

- `card_artists`, `card_albums`, `cards`, `card_sets`, `card_set_items`,
  `track_stats` : lecture publique.
- `user_cards`, `user_card_sets` : propriétaire, ou profil non privé (même
  règle que `user_achievements`) ; les cartes dont `visible_at` est futur ne
  sont visibles que du propriétaire.
- `card_grants`, `card_signals` : admin seulement.

Fonctions SQL (security definer, `revoke` public comme pour Zikle) :

- `record_round_stats(p_track_id, p_exposed, p_found)`.
- `card_pending(p_grant jsonb)` : ligne `card_grants` en `pending`.
- `card_settle(p_game_id, p_user_id, p_keep boolean)` : passe les lignes
  `pending` en `granted` (insertion `user_cards` si absente,
  `first_owner_id` si nul, sets terminés) ou en `lost`. Retourne les cartes
  et les sets terminés. Idempotente.
- `card_revoke(p_user_id, p_card_id)` : admin, journalisée.
- `attach_card_to_sets(p_card_id)` : rattache aux sets artiste et album,
  crée le set à 3 cartes.

### 6.2 Où brancher l'attribution dans le flux Socket.io

Tout se passe dans `src/lib/server/socket/game/core.js`.

| Étape                     | Endroit                                                               | Ce qui change                                                                                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identité (G1)             | `join_room`                                                           | Le client envoie son access token ; `verifyToken` donne le `userId` et la date de création du compte. IP lue sur `socket.handshake` (`x-forwarded-for` derrière le proxy), hachée.                                                                                                                                           |
| Carte du titre            | `TRACK_ROW_SELECT` (`playlist.js`)                                    | Ajouter `card_id, cards(id, rarity, …)` dans la jointure `tracks`. `buildTrackFromRow` range ça dans `track.card`, **jamais copié dans `lastRoundData`** (C8).                                                                                                                                                               |
| Débit (G8)                | `submit_guess`                                                        | Horodatages des dernières réponses par joueur ; au-delà de 4 par seconde, réponse ignorée. Compteur de réponses de la manche pour G9.                                                                                                                                                                                        |
| Activité (G2)             | `submit_guess`, `submit_choice`                                       | `player.lastAnswerRound = game.currentRound`.                                                                                                                                                                                                                                                                                |
| Ordre des trouveurs       | `submit_guess` (bloc `allMainFound`), `submit_choice` (bonne réponse) | `game.fullFinders.push({ name, ms })` à côté de `firstFullFinder`. Remis à `[]` dans `startNextRound`.                                                                                                                                                                                                                       |
| Présence (D7)             | `endRound`                                                            | `player.roundsPresent++` pour chaque joueur sans `_dcTimer`.                                                                                                                                                                                                                                                                 |
| Désigner le gagnant       | `endRound`                                                            | Fonction pure `pickCardWinner(room, track)` dans `src/lib/server/socket/game/cards.js` : parcourt `fullFinders`, applique G1 à G7 et les conditions d'exploit, rend le gagnant, les refus avec leur raison, et les signaux G9. Puis `card_pending`. Le résumé `round_end` reçoit `card: { …, winner, provisional, missed }`. |
| Stats de réussite         | `endRound`                                                            | `record_round_stats` en fire-and-forget (classique uniquement : le taux QCM n'est pas comparable). Rien si la manche a été sautée.                                                                                                                                                                                           |
| Fin de partie             | `saveGameResults`                                                     | `card_settle(..., keep = true)` pour chaque joueur encore dans la room ; `cards_granted` à son socket. Protégé par `_ended` (C7), couvre `adminEndGame`.                                                                                                                                                                     |
| Départ en cours de partie | timer de `leaveRoom`                                                  | `card_settle(..., keep = roundsPresent ≥ ceil(maxRounds / 2))`, à côté de `saveMidGamePlayer`.                                                                                                                                                                                                                               |
| Remise à zéro             | `request_new_game`, `startAutoCountdown`                              | `roundsPresent = 0`, `fullFinders = []`.                                                                                                                                                                                                                                                                                     |

`pickCardWinner` s'écrit en premier, **tests d'abord**, avec un cas de test
par garde-fou et un cas « joueur très rapide et honnête » qui doit toujours
gagner sa carte.

Mode Salon (`salon.js`) : hors périmètre.

### 6.3 Stats de réussite

- Unité : une manche en mode classique sur un titre du catalogue.
- `players_exposed` = joueurs présents en fin de manche, invités compris.
- Taux affiché : `found_full / players_exposed`, à partir de 20 joueurs
  exposés, cumulé sur tous les `tracks` d'une même carte.
- N'entre pas dans la rareté.

### 6.4 Enrichissement : création des cartes

Nouveau service `src/lib/server/services/cards.js`, qui réutilise
`deezer.js` et `spotify.js`. Pour un titre du catalogue sans
`card_checked_at` :

1. **Titre Deezer de départ**
   - `source = 'deezer'` : `GET api.deezer.com/track/{external_id}`.
   - `source = 'spotify'` : `GET api.spotify.com/v1/tracks/{id}` →
     `external_ids.isrc` → `GET api.deezer.com/track/isrc:{isrc}` (vérifier
     que le mode développeur Spotify renvoie toujours l'ISRC depuis
     février 2026, sinon recherche Deezer).
   - Sinon : recherche Deezer.
2. **Toutes les versions** : `GET api.deezer.com/search?q=artist:"…" track:"…"`,
   on garde les résultats dont `cleanString(artist)` et `cleanString(title)`
   correspondent au titre ZIK.
   - `deezer_rank` = max des `rank` (I2).
   - Année = la plus ancienne `release_date` des albums de ces versions.
   - Album retenu = celui de la version au `rank` max, sauf si c'est une
     compilation (`record_type = 'compile'`) : on prend alors la meilleure
     version sur un album, un EP ou un single.
3. **Album** : `GET api.deezer.com/album/{id}` → genre, `cover_xl`,
   `record_type`. Cache par id.
4. **Artiste** : `GET api.deezer.com/artist/{id}` → `nb_fan`. Cache par id.
5. Upsert `card_artists`, `card_albums`, puis carte sur
   `(artist_id, title_key)` ; si elle existe, `tracks.card_id` pointe dessus.
   Rareté avec le barème v1 ; `rarity_locked_at` posé sauf sortie de moins
   de 12 mois ou période de Noël (I4). `attach_card_to_sets`.
6. `tracks.card_checked_at = now()` dans tous les cas. Nouvelle tentative
   après 30 jours pour les échecs.

Déclencheurs :

- **Backfill** du catalogue (~8 400 titres), script lancé une fois sur le
  modèle de `coverBackfill.js`.
- **À la volée** : `POST /api/tracks/resolve` met les nouveaux ids en file.
- **Filet** : `prefetchNextRound` enrichit le titre suivant s'il n'a jamais
  été vérifié.
- **Passage mensuel** sur les cartes provisoires (`rarity_locked_at` nul).

Débit : Deezer limite à 50 requêtes / 5 s → file à 8 requêtes/s. Environ 3
requêtes par titre avec les caches album et artiste, soit ~25 000 requêtes :
**~50 minutes** de backfill. Une fois la carte créée, Deezer n'est plus
appelé pour elle (sauf passage mensuel des provisoires).

### 6.5 Système de cartes : design

#### Direction : chaque rareté est un pressage

Le monde de ZIK, c'est le disque. Les collectionneurs de vinyles connaissent
déjà la rareté sous une forme précise : le **pressage**. Un même album sort
en vinyle noir standard, puis en éditions limitées colorées, marbrées, à
paillettes, et la certification se fête par un disque d'or. La carte ZIK
reprend ce langage plutôt que celui des cartes de jeu fantasy :

- la carte est une **pochette** ;
- un **disque** dépasse sur le côté droit, et c'est lui qui porte la
  rareté : sa matière change selon le niveau ;
- un **obi**, la bande verticale de papier qui entoure les pressages
  japonais et que les collectionneurs gardent précieusement, court sur le
  bord gauche et porte le numéro et la rareté.

| Rareté      | Pressage                                       | Matière du disque                                                                                                                             | Obi                      |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Commune     | Vinyle noir standard                           | Gris anthracite mat, sillons à peine visibles.                                                                                                | Gris, papier mat.        |
| Peu commune | Vinyle coloré                                  | Vert opaque, reflet de sillons discret.                                                                                                       | Vert.                    |
| Rare        | Vinyle translucide                             | Bleu translucide : la lumière le traverse, on devine le fond de la carte au travers.                                                          | Bleu.                    |
| Épique      | Vinyle marbré                                  | Violet marbré (deux tons en volutes), reflet arc-en-ciel des sillons qui suit l'inclinaison.                                                  | Violet, liseré brillant. |
| Légendaire  | Disque d'or                                    | Or métallique, reflet chaud et franc ; le cadre de la pochette passe en dorure fine.                                                          | Or, texte en creux.      |
| Mythique    | Vinyle rose à paillettes, édition « full art » | Rose avec paillettes qui scintillent indépendamment ; la pochette déborde jusqu'aux bords de la carte, le disque et l'obi passent par-dessus. | Rose irisé.              |

Ce qui rend la carte mémorable : **le reflet des sillons**. Un disque réel
renvoie la lumière en éventail arc-en-ciel le long de ses sillons ; sur la
carte, ce reflet tourne avec l'inclinaison (souris, doigt ou gyroscope). Du
gris presque immobile pour une Commune jusqu'à l'éventail complet et aux
paillettes d'une Mythique. Tout le reste de la carte reste sobre pour que ce
moment porte.

#### Anatomie (format 5:7, proche d'une carte à collectionner)

```
┌─┬─────────────────────────┐
│ │                       ╭─┤
│n│                      ╱  │
│°│     pochette         │ ◉│  disque qui dépasse (matière = rareté)
│ │     (carrée)         │  │
│4│                      ╲  │
│2│                       ╰─┤
│ ├─────────────────────────┤
│É│ Veridis Quo             │  titre, Barlow Condensed, grand
│p│ Daft Punk               │  artiste
│i│ Discovery, 2001         │  album, année
│q│─────────────────────────│
│u│ 92,8  popularité Deezer │
│e│ 4,2 M fans · 38 % ZIK   │
└─┴─────────────────────────┘
 obi
```

- **Typographie** : uniquement les polices du site (C11). Barlow Condensed
  pour le titre, en grande taille et serré, c'est l'élément typographique
  fort ; Barlow pour le reste. Chiffres en `tabular-nums`. La rareté et le
  numéro courent verticalement sur l'obi.
- **Fond de la carte** : une couleur tirée de la pochette elle-même
  (couleur dominante calculée à l'enrichissement et stockée dans
  `card_albums.dominant_color`), assombrie. Chaque carte a ainsi sa propre
  teinte, cohérente avec sa pochette, au lieu d'un gabarit identique.
- **Contraste** : le texte reste lisible sur les 6 thèmes du site, car la
  carte porte son propre fond, indépendant du thème.
- **Verso** : sillons du disque vus de face, logo ZIK au centre comme une
  étiquette de disque, puis les données détaillées (fans, taux de réussite,
  premier à l'avoir, date d'obtention, sets dont elle fait partie, mention
  Deezer).
- **Silhouette** (carte manquante) : pochette floutée et désaturée, disque
  absent, obi gris avec « ? ».

#### Architecture : un composant, une visionneuse

Tout le système vit dans `src/lib/components/card/`. Afficher une carte
n'importe où = importer **un** composant.

| Fichier                | Rôle                                                                                                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Card.svelte`          | Le composant public. Props : `card`, `size` (`mini` 64 px / `sm` / `md` / `lg` / `xl`), `face` (`front` / `back` / `silhouette`), `motion` (`none` / `hover` / `full`), `inspectable` (clic → visionneuse). Contient la carte, ses couches et tout son style scoped. |
| `CardViewer.svelte`    | La visionneuse plein écran, montée **une seule fois** dans les layouts `(site)` et `/game`.                                                                                                                                                                          |
| `cardViewer.svelte.js` | État partagé en runes (`$state`) : `openCard(card, list?)`, `closeCard()`. N'importe quelle page appelle `openCard`, sans monter sa propre modale.                                                                                                                   |
| `cardReveal.js`        | La séquence d'apparition de fin de manche, réutilisable (fin de manche, fin de partie, ascension de rareté).                                                                                                                                                         |
| `rarity.js`            | Libellés, ordre et conditions d'exploit côté client (affichage seulement ; le serveur reste seul juge).                                                                                                                                                              |
| `RarityBadge.svelte`   | Petite pastille de rareté pour les lignes de texte, notifications, filtres. Réutilise les mêmes variables.                                                                                                                                                           |

Seule chose globale : les **variables de rareté** dans `static/css/cards.css`
(couleurs, dégradés de matière, halos), chargée dans les layouts `(site)` et
`/game` (C10). Tout le reste (couches, reflets, keyframes) est dans
`Card.svelte` et n'existe nulle part ailleurs.

```css
:root {
  --rarity-common: #8b9099;
  --rarity-uncommon: #2fbf71;
  --rarity-rare: #3b82f6;
  --rarity-epic: #9b5cf6;
  --rarity-legendary: #e8b84a;
  --rarity-mythic: #ff4fc8;
}
```

Couches de `Card.svelte`, de bas en haut :

1. fond (couleur dominante de la pochette) ;
2. disque (matière selon `data-rarity`) ;
3. pochette ;
4. obi et textes ;
5. reflet des sillons (`conic-gradient` centré sur le disque, orienté par
   `--rx` / `--ry`) ;
6. paillettes (Mythique seulement) ;
7. reflet de surface (dégradé radial qui suit `--mx` / `--my`).

Les variables `--mx`, `--my`, `--rx`, `--ry` sont écrites par une seule
action `use:cardTilt` (pointeur, doigt, gyroscope sur mobile après
autorisation iOS). Les couches 5 à 7 ne sont rendues qu'en `motion="full"`.

#### Performances

- Dans une grille (collection, sets), les cartes sont en `motion="none"` ou
  `hover` : aucune animation continue, reflet seulement au survol. Seule la
  carte ouverte dans la visionneuse est en `full`.
- Couches animées en `transform` et `opacity` uniquement ; paillettes en une
  seule image de texture répétée, pas en centaines d'éléments.
- Pochettes en `cover_medium` dans les grilles, `cover_xl` dans la
  visionneuse.
- `prefers-reduced-motion` : plus d'inclinaison ni de reflet mobile, la
  carte reste belle à plat (matières et couleurs inchangées).

#### La visionneuse

Ouverte par un clic sur n'importe quelle carte `inspectable`, ou à la fin
d'une révélation.

- Fond assombri et flouté, la carte au centre en `xl`.
- **Inclinaison** au pointeur, au doigt ou au gyroscope : c'est là qu'on voit
  le reflet des sillons et les paillettes.
- **Retourner** : clic, tap ou touche Espace → verso avec les détails.
- **Regarder le disque** : appui long ou bouton « Sortir le disque » → le
  disque glisse hors de la pochette et tourne lentement, à la vitesse d'un
  33 tours. Moment de contemplation, réservé à la visionneuse.
- **Naviguer** : flèches clavier ou glisser horizontal pour passer à la carte
  suivante de la liste d'où l'on vient (collection, set, fin de partie).
- **Écouter l'extrait** : bouton lecture qui joue l'extrait Deezer de
  30 secondes, uniquement pour une carte possédée. Jamais dans le jeu
  (anti-spoiler).
- Fermer : Échap, clic sur le fond, glisser vers le bas sur mobile.
- Accessibilité : focus piégé dans la visionneuse, retour du focus à la
  carte d'origine, chaque action au clavier, textes alternatifs (« Carte
  Épique : Veridis Quo, Daft Punk »).

#### Écran de gain de carte

La pause entre deux manches dure 3 à 15 s (7 par défaut). La révélation
tient en **2,5 s** et ne bloque rien.

**Gagnant** (`round_end` avec `card.winner = moi`) :

1. 0 - 0,5 s : la pochette déjà révélée devient une carte (l'obi se
   déroule sur le bord gauche).
2. 0,5 - 1,4 s : le disque sort de la pochette ; sa matière annonce la
   rareté avant tout texte. Le joueur reconnaît un disque d'or avant de lire
   « Légendaire ».
3. 1,4 - 2,0 s : reflet des sillons qui balaie la carte ; paillettes pour une
   Mythique.
4. Mention : « Nouvelle carte », puis « Reste jusqu'à la
   manche 5 pour la garder » ou « Carte sécurisée ».

Clic sur la carte : visionneuse (la manche suivante continue derrière ; la
visionneuse se ferme d'elle-même au démarrage de la manche).

**Raté de peu** : carte en silhouette avec le disque de sa vraie matière, et
« Mythique ratée - il fallait trouver en moins de 6 s (8,2 s) ».

**Autres joueurs** : une ligne sous le « 🏆 1er » actuel, avec
`RarityBadge` : « 🃏 pseudo remporte la carte, Mythique ».

**Invité premier** : carte en silhouette + « Crée un compte pour gagner tes
cartes », bouton vers `AuthModal`.

**Pendant la partie** (`CardTray.svelte`) : les cartes gagnées s'accumulent
à côté du classement (colonne latérale sur ordinateur, bandeau compact en
haut de l'écran sur téléphone). Elles restent éteintes tant que le joueur
n'a pas atteint la moitié des manches, avec une barre de progression et
« Sécurisées à la manche 5, encore 2 manches ». Au seuil, elles s'allument
toutes ensemble avec « 4 cartes sécurisées ». Une carte gagnée après le seuil
est sécurisée tout de suite. Le seuil se calcule sur les manches où le joueur
était présent (`roundsPresent`), pas sur le numéro de manche : un joueur
arrivé en cours de partie voit son propre compte.

**Quitter avant le seuil** : le bouton Quitter ouvre une confirmation qui
montre les cartes en jeu (« Tu as 2 cartes en jeu, sécurisées seulement à la
manche 5 : en partant maintenant, tu les perds. »), avec « Rester » en
action principale. Une fois les cartes sécurisées, la confirmation l'indique
et ne retient plus.

**Fin de partie** (`cards_granted`) : bloc « Tes cartes de la partie » dans
la séquence de révélation existante (`revealStep`), après le podium : cartes
`sm` côte à côte, la plus rare en premier, clic → visionneuse avec toute la
série.

Fichiers touchés côté jeu : `src/routes/(site)/game/+page.svelte`
(handlers `round_end`, `game_over`, nouveau `cards_granted`) et
`src/routes/(site)/game/+layout@.svelte` (`cards.css` et `CardViewer`).

#### Avant de coder la page collection

Prototyper `Card.svelte` seul, sur une page de test qui affiche les 6
raretés côte à côte avec de vraies pochettes, et la visionneuse. Valider le
rendu avec Theo **avant** de construire la collection et l'écran de gain :
c'est la carte qui doit donner envie, tout le reste en découle.

---

## 7. MVP et découpage

### Phase 0 - prérequis

1. Vérification du JWT dans `join_room` (C6, G1). Utile même sans cartes.
2. Limite de débit de `submit_guess` (G8). Utile même sans cartes.
3. Tables `card_artists`, `card_albums`, `cards`, `tracks.card_id`,
   `track_stats`.
4. Service d'enrichissement + backfill.
5. Calibrage du barème v1 sur le catalogue enrichi, gravé en constantes.

### Phase 1 - MVP

1. **Prototype `Card.svelte` + visionneuse**, validé avant la suite.
2. `pickCardWinner` et ses tests, puis branchement dans `core.js`
   (classique et QCM).
3. `user_cards`, `card_grants`, `card_signals`, fonctions `card_pending` /
   `card_settle`.
4. Écran de gain en fin de manche + bloc fin de partie.
5. `/collection` : artistes → artiste → album, vue « toutes mes cartes ».
6. Sets artiste et album + badges.
7. Onglet « Cartes » sur `/user/[username]`.
8. Écran admin minimal : signaux, révocation (G12).
9. `/nouveautes`, `/docs`, version mineure.

### Phase 2 - fiabilité

1. Passage mensuel des cartes provisoires (sorties récentes, Noël).
2. Signalement d'une carte fausse + correction admin.
3. Détection des duos de comptes suspects dans l'écran admin.

### Phase 3 - jouer avec ses cartes

1. Pastille « dans ta collection » en fin de manche.
2. Défi « joue avec mon deck » entre amis.

### Phase 4 - curation

1. Sets thématiques faits à la main.
2. Mode Salon, si un compte joueur y apparaît.

---

## 8. Questions ouvertes

| #   | Décision à prendre                                                                                                     | Recommandation                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Seuils (495 k / 680 k / 805 k / 910 k / 980 k) et parts visées (35 / 27 / 20 / 12 / 5 / 1 %).                          | **Calibré le 2026-10-05** sur les parts visées (environ 125 Mythiques). À ne plus toucher après l'ouverture.                                                                             |
| Q2  | Conditions d'exploit (temps et nombre de joueurs par rareté).                                                          | **Démarrer avec le tableau proposé**, relire `card_grants` après un mois : si aucune Mythique n'est tombée, desserrer le temps.                                                          |
| Q3  | Minimum de 2 comptes actifs : avec ~37 actifs par semaine, beaucoup de parties sont en solo et ne donneront rien.      | **Garder le minimum**, c'est le garde-fou le plus efficace. En contrepartie, mettre en avant dans `/rooms` les rooms où des joueurs connectés sont présents, pour regrouper les joueurs. |
| Q4  | Comptes sur une même IP comptés pour un seul joueur (G3) : une famille sur le même Wi-Fi a besoin d'un joueur de plus. | **Oui.** Le Mode Salon reste l'usage prévu pour jouer à plusieurs dans une même pièce.                                                                                                   |
| Q5  | Sorties de moins de 12 mois : rareté qui monte pendant un an.                                                          | **Oui** : sans ça, toutes les nouveautés seraient figées trop bas.                                                                                                                       |
| Q6  | Direction « pressage vinyle » (pochette, disque, obi) pour le design des cartes.                                       | **Oui**, à valider sur le prototype (phase 1, étape 1) plutôt que sur papier.                                                                                                            |
| Q7  | Extrait audio dans la visionneuse pour les cartes possédées.                                                           | **Oui** : c'est une raison de revenir dans sa collection. Jamais pour une carte manquante (ce serait un indice).                                                                         |
| Q8  | Cartes manquantes visibles (titres) ?                                                                                  | **Non**, silhouettes seulement.                                                                                                                                                          |
| Q9  | Collection publique sur le profil ?                                                                                    | **Oui**, sauf profil privé.                                                                                                                                                              |
| Q10 | Annoncer une Mythique au-delà de la room ?                                                                             | **Aux amis oui**, Mythique uniquement ; pas sur la page d'accueil en MVP.                                                                                                                |
