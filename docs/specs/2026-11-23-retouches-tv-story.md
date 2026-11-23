# Retouches après la soirée du 16/11 : un seul magenta sur la TV, nom de la soirée sur la story — fiche de cadrage

Statut : **à valider par Théo** (porte concept : ça se voit sur la TV, la création et l'image partagée).

Chantier : « Retouches après tests réels » (`docs/strategie/chantiers.md`).

Maquette (hors dépôt) : `C:\Users\Teamr\AppData\Local\Temp\claude\c23315e6417d4b11\4bf816a1-7c19-48ef-b732-f7835b9c5024\scratchpad\maquette-retouches\index.html`, captures `capture-390.png` et `capture-1440.png` dans le même dossier. Trois parties : TV au lobby (avant, après sans régie, après avec régie), story (avant, avec nom, nom long, sans nom), saisie du nom à la création (390 px).

## Objectif

1. La TV sans régie montre une seule chose à faire : le bouton « Lancer la partie ». DESIGN.md : « une action ou une info forte à la fois ».
2. L'image partagée en fin de partie dit **quelle** soirée c'était, pas seulement quel jour. Une story « Quiz du jeudi » fait connaître le bar et donne envie de revenir.

Chiffres visés : **soirées réussies** (TV plus claire pour l'organisateur seul) et **organisateurs fidèles** (le nom de leur soirée circule sur les réseaux). Suivi : aucun compteur nouveau. Intuition, à juger au prochain test réel avec Théo.

## 1. Un seul magenta sur la TV sans régie

### Ce que dit le code

TV au lobby, aucune régie connectée (`tvAlone(h)`, `host/gameOverView.js`), trois magentas forts en même temps :

| #   | Élément                                             | Où                                                                                               |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | « Soirée » du logo « ZIK Soirée » en haut à gauche  | `static/css/salon/tv-stage.css` l. 27-29 (`.sh-brand span`), `HostTopBar.svelte` l. 69           |
| 2   | « téléphones. » du titre « Sortez vos téléphones. » | `static/css/salon/tv-lobby.css` l. 54-57 (`.lb h1 em`), `HostLobby.svelte` l. 32                 |
| 3   | Bouton « Lancer la partie » (fond magenta)          | `src/routes/(site)/salon/host/+page.svelte` l. 77-83 (`.sx-btn-primary`, seulement si `tvAlone`) |

Deux petits en plus : le curseur de volume (`tv-stage.css` l. 93, `accent-color`) et les trois points de « Vérification de la musique » (`.sx-dots`, `MediaCheck` affiché sur la TV seulement sans régie, `HostLobby.svelte` l. 37).

`LobbyCountdown` n'est pas en cause : son chiffre magenta (3, 2, 1) est seul à l'écran pendant le décompte.

### La règle

**Le magenta montre ce qu'il faut faire maintenant.**

- Sans régie : c'est « Lancer la partie ». Il garde le magenta.
- Avec une régie : la TV n'a rien à cliquer, l'action est celle du public. « téléphones. » garde son magenta (comme aujourd'hui).

### Ce que deviennent les autres

| Élément                                             | Avant   | Après                                                                                            |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| « Soirée » du logo                                  | magenta | gris clair `var(--soft)` (#D6D7E4), sur toutes les phases de la TV. Le logo n'est pas une action |
| « téléphones. »                                     | magenta | blanc `var(--text)` **sans régie** ; magenta **avec régie** (inchangé)                           |
| « Lancer la partie »                                | magenta | inchangé                                                                                         |
| Curseur de volume                                   | magenta | blanc `var(--text)`, sur toutes les phases                                                       |
| Points de « Vérification de la musique » (lobby TV) | magenta | gris `var(--mid)`                                                                                |

Contraste : `#D6D7E4` sur `#050507` ≈ 14:1, au-dessus du 7:1 de la TV.

### Ce qui reste tel quel

Mise en page, tailles, textes, QR, code, bouton « Régie » (contour blanc), pastille verte « Régie connectée », bouton désactivé « En attente de joueurs ». Pendant la partie, le magenta reste au chrono en fin de manche (`warn`) et à « Pause ».

## 2. Nom de la soirée sur la story

### Ce que dit le code

- Aucun nom de soirée n'existe. Réglages de la création : `maxRounds`, `roundDuration`, `answerMode`, `manualNext`, `showAnswerDuration`, `teamCount`, `specials` (`setup/salonSetup.svelte.js` l. 13-21). Le serveur ne garde que ces réglages (`server/socket/salon/rooms.js` l. 44-66).
- Aucun nom de lieu non plus dans ZIK Pro : la ligne Pro n'a ni établissement ni enseigne.
- Seuls les noms d'équipe sont libres : `cleanTeamName`, 24 signes, `server/socket/salon/teams.js` l. 43.
- La story ne reçoit que la date (`play/podiumStory.js` l. 35) et la dessine en Barlow Condensed 800, 66 px, sous « ZIK● » (`header`, l. 116-132).

### La proposition (la plus simple)

**Un champ facultatif « Nom de la soirée » à la création**, pour tout le monde (gratuit et ZIK Pro), dans le bloc « Plus de réglages ».

- **Où** : `/salon`, première ligne de « Plus de réglages » (`SetupSheet.svelte`). Le chemin des 2 minutes ne s'allonge pas : le bloc est fermé par défaut.
- **Longueur** : 30 signes au plus (`maxlength="30"` côté page, coupé à 30 côté serveur). Espaces en trop retirés. Vide = pas de nom.
- **Mémorisé** avec les autres réglages (`saveSetup`, localStorage) : un bar le tape une fois, il revient prérempli la semaine suivante. Visible et modifiable avant chaque création.
- **Affichage** : seulement sur la story des téléphones. Pas sur la TV, pas dans l'historique des parties, pas dans les statistiques.
- **Sans nom** : la story reste identique à aujourd'hui (la date seule, 66 px).

### Données personnelles

- Le champ ne demande rien de personnel. L'exemple est neutre (« Quiz du jeudi »).
- Le nom vit dans `salon.settings` (mémoire et instantané `salon.snapshots`, qui disparaissent avec le salon). Il n'est **pas** écrit dans le résultat de partie (`persist.js`) ni dans le profil.
- Il n'apparaît que sur les téléphones des joueurs de cette soirée, puis sur l'image qu'ils choisissent de partager.

### Dessin de la story

En-tête avec nom :

1. « ZIK● » inchangé (120 px, point magenta).
2. Le nom en majuscules, Barlow Condensed 800, 66 px, haut de ligne à y = 330 (place actuelle de la date). Trop long : la taille descend de 4 en 4 jusqu'à 48 px (même méthode que `fitFont`), puis `maxWidth` de 860 px.
3. La date en JetBrains Mono 500, 32 px, espacement .14em, majuscules, couleur `#A3A6BA`, 16 px sous le nom (y ≈ 412 à 444). Reste au-dessus de la plus haute colonne (y = 472).

Le reste de l'image ne bouge pas.

## Parcours

1. L'organisateur ouvre `/salon`, choisit sa musique, ouvre « Plus de réglages », tape « Quiz du jeudi ». Le résumé du bloc fermé commence par « Quiz du jeudi · ».
2. « Créer la soirée » : le nom part avec les réglages (`/api/salon`, `settings.title`).
3. La TV et la régie ne changent pas.
4. Fin de partie, sur chaque téléphone : « Partager le podium en story » produit l'image avec « QUIZ DU JEUDI » puis la date.
5. Soirée suivante sur le même ordinateur : le champ est prérempli.

## États

| Cas                                                                 | Ce qui se passe                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Pas de nom                                                          | Story identique à aujourd'hui (date seule)                                                          |
| Nom de 30 signes                                                    | Une ligne, taille réduite jusqu'à 48 px                                                             |
| Nom fait d'espaces                                                  | Traité comme vide                                                                                   |
| Nom avec emoji ou caractère rare                                    | Dessiné par la police du système, pas bloqué                                                        |
| Ancienne préparation mémorisée sans nom ou avec une valeur invalide | Champ vide                                                                                          |
| Téléphone qui rejoint ou se reconnecte                              | Reçoit le nom avec les autres réglages (`salon_joined`)                                             |
| Redémarrage du serveur                                              | Le nom revient avec l'instantané (il est dans `settings`)                                           |
| Soirée ZIK Pro en plusieurs parties                                 | Le même nom sur la story de chaque partie                                                           |
| TV sans régie, 0 joueur                                             | Bouton désactivé « En attente de joueurs » (magenta atténué), titre blanc                           |
| Régie qui se connecte en plein lobby                                | « téléphones. » repasse en magenta, le bouton de la TV disparaît (comportement actuel de `tvAlone`) |

## Textes exacts

| Où                                  | Texte                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Libellé du champ                    | Nom de la soirée _facultatif_                                                                                             |
| Exemple dans le champ (placeholder) | Ex. : Quiz du jeudi                                                                                                       |
| Aide sous le champ                  | Il s'affiche sur l'image que les joueurs partagent en fin de partie. Sans nom, la date.                                   |
| Résumé de « Plus de réglages »      | le nom en tête, puis le résumé actuel : « Quiz du jeudi · 30 s pour répondre · suite automatique · réponse affichée 7 s » |
| Story                               | nom en majuscules (« QUIZ DU JEUDI »), puis la date (« 23 NOVEMBRE 2026 »)                                                |

## Critères de recette

Sur le staging.

1. TV sans régie au lobby, 1920×1080 : un seul élément magenta visible (« Lancer la partie »). « Soirée » du logo en gris clair, « téléphones. » en blanc, curseur de volume blanc, points de vérification gris.
2. Ouvrir la régie : le bouton de la TV disparaît, « téléphones. » repasse en magenta. Fermer la régie : retour au point 1.
3. En manche : chrono magenta en fin de manche, logo et volume neutres.
4. Création en 390 px et 1440 px : le champ est dans « Plus de réglages », zone de saisie ≥ 44 px, focus visible, 31e signe refusé.
5. Créer avec « Quiz du jeudi », jouer une partie à 2 téléphones (dont un iPhone) : la story affiche « QUIZ DU JEUDI » puis la date, sans chevauchement, en 1re place et en 4e place.
6. Créer sans nom : story identique à la v3.34.0.
7. Nom de 30 signes larges (« MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM ») : une seule ligne, rien ne sort de x 70–930.
8. Recharger un téléphone en fin de partie : la story garde le nom.
9. Payload hostile : `settings.title` de 10 000 signes, nombre, objet → le serveur garde au plus 30 signes de texte ou rien, sans erreur.
10. Le résultat de partie en base (`persist.js`) ne contient pas le nom.

## Fichiers touchés pour le dev

TV (CSS seulement, plus une classe) :

- `static/css/salon/tv-stage.css` : `.sh-brand span` → `var(--soft, #d6d7e4)` ; `.sh-vol input` → `accent-color: var(--text)`.
- `static/css/salon/tv-lobby.css` : `.lb h1 em` en blanc par défaut, magenta seulement avec une classe posée quand une régie est là ; `.lb .sx-dots i { background: var(--mid) }`.
- `src/lib/components/salon/host/HostLobby.svelte` l. 32 : `class:` sur `<em>` selon `h.controls` (réutiliser `tvAlone` de `gameOverView.js`).

Nom de la soirée :

- `src/lib/components/salon/setup/salonSetup.svelte.js` : `title` dans `KEYS` (part avec `settings()` et `saveSetup` sans autre code).
- `src/lib/components/salon/setup/SetupSheet.svelte` : le champ et le résumé.
- `src/lib/client/salonClient.js` : `setupFor` garde `title` seulement si c'est un texte de 30 signes au plus.
- `src/lib/server/socket/salon/rooms.js` (création, l. 44) : `title` nettoyé (même principe que `cleanTeamName` : texte, `trim`, espaces réduits, 30 signes), `null` si vide.
- `src/lib/server/socket/salon/join.js` l. 274 et `phoneView.js` l. 118 : `title` dans les réglages envoyés au téléphone.
- `src/lib/components/salon/play/playerEvents.js` et `salonPlayer.svelte.js` : garder `title`.
- `src/lib/components/salon/play/PlayGameOver.svelte` l. 19 et `podiumStory.js` (`storyData`, `header`, `drawStory` pour charger la police mono 500 avec le nom dans l'échantillon).
- Tests : `storyData` avec et sans nom, nettoyage serveur (entrées hostiles), `setupFor` avec valeur invalide, instantané (champ dans `settings`, déjà couvert si le test compare `settings` entier, à vérifier).

## Écarté

- **Garder le magenta sur « téléphones. » sans régie** et passer le bouton en blanc : le bouton est la seule chose que l'organisateur seul doit trouver de loin. Un bouton blanc ressemble au bouton « Régie ».
- **Point magenta à côté de « ZIK »** sur la TV (comme le logo du site) : un repère de plus, que Théo aurait compté.
- **Supprimer le mot « Soirée »** du logo : il dit à la salle ce qu'elle regarde, il suffit de l'éteindre.
- **Reprendre le nom du lieu Pro** : il n'existe nulle part (pas de champ établissement), et les groupes n'en ont pas.
- **Nom obligatoire** ou dans le parcours principal : allonge les 2 minutes de création pour un bonus.
- **Nom aussi sur la TV** (lobby, podium) : le lobby est déjà plein et la demande porte sur la story. À reproposer si Théo le veut.
- **Modifier le nom depuis la régie** : utile si on l'oublie, mais un second écran à toucher. Attend un vrai besoin remonté.
- **Nom sur deux lignes** : pousse la date sur la colonne de la 1re place.
- **Filtre de mots** : les noms d'équipe n'en ont pas, le nom n'est vu que par les joueurs présents et l'organisateur l'a tapé lui-même.

## À vérifier par `/tech` avant le code

- `salon_settings` (`rooms.js` l. 190 et 258) part à toute la salle avec `settings` entier : le nom arrive donc aussi aux téléphones par là. Pas de souci (ce n'est ni la réponse ni le média), mais garder une seule source côté téléphone.
- `admin.js` l. 60 : inutile d'y ajouter le nom.
