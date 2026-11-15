# Vision et direction de ZIK

Décidée par Théo le 15/11/2026. Tout agent la lit avant de proposer, de coder ou de juger. Une proposition qui va contre ce document est refusée, ou passe d'abord par Théo.

## En une phrase

**ZIK, c'est le blind test qui fait la soirée** : on lance une partie en deux minutes sur une TV, chacun joue avec son téléphone, et tout le monde a envie d'en refaire une.

## Le cœur : ZIK Soirée, pour tous

Jusqu'en mai 2027, ZIK Soirée est **le** produit :

- **Les groupes** (amis, famille, associations, anniversaires) : gratuit jusqu'à 12 joueurs, le Pass 24 h pour aller au-delà.
- **Les pros** (bars, campings, entreprises, animateurs) : ZIK Pro pour les grandes salles, la régie, la soirée en plusieurs parties et la fiabilité dont ils ont besoin devant leur public.
- **Le jeu en ligne** (rooms, Zikle, cartes) reste ouvert et maintenu : correctifs, fiabilité, SEO. Aucun nouveau chantier avant mai 2027, sauf décision de Théo.

Ce qui sert à la fois les groupes et les pros passe en premier.

## Les trois chiffres qui guident tout

| Chiffre                   | Définition                                                                         | Ce qu'il mesure           |
| ------------------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| **Soirées réussies**      | parties ZIK Soirée terminées à 2 joueurs ou plus, sans erreur serveur, par semaine | fiabilité, plaisir, usage |
| **Organisateurs fidèles** | organisateurs qui relancent une soirée dans les 30 jours                           | envie d'y revenir         |
| **Clients payants**       | Pass 24 h vendus et abonnements ZIK Pro actifs                                     | revenu                    |

Les trois comptent autant. Quand ils se contredisent, l'ordre est : **une soirée réussie d'abord** (une soirée ratée devant un public coûte plus qu'une vente), puis la fidélité, puis le revenu.

Chaque proposition dit quel chiffre elle fait bouger, et comment on le verra dans `etat.md`. Une proposition qui n'en fait bouger aucun attend.

## La promesse : fiable, facile, fun, pro

Ces quatre mots sont jugés avec une grille concrète. La recette et la relecture l'appliquent à tout ce qui se voit.

**Fiable**

- Une coupure réseau de 30 s, un téléphone en veille ou un redémarrage du serveur ne bloquent personne : tout le monde reprend sa place.
- Aucun écran sans issue : chaque attente dit ce qui se passe et quoi faire.
- Testé en vrai avant la prod : à plus de 12 téléphones, dont un vrai iPhone, quand une soirée est touchée.

**Facile**

- Créer une soirée et lancer la première musique en moins de 2 minutes, sans lire d'aide.
- Rejoindre depuis le QR en moins de 20 secondes, avec un seul champ.
- Une action principale par écran. Aucun mot technique (« socket », « token », « salon » côté joueur).

**Fun** (côté joueurs et TV)

- Chaque manche a un moment de réaction : qui a trouvé, qui est le plus rapide, qui remonte.
- La fin de partie se fête : podium, son, une raison de rejouer.
- Les textes taquinent, félicitent, relancent. On rit d'un mauvais buzz, sans jamais se moquer de quelqu'un.

**Pro** (côté organisateur : création, régie, offres, factures)

- Sobre, clair, rassurant : l'organisateur sait toujours ce que voit son public.
- La régie se lit dans le bruit et se manipule d'une main.
- Zéro faute, textes neutres en genre (« à la 1re place »), tu côté joueurs, accueil, création et régie, vous sur /pro et /soiree, vous pluriel sur la TV.
- Rien ne bouge ni ne clignote sans raison.

## Le ton

Deux voix, une seule marque :

| Où                                   | Voix              | Exemple                                              |
| ------------------------------------ | ----------------- | ---------------------------------------------------- |
| Téléphones des joueurs, TV, partage  | festive, taquine  | « Trop lent ! Léa t'a coiffé au poteau. »            |
| Création, régie, offres, aide, mails | sobre, rassurante | « Ta soirée est prête. Les joueurs scannent le QR. » |

## Ce qu'on ne fait pas

- Pas de nouvelle fonctionnalité visible sans concept validé par Théo (voir plus bas).
- Pas de nouveau mode de jeu en ligne avant mai 2027.
- Pas d'abonnement « Maison » (board du 13/11, on en reparle le 14/01/2027).
- Pas de service tiers payant ou à quota, pas de publicité.
- Pas d'appel YouTube pendant une partie.
- Pas de « pour plus tard » : on livre petit, fini et testé.

## Comment l'équipe avance seule

### Ce qui avance sans Théo, jusqu'à la prod

Correctifs, fiabilité, tests, performances, sécurité, SEO technique, dette, textes corrigés sans changer le sens, et tout ce qu'une fiche de concept validée par Théo a décrit.

### La porte concept

Tout ce qui se voit (nouvel écran, parcours modifié, nouveau visuel, texte important) passe par **`/produit cadrer`**, qui rend :

1. une fiche (objectif, chiffre visé, parcours, états, textes, critères de recette) dans `docs/specs/` ;
2. une **maquette** publiée en page privée (Artifact), lisible sur téléphone.

Le travail s'arrête là. Théo valide, corrige ou refuse. La fiche porte alors « Validée par Théo le JJ/MM ». Le code ne démarre que sur une fiche validée. En attendant, l'équipe passe à la tâche suivante.

### Qui décide quoi

| Sujet                                                     | Décide              |
| --------------------------------------------------------- | ------------------- |
| Vision, priorités du trimestre, concept de ce qui se voit | Théo                |
| Argent, prix, offres, Stripe live                         | Théo                |
| Nouvelle page, nouveau mode de jeu, données de prod       | Théo                |
| Ordre des tâches dans le plan, priorités de la semaine    | CEO (`/ceo`)        |
| Comment c'est codé, découpage, tests                      | CTO (`/tech`)       |
| Feu vert de mise en prod (porte du `CLAUDE.md`)           | COO (`/operations`) |
| Avis sur une grosse décision                              | Board (`/board`)    |

### Le rythme

| Quand             | Quoi                                                                |
| ----------------- | ------------------------------------------------------------------- |
| Chaque jour ouvré | `/operations suite` : une tâche du plan, du code jusqu'à la recette |
| Lundi             | `/ceo semaine` : chiffres, 3 priorités liées aux trois chiffres     |
| Chaque release    | recette avec la grille ci-dessus, Théo prévenu avec quoi tester     |
| Une fois par mois | `/board` sur la direction : les trois chiffres avancent-ils ?       |

## Les étapes jusqu'en mai 2027

1. **Fiabilité** (en cours) : la v3.32 sort avec sa liste de corrections fermée et une recette à plus de 12 téléphones.
2. **Expérience** (v3.33) : le fun, les textes, la charte, le gérant sur téléphone. Chaque morceau passe par la porte concept.
3. **Croissance** : faire venir les groupes (SEO soirée, partage de fin de partie) et signer des pros (prospection, Pass 24 h visible).

Les cibles chiffrées de chaque étape sont fixées avec Théo au premier `/ceo semaine` qui suit, à partir de `etat.md`.
