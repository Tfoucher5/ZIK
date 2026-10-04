# Cartes musicales - spécification

- **Date :** 2026-10-04
- **Statut :** spec, rien n'est codé
- **Périmètre MVP :** carte gagnée en fin de manche, page collection, 4 raretés, sets par album
- **Hors MVP :** deck, échanges, bonus en partie, sets genre/décennie/label (phases 2 à 4)

## Principe directeur

Les cartes sont la récompense du blind test, pas une app à côté. On ne gagne
une carte qu'en trouvant un titre en jeu ; la collection donne envie de
rejouer pour compléter les sets.

## Décision structurante : la rareté vient de la popularité, et elle est figée

La rareté d'une carte est calculée **une seule fois**, à la création de la
carte, à partir de la **popularité Deezer du titre**. Elle ne change plus
jamais ensuite, quelle que soit la façon dont le titre est joué dans ZIK.

Le taux de réussite dans ZIK est collecté et **affiché** sur la carte comme
statistique, mais il n'entre pas dans le calcul de la rareté.

Conséquence assumée : une Légendaire est un titre **peu écouté**, pas
forcément un titre **difficile à trouver**. Les deux informations sont
visibles côte à côte sur la carte, le joueur fait la différence.

---

## 0. Ce que le code actuel impose

Relevé dans le code avant d'écrire la spec. Chaque point conditionne un choix
plus bas.

| #   | Constat                                                                                                                                                                               | Conséquence pour les cartes                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Le catalogue `tracks` (clé `norm_key = artiste\|titre`) est la source unique des titres des playlists. `buildTrackFromRow` porte `id` = `tracks.id` jusqu'à `room.game.currentTrack`. | Une carte s'accroche à `tracks.id`. Rien à inventer pour identifier le titre joué.                                                        |
| C2  | Les rooms éphémères (`POST /api/rooms/custom`) construisent leurs titres avec `buildTrack` **sans `id`** : ils ne sont pas dans le catalogue.                                         | Pas de carte dans une room éphémère. C'est aussi un garde-fou anti-farm gratuit.                                                          |
| C3  | `tracks` ne stocke ni album, ni année, ni genre, ni popularité. `external_id` est un id Deezer **ou** Spotify selon `source`.                                                         | Il faut une étape d'enrichissement (section 6.4). Pour les titres Spotify, passer par l'ISRC.                                             |
| C4  | Les doublons existent dans le catalogue : `norm_key` ne normalise que la casse et les espaces (« Titre », « Titre - Remastered 2011 » et « Titre (feat. X) » sont trois lignes).      | La carte ne peut pas être `tracks.id` tout court : table `cards` dédoublonnée par id Deezer, `tracks.card_id` → carte.                    |
| C5  | `game.firstFullFinder` existe déjà : premier joueur à avoir tout trouvé (artiste + titre + feats + réponses supplémentaires). Il est affiché en fin de manche (« 🏆 1er : … »).       | Le gagnant de la carte est ce joueur. Pas de nouvelle notion de « premier ».                                                              |
| C6  | **`join_room` fait confiance au `userId` envoyé par le client.** Aucun JWT n'est vérifié sur le socket de jeu (seul `presence:hello` le fait).                                        | **Prérequis bloquant** : sans vérification, n'importe qui peut jouer sous le compte d'un autre et créer des comptes fantômes pour farmer. |
| C7  | `saveGameResults` est le point unique de persistance de fin de partie (fin normale **et** `adminEndGame`), protégé par `_ended` contre le double appel.                               | L'attribution définitive des cartes s'y branche, avec la même protection.                                                                 |
| C8  | `lastRoundData` part au client pendant la manche ; la règle anti-spoiler interdit d'y mettre artiste ou titre.                                                                        | Aucune info de carte (rareté, album) avant `round_end`. Une Légendaire annoncée trahirait un titre obscur.                                |
| C9  | Les succès utilisent déjà `common / rare / epic / legendary` avec libellés et couleurs (`AchievementToast.svelte` : bleu, violet, or).                                                | Même vocabulaire et même code couleur pour les cartes.                                                                                    |
| C10 | Le mode QCM est déjà exclu de l'ELO, des stats joueur et des succès.                                                                                                                  | Pas de carte en QCM (trouver parmi 4 choix ne vaut pas une carte).                                                                        |

---

## 1. Obtention des cartes

### Règle

- **Une carte = un titre** (pas l'artiste seul). La carte porte l'artiste
  principal et les feats comme informations.
- La carte de la manche revient au **premier joueur connecté qui a tout
  trouvé** (`firstFullFinder`, C5).
- Si le premier à tout trouver est un **invité**, la carte passe au premier
  joueur connecté qui a tout trouvé après lui. L'invité voit la carte
  s'afficher avec « Crée un compte pour gagner tes cartes » (levier de
  conversion).
- Si personne n'a tout trouvé : pas de carte.
- Mode classique uniquement, titres du catalogue uniquement (C2, C10).

Il faut donc garder l'**ordre** des joueurs ayant tout trouvé, pas seulement
le premier : `game.fullFinders = []`, alimenté au même endroit que
`firstFullFinder` dans `submit_guess`.

### Doublons

Une carte déjà possédée n'est pas perdue : elle incrémente un compteur
d'exemplaires (`user_cards.copies`).

- Affichage : « ×3 » sur la carte dans la collection.
- Utilité en MVP : aucune, hors fierté. En phase 3, seuls les exemplaires en
  trop (`copies ≥ 2`) seront échangeables : le joueur ne se vide jamais sa
  collection en échangeant.

### Cartes provisoires, puis définitives

Une carte gagnée en manche est **provisoire** jusqu'à la fin de la partie.
Elle devient définitive dans `saveGameResults` si :

1. la partie s'est terminée (fin normale ou coupée par l'admin, C7) ;
2. le joueur est encore dans la room à ce moment-là.

Un joueur qui quitte en cours de partie perd ses cartes provisoires. Message
affiché au gain : « Termine la partie pour la garder ». Effet attendu : moins
de parties abandonnées, et aucun farm par « je trouve le 1er titre, je
relance ».

Une partie abandonnée (room vidée, `cleanupRoom` sans `game_over`) n'attribue
rien.

### Pas d'argent, pas de hasard payant

- Aucune carte ne s'achète, ni directement ni via booster, monnaie ou
  abonnement. Aucun lien avec `/soutenir` (un don ne donne jamais de carte).
- Aucun tirage aléatoire : la carte gagnée est déterminée par le titre joué
  et par le joueur qui l'a trouvé.
- Les échanges (phase 3) restent non monétisables. Une carte qui pourrait se
  revendre contre de l'argent ferait basculer ZIK dans le régime des
  JONUM (loi SREN 2024) ; on reste à l'écart en interdisant toute valeur
  marchande.

### Garde-fous anti-farm

| Risque                                                                                | Garde-fou                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jouer sous un autre compte ou avec des comptes fantômes (C6)                          | **Prérequis** : `join_room` vérifie le JWT (`verifyToken`, comme `presence:hello`). Sans token valide, le joueur est traité en invité, donc sans carte.        |
| Room solo : on est toujours le premier                                                | Solo autorisé mais plafonné à **10 cartes nouvelles par jour** (les doublons ne comptent pas). « Solo » = un seul joueur connecté actif au début de la manche. |
| Playlist perso remplie de titres obscurs que le joueur connaît par cœur → Légendaires | Dans une room dont **la playlist appartient au joueur**, il ne gagne de carte que s'il y a au moins **2 autres comptes connectés** dans la room.               |
| Playlist perso remplie de tubes faciles                                               | Pas de garde-fou spécifique : la rareté venant de la popularité, ce farm ne rapporte que des Communes.                                                         |
| Volume brut (un joueur qui enchaîne 40 parties)                                       | Plafond global de **40 cartes nouvelles par jour** et par compte, tous modes confondus. Au-delà, le gain s'affiche « limite du jour atteinte ».                |
| Partie abandonnée / relancée en boucle                                                | Cartes provisoires, perdues si la partie ne se termine pas (voir plus haut).                                                                                   |
| Manche sautée par l'admin (`adminSkipRound`)                                          | Pas de carte pour cette manche.                                                                                                                                |
| Rooms éphémères                                                                       | Pas de carte (C2).                                                                                                                                             |

Les plafonds sont des constantes serveur, ajustables sans migration.

---

## 2. Contenu d'une carte

### Recto

```
┌──────────────────────────┐
│ ◆ ÉPIQUE          ×2     │  rareté (couleur) + exemplaires
│ ┌──────────────────────┐ │
│ │                      │ │
│ │   pochette d'album   │ │  cover Deezer cover_xl (1000 px)
│ │                      │ │
│ └──────────────────────┘ │
│ Titre                    │
│ Artiste (feat. X)        │
│ Album · 1997 · Rock      │
│──────────────────────────│
│ 🎧 412 k   🎯 38 %        │  popularité, taux de réussite ZIK
│ Obtenue le 12/10/2026    │
│ ★ 1re : pseudo           │  premier joueur à l'avoir obtenue
│ #0042                    │  numéro de carte dans le catalogue
└──────────────────────────┘
```

### Données

| Champ                 | Source                                                   | Note                                                                         |
| --------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Titre, artiste, feats | `tracks` (canonique, pas les `custom_title` de playlist) | Les surcharges de playlist (nom de film…) ne remontent pas sur la carte.     |
| Album, année, label   | Deezer `album`                                           | Année = la plus ancienne trouvée parmi les versions (voir I4).               |
| Genre                 | Deezer `album.genres` (premier genre)                    | Genres larges Deezer : Pop, Rap/Hip Hop, Rock, Dance, Variété française…     |
| Pochette              | Deezer `album.cover_xl`                                  | Liée, pas copiée, comme le fait déjà le jeu.                                 |
| Popularité            | Deezer `track.rank` (0 à 1 000 000)                      | Affichée en clair (« 412 k ») ; c'est elle qui fixe la rareté.               |
| Fans de l'artiste     | Deezer `artist.nb_fan`                                   | Affiché au verso seulement, ne sert pas à la rareté.                         |
| Taux de réussite ZIK  | `track_stats`                                            | Affiché à partir de 20 joueurs exposés, sinon « - ».                         |
| Date d'obtention      | `user_cards.first_obtained_at`                           |                                                                              |
| Premier à l'avoir     | `cards.first_owner_id`                                   | Premier compte à l'avoir obtenue, toutes rooms confondues. Ne change jamais. |
| Numéro                | `cards.number`                                           | Ordre de création des cartes. Donne une identité « #0042 ».                  |

Pas de Last.fm en MVP : Deezer suffit pour l'écrasante majorité du catalogue
(il vient en grande partie de Deezer, et les titres Spotify y sont retrouvés
par ISRC). Last.fm n'arrive qu'en repli, phase 2, si le taux de titres sans
carte le justifie (voir I5).

### Point juridique

- **Aucune photo d'artiste** : on n'utilise jamais `artist.picture` de
  Deezer, même si l'API la renvoie. Droit à l'image des artistes, et photos
  souvent sous droits de photographe.
- Les pochettes sont affichées comme dans le jeu actuel : URL Deezer liée,
  pas d'hébergement chez nous, pas de recadrage ni de montage avec d'autres
  visuels. Le cadre de carte est autour de la pochette, jamais par-dessus.
- Les conditions de l'API Deezer demandent une mention de la source :
  « Données et pochettes : Deezer » en pied de la page collection.
- Pas de nom de label ou de logo de label en visuel (le label n'est qu'une
  donnée texte, phase 4).

---

## 3. Rareté

### Formule

Une seule entrée : `p = track.rank` Deezer (0 à 1 000 000), la valeur la
plus haute parmi les versions qui correspondent au titre (voir
l'enrichissement, 6.4).

```
rareté(p) =
  Commune     si p ≥ S1
  Rare        si S2 ≤ p < S1
  Épique      si S3 ≤ p < S2
  Légendaire  si p < S3
```

### Seuils : calibrés une fois, puis figés

Les seuils sont fixés **une seule fois**, au lancement, sur la distribution
du catalogue enrichi, puis gravés en constantes (« barème v1 »). Ils ne
suivent pas la croissance du catalogue : un titre ajouté dans un an est
classé avec le même barème qu'un titre d'aujourd'hui.

Répartition visée sur le catalogue au lancement :

| Rareté     | Part du catalogue | Seuil                       |
| ---------- | ----------------- | --------------------------- |
| Commune    | 50 %              | `S1` = percentile 50 de `p` |
| Rare       | 30 %              | `S2` = percentile 20        |
| Épique     | 15 %              | `S3` = percentile 5         |
| Légendaire | 5 %               |                             |

Calibrage, à lancer une fois l'enrichissement terminé :

```sql
select
  percentile_disc(0.50) within group (order by deezer_rank) as s1,
  percentile_disc(0.20) within group (order by deezer_rank) as s2,
  percentile_disc(0.05) within group (order by deezer_rank) as s3
from cards
where deezer_rank is not null;
```

Ordre de grandeur attendu, **à confirmer par la requête** (les playlists ZIK
sont surtout des tubes, la distribution est tassée vers le haut) :
`S1 ≈ 700 000`, `S2 ≈ 550 000`, `S3 ≈ 350 000`.

### Exemples chiffrés (avec ces seuils indicatifs)

| Titre (fictif)                        | `rank` Deezer | Rareté     |
| ------------------------------------- | ------------- | ---------- |
| Tube actuel du top 50                 | 960 000       | Commune    |
| Gros tube des années 2000             | 780 000       | Commune    |
| Single connu d'un artiste moyen       | 620 000       | Rare       |
| Face B d'un album culte               | 480 000       | Épique     |
| Titre de niche d'une playlist experte | 210 000       | Légendaire |

Ce que gagne un joueur sur une partie de 10 manches dans une playlist
officielle « tubes » où il trouve 4 titres en premier : en moyenne 3
Communes et 1 Rare. Une Légendaire se mérite sur des playlists pointues, ce
qui oriente vers la découverte plutôt que vers le farm de tubes.

### Pourquoi figée

- Un joueur qui possède une Légendaire la garde Légendaire. Pas de
  déclassement vécu comme une perte.
- Le `rank` Deezer bouge (un titre sort, culmine, retombe) : le figer au jour
  de la création de la carte donne une photo stable.
- Aucun recalcul périodique, aucun job à maintenir.

Seule exception : une **correction admin** quand l'enrichissement a pris le
mauvais titre Deezer (reprise, karaoké). La correction recalcule la rareté
avec le barème v1, pour tous les possesseurs, et laisse une ligne dans
`admin_audit_log`.

### Incohérences possibles et traitement

| #   | Incohérence                                                                                                              | Traitement                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Un classique très connu mais peu streamé aujourd'hui (tube des années 70) sort Épique alors que tout le monde le trouve. | Assumé : la rareté mesure l'écoute, pas la difficulté. Le taux de réussite affiché (ex. 85 %) le montre. Ne pas corriger à la main, sinon le barème perd sa lisibilité.       |
| I2  | Une version remasterisée, live ou radio edit a un `rank` bien plus bas que l'original → fausse Légendaire.               | À l'enrichissement, on retient le `rank` **maximum** parmi les résultats Deezer dont artiste et titre nettoyés (`cleanString`) correspondent.                                 |
| I3  | Le même morceau existe en plusieurs lignes `tracks` (C4).                                                                | Une seule carte par id Deezer retenu : `cards.deezer_track_id` est UNIQUE, plusieurs `tracks` pointent vers la même carte.                                                    |
| I4  | L'année Deezer est celle du remaster ou de la compilation (« Bohemian Rhapsody » daté 2011).                             | Année = la plus ancienne parmi les versions correspondantes. Albums de type `compile` exclus du choix de l'album. Correction admin possible (`year_override`).                |
| I5  | Titre absent de Deezer (import manuel, titre retiré, BO).                                                                | Pas de carte (`tracks.card_id` nul), la manche se joue normalement. Suivre le taux : au-delà de 5 % du catalogue joué, brancher Last.fm en repli (phase 2).                   |
| I6  | Mauvaise correspondance (reprise, karaoké, homonyme) → carte et rareté fausses.                                          | Correspondance exigée sur artiste **et** titre nettoyés ; sinon pas de carte. Bouton « signaler la carte » réutilisant la table `reports`. Correction admin (voir plus haut). |
| I7  | Titre récent créé au pic de sa sortie : Commune à vie, même s'il est oublié deux ans plus tard.                          | Assumé (cohérence > exactitude). C'est le prix du gel.                                                                                                                        |
| I8  | Le catalogue grossit avec des playlists de niche : la part réelle de Légendaires dépasse 5 %.                            | Assumé, le barème ne bouge pas. Si la part dépasse 15 %, ouvrir un « barème v2 » **pour les nouvelles cartes seulement**, jamais rétroactif.                                  |

---

## 4. Collection et sets

### Page « Ma collection »

- Route : `/collection` (privée, comme `/profile`) ; vue publique dans
  `/user/[username]`, onglet « Cartes », masquée si `profiles.is_private`.
- Grille de cartes, tri : date d'obtention (défaut), rareté, artiste, titre.
- Filtres : rareté (4 puces colorées), genre, décennie, artiste (recherche),
  « doublons seulement ».
- En-tête : total possédé, répartition par rareté, sets terminés.
- Pas de liste des cartes manquantes en clair : ce serait la liste des
  réponses des playlists. Les cartes manquantes n'apparaissent que dans les
  sets, en silhouette (pochette floutée, « ? »).
- Clic sur une carte : verso (fans de l'artiste, nombre de joueurs qui la
  possèdent, sets dont elle fait partie).

### Sets

| Type       | Génération                                                                                                                                     | Phase |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Album      | Automatique : toutes les cartes partageant `deezer_album_id`, si au moins **3** cartes et album non `compile`.                                 | MVP   |
| Décennie   | Automatique, **paliers** et non complétion : 25 / 100 / 250 cartes des années 80, etc.                                                         | 2     |
| Genre      | Automatique, paliers comme la décennie (un genre compte des milliers de cartes, impossible à finir).                                           | 2     |
| Thématique | À la main par l'admin (« Années Star Ac », « Génériques de dessins animés »), liste de cartes fixe.                                            | 4     |
| Label      | Repoussé : les labels Deezer sont des intitulés de distribution peu lisibles (« Universal Music Division Island Def Jam »), à curer à la main. | 4     |

**Un set d'album suit le catalogue.** Si un nouveau titre de l'album entre
dans ZIK, le set grandit (`3/4` devient `3/5`). Un set déjà terminé **reste
terminé** : la récompense est acquise, un badge « + 1 nouvelle carte »
s'affiche simplement sur le set.

Les sets d'album sont recalculés à chaque création de carte (fonction SQL),
pas par un job.

Combien de sets d'album au lancement : inconnu tant que l'enrichissement
n'a pas tourné. Les playlists ZIK étant surtout des tubes issus d'albums
différents, il peut y en avoir peu. À mesurer juste après le backfill ; si
moins de 30 sets existent, les sets décennie passent dans le MVP.

### Récompense d'un set terminé

Pas de monnaie, pas de carte bonus (ce serait une carte non gagnée en
jouant).

- Badge « Disque d'or » au nom de l'album, avec sa pochette, affichable sur
  le profil (même mécanique que `featured_achievements`).
- +100 XP via `profiles.xp`.
- Notification aux amis (`notifications` existe déjà) : « pseudo a complété
  l'album Random Access Memories ».

---

## 5. Utilisation en jeu (phase 3, hors MVP)

### Room « joue avec ton deck »

- Le joueur choisit 20 à 100 cartes possédées ; ZIK génère une playlist
  privée à partir de leurs `tracks`.
- **Aucune carte ne se gagne dans une room deck** : on connaît déjà ces
  titres, ce serait du farm de doublons.
- Usage intéressant : **défier un ami avec son deck**. L'ami joue sur des
  titres qu'il ne possède pas forcément, et peut, lui, gagner les cartes
  (s'il y a au moins 2 comptes dans la room, règle anti-farm inchangée).

### Échanges entre amis

- Uniquement entre amis (`friendships`), 1 carte contre 1 carte.
- Seuls les exemplaires en trop s'échangent (`copies ≥ 2`).
- Pas de contrainte de rareté (Commune contre Légendaire possible si les deux
  acceptent), mais 5 échanges par jour maximum.
- Proposition → acceptation → transfert atomique en une fonction SQL.
- Jamais d'échange contre autre chose qu'une carte (pas de monnaie, voir
  JONUM).

### Bonus en partie

Recommandation : **cosmétique uniquement**.

- Quand un joueur trouve un titre dont il possède la carte : petite pastille
  « dans ta collection » sur l'écran de fin de manche.
- Pas de bonus de points : l'ELO et les classements resteraient faussés au
  profit des gros collectionneurs, et cela donnerait une valeur de jeu aux
  cartes qui pousserait au farm.

---

## 6. Technique

### 6.1 Tables Supabase

Toutes en RLS, écriture **uniquement** par le service role (serveur de jeu),
comme `user_achievements`.

```sql
-- Carte : un morceau Deezer, dédoublonné (C4, I3)
create table public.cards (
  id               uuid primary key default gen_random_uuid(),
  number           int generated always as identity unique,   -- #0042
  deezer_track_id  bigint not null unique,
  deezer_album_id  bigint,
  deezer_artist_id bigint,
  title            text not null,
  artist           text not null,          -- artiste affiché (avec feats)
  album            text,
  album_type       text,                   -- album | single | ep | compile
  year             smallint,
  year_override    smallint,               -- correction admin (I4)
  genre            text,
  label            text,
  cover_url        text,                   -- album.cover_xl
  deezer_rank      int not null,           -- popularité figée à la création
  artist_fans      int,
  rarity           text not null check (rarity in ('common','rare','epic','legendary')),
  rarity_scale     smallint not null default 1,   -- barème v1, v2…
  first_owner_id   uuid references public.profiles(id) on delete set null,
  first_owned_at   timestamptz,
  created_at       timestamptz not null default now()
);
create index cards_album_idx  on public.cards (deezer_album_id);
create index cards_rarity_idx on public.cards (rarity);
create index cards_genre_idx  on public.cards (genre);
create index cards_year_idx   on public.cards (coalesce(year_override, year));

-- Lien catalogue → carte. Plusieurs tracks peuvent pointer la même carte.
alter table public.tracks
  add column card_id uuid references public.cards(id) on delete set null,
  add column card_checked_at timestamptz;   -- enrichissement tenté (succès ou non)
create index tracks_card_idx on public.tracks (card_id);

-- Cartes possédées
create table public.user_cards (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  card_id           uuid not null references public.cards(id) on delete cascade,
  copies            int not null default 1 check (copies >= 1),
  first_obtained_at timestamptz not null default now(),
  last_obtained_at  timestamptz not null default now(),
  first_game_id     uuid references public.games(id) on delete set null,
  primary key (user_id, card_id)
);
create index user_cards_card_idx on public.user_cards (card_id);
create index user_cards_user_date_idx on public.user_cards (user_id, first_obtained_at desc);

-- Journal des gains (plafonds quotidiens, audit anti-farm)
create table public.card_grants (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  card_id    uuid not null references public.cards(id) on delete cascade,
  game_id    uuid references public.games(id) on delete set null,
  room_id    text not null,
  round      smallint not null,
  is_new     boolean not null,
  is_solo    boolean not null,
  created_at timestamptz not null default now()
);
create index card_grants_user_day_idx on public.card_grants (user_id, created_at desc);

-- Stats de réussite par titre (affichage seulement, pas de rareté)
create table public.track_stats (
  track_id       uuid primary key references public.tracks(id) on delete cascade,
  rounds_played  int not null default 0,
  players_exposed int not null default 0,   -- joueurs présents en fin de manche
  found_full     int not null default 0,
  found_artist   int not null default 0,
  found_title    int not null default 0,
  last_played_at timestamptz
);

-- Sets
create table public.card_sets (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('album','decade','genre','theme','label')),
  key        text not null,              -- deezer_album_id, '1990', 'Rock', slug thème
  name       text not null,
  cover_url  text,
  card_count int not null default 0,     -- maintenu par la fonction de rattachement
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

- `cards`, `card_sets`, `card_set_items`, `track_stats` : lecture publique.
- `user_cards`, `user_card_sets` : propriétaire, ou profil non privé (même
  règle que `user_achievements`).
- `card_grants` : aucune lecture client (admin seulement).

Fonctions SQL (security definer, `revoke` public comme pour Zikle) :

- `record_round_stats(p_track_id, p_exposed, p_full, p_artist, p_title)` :
  incrément atomique de `track_stats`.
- `grant_cards(p_game_id, p_grants jsonb)` : en une transaction, applique les
  plafonds (lecture de `card_grants` sur la journée Europe/Paris), upsert
  `user_cards` (`copies + 1`), pose `first_owner_id` si nul, journalise
  `card_grants`, détecte les sets terminés, insère `user_card_sets`.
  Retourne `[{ user_id, card_id, is_new, capped, sets_completed: [...] }]`.
- `attach_card_to_sets(p_card_id)` : appelée à la création d'une carte,
  crée le set d'album s'il atteint 3 cartes, met à jour `card_count`.

### 6.2 Où brancher l'attribution dans le flux Socket.io

Tout se passe dans `src/lib/server/socket/game/core.js`.

| Étape                           | Endroit                                  | Ce qui change                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vérifier l'identité (C6)        | `join_room`                              | Le client envoie son access token ; `verifyToken` donne le `userId` de confiance. Token absent ou invalide → `isGuest = true`.                                                                                                                                                                                  |
| Charger la carte du titre       | `TRACK_ROW_SELECT` (`playlist.js`)       | Ajouter `card_id, cards(id, rarity, title, artist, album, year, cover_url, deezer_rank, number)` dans la jointure `tracks`. `buildTrackFromRow` range ça dans `track.card`, **jamais copié dans `lastRoundData`** (C8).                                                                                         |
| Mémoriser l'ordre des trouveurs | `submit_guess`, bloc `allMainFound`      | `game.fullFinders.push(user.name)` à côté de `firstFullFinder`. Remis à `[]` dans `startNextRound`.                                                                                                                                                                                                             |
| Désigner le gagnant de la carte | `endRound`                               | Si `room.game_mode !== "qcm"` et `track.card` : premier de `fullFinders` qui est un compte vérifié et éligible (règle playlist perso). Ajout dans `game.pendingCards` (`Map userId → [{ cardId, round }]`). Le résumé `round_end` reçoit `card: { …track.card, winner, provisional: true }` pour tout le monde. |
| Stats de réussite               | `endRound`                               | `record_round_stats` en fire-and-forget, avec les joueurs présents (`!_dcTimer`) et leurs `foundArtist / foundTitle / _fullFoundCounted`. Pas d'appel si `adminSkipRound` a coupé la manche.                                                                                                                    |
| Attribution définitive          | `saveGameResults`, après `game_players`  | Filtrer `pendingCards` sur les joueurs encore dans `room.players`, appeler `grant_cards`, émettre `cards_granted` à chaque socket concerné (`room.nameToSocket`). Protégé par `_ended` comme le reste (C7). Couvre aussi `adminEndGame`.                                                                        |
| Départ en cours de partie       | `leaveRoom` (timer de départ)            | Rien à écrire : le joueur sort de `room.players`, ses cartes provisoires tombent au filtre ci-dessus.                                                                                                                                                                                                           |
| Remise à zéro                   | `request_new_game`, `startAutoCountdown` | `game.pendingCards = new Map()`.                                                                                                                                                                                                                                                                                |

Mode Salon (`salon.js`) : hors périmètre. Les joueurs y sont surtout des
invités sur téléphone ; à reconsidérer quand le compte joueur y existera.

### 6.3 Stats de réussite

- Unité : une manche jouée en mode classique sur un titre du catalogue.
- `players_exposed` = joueurs présents en fin de manche (`!_dcTimer`), invités
  compris : la difficulté d'un titre ne dépend pas d'avoir un compte.
- Taux affiché : `found_full / players_exposed`, arrondi à l'unité, à partir
  de 20 joueurs exposés.
- Agrégé au niveau du titre (`tracks.id`). La carte affiche la somme des
  `track_stats` de tous les `tracks` qui pointent vers elle (I3).
- Aucun recalcul planifié : ces chiffres n'alimentent pas la rareté.

### 6.4 Enrichissement : création des cartes

Nouveau service `src/lib/server/services/cards.js`.

Pour un titre du catalogue sans `card_checked_at` :

1. **Trouver le titre Deezer**
   - `source = 'deezer'` : `GET api.deezer.com/track/{external_id}`.
   - `source = 'spotify'` : `GET api.spotify.com/v1/tracks/{external_id}`
     (token client déjà géré par `getSpotifyToken`) → `external_ids.isrc` →
     `GET api.deezer.com/track/isrc:{ISRC}`.
   - Sinon (manuel) ou échec : `GET api.deezer.com/search?q=artist:"…" track:"…"`.
2. **Chercher les autres versions** (I2, I4) : une recherche Deezer
   artiste + titre, ne garder que les résultats dont `cleanString(artist)` et
   `cleanString(title)` correspondent au titre ZIK.
   - `deezer_rank` = max des `rank`.
   - Titre Deezer retenu = celui au `rank` max, en écartant les albums de type
     `compile`.
   - Année = la plus ancienne `release_date` parmi les versions.
3. **Album** : `GET api.deezer.com/album/{id}` → genre, label, `cover_xl`,
   `record_type`, `release_date`. Mis en cache par `album_id`.
4. **Artiste** : `GET api.deezer.com/artist/{id}` → `nb_fan`. Mis en cache par
   `artist_id`.
5. Si `deezer_track_id` a déjà une carte : `tracks.card_id` pointe dessus.
   Sinon création de la carte, rareté calculée avec le barème en vigueur,
   puis `attach_card_to_sets`.
6. `tracks.card_checked_at = now()` dans tous les cas (succès ou échec) pour
   ne pas retenter en boucle. Nouvelle tentative possible après 30 jours.

Déclencheurs :

- **Backfill** du catalogue existant (~8 400 titres) par un script lancé une
  fois, sur le modèle de `coverBackfill.js`.
- **À la volée** : `POST /api/tracks/resolve` met les nouveaux ids en file ;
  un worker en mémoire les traite au fil de l'eau.
- **Filet de sécurité** : `prefetchNextRound` enrichit le titre suivant s'il
  n'a pas été vérifié. Le titre courant sans carte se joue sans carte.

Débit et cache :

- Deezer limite à 50 requêtes / 5 s : file à 8 requêtes/s.
- Backfill : ~2 à 3 requêtes par titre avec les caches album et artiste,
  soit environ 20 000 requêtes, **~45 minutes**.
- Caches mémoire `Map` avec TTL 24 h (`makeCache` existe déjà) pour album et
  artiste pendant le backfill ; rien de plus durable : une fois la carte
  créée, ses données sont en base et ne sont jamais relues sur Deezer.
- Last.fm : pas d'appel en MVP (voir I5).

### 6.5 Écran de gain de carte

Contrainte : la pause entre deux manches dure 3 à 15 s (7 par défaut).
L'animation tient en **2,5 s** et ne bloque rien.

**Fin de manche, gagnant** (`round_end` avec `card.winner = moi`) :

1. 0 - 0,4 s : la pochette déjà révélée (`reveal_cover`) se retourne.
2. 0,4 - 1,2 s : le dos de carte apparaît avec un liseré à la couleur de la
   rareté (bleu Rare, violet Épique, or Légendaire, comme les succès).
3. 1,2 - 2,0 s : la carte se retourne côté recto. Légendaire : halo pulsé et
   petites étincelles ; Épique : halo fixe ; Rare et Commune : rien de plus.
4. Mention : « Nouvelle carte » ou « Doublon ×3 », et en dessous « Termine la
   partie pour la garder ».

Respecter `prefers-reduced-motion` : la carte s'affiche directement, sans
rotation.

**Fin de manche, les autres joueurs** : une ligne sous le « 🏆 1er » actuel :
`🃏 pseudo remporte la carte · Épique`.

**Invité premier à tout trouver** : la carte s'affiche grisée avec « Crée un
compte pour gagner tes cartes » et un bouton qui ouvre `AuthModal`.

**Fin de partie** (`cards_granted`) : un bloc « Tes cartes de la partie »
s'insère dans la séquence de révélation existante (`revealStep`), après le
podium : cartes en éventail, compteur de nouvelles, set terminé mis en avant
s'il y en a un. Cartes plafonnées : « limite du jour atteinte ».

Fichiers concernés : `src/routes/(site)/game/+page.svelte` (handlers
`round_end`, `game_over`, nouveau `cards_granted`), nouveau composant
`src/lib/components/MusicCard.svelte` (réutilisé par la collection),
`static/css/game.css` (bumper le `?v=`).

---

## 7. MVP et découpage

### Phase 0 - prérequis (avant tout le reste)

1. Vérification du JWT dans `join_room` (C6). Utile même sans cartes : un
   compte ne doit pas pouvoir jouer sous l'identité d'un autre.
2. Tables `cards`, `tracks.card_id`, `track_stats`.
3. Service d'enrichissement + backfill du catalogue.
4. Calibrage du barème v1 sur le catalogue enrichi, gravé en constantes.

### Phase 1 - MVP

1. `fullFinders`, `pendingCards`, `record_round_stats` dans `core.js`.
2. `user_cards`, `card_grants`, `grant_cards` avec les garde-fous.
3. Écran de gain en fin de manche + bloc fin de partie.
4. Page `/collection` avec filtres rareté / genre / décennie / artiste.
5. Sets d'album + badge « Disque d'or ».
6. Onglet « Cartes » sur `/user/[username]`.
7. Entrée dans `/nouveautes`, page `/docs` mise à jour, version mineure.

### Phase 2 - remplir les trous

1. Sets décennie et genre à paliers (avant le MVP si moins de 30 sets
   d'album, voir section 4).
2. Last.fm en repli pour les titres absents de Deezer (si I5 dépasse 5 %).
3. Signalement d'une carte fausse + correction admin dans le dashboard.

### Phase 3 - jouer avec ses cartes

1. Pastille « dans ta collection » en fin de manche.
2. Défi « joue avec mon deck » entre amis.
3. Échanges de doublons entre amis.

### Phase 4 - curation

1. Sets thématiques faits à la main.
2. Sets par label, avec libellés nettoyés à la main.
3. Mode Salon, si un compte joueur y apparaît.

---

## 8. Questions ouvertes

| #   | Décision à prendre                                                                                           | Recommandation                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | « Trouver le titre » = tout trouver (artiste, titre, feats, réponses en plus) ou artiste + titre seulement ? | **Tout trouver** (`firstFullFinder`) : c'est déjà le « 1er » affiché en fin de manche, aucune nouvelle règle à expliquer.                                                                   |
| Q2  | Seul le premier gagne la carte, ou tous ceux qui trouvent ?                                                  | **Seul le premier**, comme demandé. À revoir si, après un mois, la collection moyenne d'un joueur actif reste sous 30 cartes (avec ~37 actifs par semaine, les rooms sont souvent petites). |
| Q3  | Répartition du barème : 50 / 30 / 15 / 5 ?                                                                   | **Oui**. Une Légendaire doit rester un événement ; 5 % du catalogue reste atteignable sur des playlists pointues.                                                                           |
| Q4  | Cartes provisoires perdues si le joueur quitte avant la fin ?                                                | **Oui**. Simple, incite à finir la partie, ferme le farm par relance.                                                                                                                       |
| Q5  | Plafonds : 10 nouvelles par jour en solo, 40 en tout ?                                                       | **Oui pour démarrer**, ce sont des constantes. Regarder `card_grants` au bout de deux semaines.                                                                                             |
| Q6  | Playlist perso : carte seulement avec 2 autres comptes dans la room ?                                        | **Oui**. Sans ça, une playlist de 50 titres obscurs mémorisés vide le stock de Légendaires en une soirée.                                                                                   |
| Q7  | Titre absent de Deezer : pas de carte, ou carte « Rare » par défaut ?                                        | **Pas de carte**. Une rareté par défaut serait la seule entorse à la règle « rareté = popularité ».                                                                                         |
| Q8  | Les cartes manquantes sont-elles visibles (titres) dans la collection ?                                      | **Non**, silhouettes seulement dans les sets : sinon la collection devient l'antisèche des playlists.                                                                                       |
| Q9  | Collection publique sur le profil ?                                                                          | **Oui**, sauf profil privé. C'est la vitrine qui donne envie aux autres.                                                                                                                    |
| Q10 | Récompense de set : badge + 100 XP + notification aux amis, rien d'autre ?                                   | **Oui**. Aucune carte ni monnaie en récompense : tout ce qui a de la valeur se gagne en jouant.                                                                                             |
| Q11 | Ouvrir les cartes aux rooms officielles seulement au lancement ?                                             | **Non**, toutes les rooms du catalogue : les garde-fous suffisent et les rooms perso sont une bonne part du jeu.                                                                            |
| Q12 | Annoncer une Légendaire à toute la room, voire aux amis ?                                                    | **À la room oui** (ligne sous le « 1er »), **aux amis non** en MVP : trop de notifications pour peu de valeur.                                                                              |
