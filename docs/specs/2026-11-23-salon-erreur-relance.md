# Écran de relance des écrans du salon — fiche de cadrage

Statut : **validée par Théo le 23/11** (concept, textes, durées tels quels). Question 3 : la 2e ligne de pause longue est gardée. Question 4 : prévenir la régie quand la TV se relance = tâche à part, pas dans ce chantier. Rappel de Théo : la priorité reste qu'un écran ne plante jamais ; cet écran est le filet, pas la solution.

Maquette (hors dépôt) : `/mnt/project-files/salon-erreur/maquette.html` (les décomptes tournent, cinq états au choix), captures `maquette.png` (1er essai) et `maquette-pause.png` (pause longue) dans le même dossier.

## Problème

Avec SvelteKit 3 (PR #561, `chore/kit-3`), chaque page est entourée d'une frontière d'erreur. Une exception de rendu sur la TV, la régie ou le téléphone (gabarit, `$derived`, `$effect`) remplace toute la page par `src/routes/+error.svelte` : « Erreur 500 · L'ampli a sauté », bouton « Réessayer », jusqu'à ce que quelqu'un recharge à la main. Dans un bar, la TV affiche ça devant le public et personne n'est au clavier.

## Objectif

Un écran du salon qui plante se remet seul dans la partie, sans mot technique ni image de panne devant la salle. Chiffre visé : **soirées réussies**. Suivi : nombre de relances par semaine et part reparties au 1er essai (journal des erreurs, voir « Ce qui est journalisé »).

## L'idée : on retourne le disque

Le public ne voit pas une panne, il voit un temps du spectacle : le disque se retourne, 3, 2, 1, la musique repart. Le chiffre est posé sur l'étiquette du disque, le disque se retourne à chaque seconde (le geste est le décompte). C'est le « 3, 2, 1 » que la TV montre déjà avant un titre (`BigCountdown`), dans la famille des erreurs du site (« Le disque est rayé »), mais en positif.

Un seul objet (le disque), décliné sur les trois écrans. **Le magenta dit où ça se passe** : l'étiquette du disque tant que ça repart seul (le bouton reste discret : il n'y a rien à faire) ; le bouton quand c'est à l'utilisateur d'agir (pause longue, réseau), et l'étiquette passe alors en neutre avec le signe pause, disque arrêté.

## Quand l'écran apparaît

- Sur `/salon/host`, `/salon/regie` et `/salon/play` seulement, quand la frontière d'erreur attrape une exception inattendue (rendu ou chargement, statut 500 et plus).
- Chaque écran se relance pour lui-même : la régie qui plante n'arrête ni la TV ni les téléphones.
- Pas pour les erreurs attendues (lien invalide, accès refusé, 4xx) : elles gardent leur écran actuel.
- Pas pour ce qui a déjà son message : connexion perdue, mise à jour de ZIK, musique qui ne répond pas, pause. Rien ne change là.

## Ce que chaque écran affiche

Règles communes : toujours sombre, aucun mot technique (« erreur », « 500 », « serveur », « bug », « recharger » côté public), pas de rouge, pas d'emoji, pas de son, aucune navigation du site. Le code de la soirée (lu dans l'adresse) reste affiché : c'est toujours la même soirée.

### TV (vous pluriel, voix festive, lisible à 5 m)

Rien d'utile sous 28 px en 1920 × 1080, marge 64 px, aucun bouton. Titre à gauche, disque à droite coupé par le bord, chiffre d'environ 300 px de haut sur l'étiquette.

| État                   | Titre                  | Texte                                                                                          | Disque              |
| ---------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------- |
| 1er essai              | On retourne le disque. | La soirée reprend toute seule. Personne ne perd sa place ni ses points.                        | 3, 2, 1             |
| 2e et 3e essais        | Encore un tour.        | Le disque se remet en place. Personne ne perd sa place ni ses points.                          | 10 puis 30 secondes |
| Pause longue           | Petite pause.          | La soirée reprend dans un instant. Personne ne perd sa place ni ses points.                    | arrêté, signe pause |
| Pause longue, 2e ligne |                        | Si l'écran reste ici, rechargez la page de la TV.                                              |                     |
| Réseau                 | Petite pause.          | La TV attend le retour d'internet. La soirée reprend toute seule, personne ne perd ses points. | arrêté, signe pause |
| Réseau, 2e ligne       |                        | Vérifiez la connexion de la TV.                                                                |                     |

### Régie (tu, voix sobre, d'une main)

L'organisateur doit savoir ce que voit son public : la première ligne le dit. Bouton en bas, 52 px.

| État         | Étiquette     | Titre                         | Texte                                                                        | Bouton                                          |
| ------------ | ------------- | ----------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| 1er essai    | Relance       | La régie redémarre.           | Retour dans 3 secondes, sans rien faire.                                     | Relancer maintenant (discret)                   |
| 2e essai     | Relance       | Nouvel essai.                 | La régie n'est pas repartie du premier coup. Retour dans 10 secondes.        | Relancer maintenant (discret)                   |
| 3e essai     | Relance       | Troisième essai.              | Retour dans 30 secondes. Ensuite, un essai par minute.                       | Relancer maintenant (discret)                   |
| Pause longue | Relance lente | La régie ne repart pas seule. | Un essai par minute, sans rien faire. Tu peux aussi relancer toi-même.       | Relancer maintenant (magenta), Appeler un admin |
| Réseau       | Réseau perdu  | Pas de connexion.             | La régie revient dès que le réseau revient. Vérifie le wifi de cet appareil. | Réessayer (magenta)                             |

Toujours affiché dessous :

- « La partie n'est pas arrêtée. La TV et les joueurs ne voient pas cet écran. » (en état Réseau : « La partie continue sur la TV tant qu'elle a internet. »)
- « Les points et les places sont gardés. »
- En pause longue : « Tu peux aussi ouvrir la régie sur un autre appareil, avec le même lien. »
- Ligne discrète : « Essai 2 sur 3 » (ou « Un essai par minute », « En attente du réseau ») et « Réf. CODE · heure », à donner au support.

### Téléphone joueur (tu, voix festive, 390 px)

Disque en haut, texte et bouton dans la moitié basse, aucun défilement.

| État         | Titre           | Texte                                                             | Bouton                          |
| ------------ | --------------- | ----------------------------------------------------------------- | ------------------------------- |
| 1er essai    | Bouge pas.      | On retourne le disque. Tu reviens dans la partie dans 3 secondes. | Revenir tout de suite (discret) |
| 2e essai     | Encore un tour. | Le disque se remet en place. Retour dans 10 secondes.             | Revenir tout de suite (discret) |
| 3e essai     | Encore un tour. | Dernier réglage. Retour dans 30 secondes.                         | Revenir tout de suite (discret) |
| Pause longue | Petite pause.   | Ça repart tout seul : garde cette page ouverte.                   | Réessayer maintenant (magenta)  |
| Réseau       | Plus de réseau. | On te ramène dans la partie dès que ça revient.                   | Réessayer (magenta)             |

« Ta place et tes points sont gardés. » ne s'affiche que si le téléphone sait qu'il jouait (reprise connue de `resume.js`) : sur le formulaire d'entrée, la phrase serait fausse.

## La relance

1. **1er essai : 3 secondes**, puis rechargement de la page. L'écran rejoint la partie en cours (état côté serveur).
2. **Ça replante dans les 2 minutes : 10 secondes**, puis **30 secondes**. Le disque ne se retourne que sur les 3 dernières secondes, avant il compte sans bouger.
3. **Ensuite, pause longue** : plus de chiffre, un essai toutes les 60 secondes, sans fin (une TV sans personne au clavier ne doit jamais rester bloquée).
4. Un écran qui a tenu 2 minutes sans replanter repart de zéro.
5. Le bouton relance tout de suite et compte comme un essai.

Garde-fous :

- Compteur d'essais par écran et par soirée dans `sessionStorage`. Stockage indisponible : on part de l'essai à 30 secondes, jamais de boucle rapide.
- **Avant chaque rechargement, l'écran vérifie que ZIK répond** (`/healthz`, sans cache, 4 secondes au plus). Sinon état « Réseau » : il attend ici et réessaie au retour du réseau. On n'échange jamais notre écran contre la page d'erreur du navigateur, qui ne se relance pas.
- Jamais plus d'un rechargement automatique par minute une fois en pause longue.
- Onglet caché ou téléphone en veille : pas de rechargement en arrière-plan, relance au retour sur la page.
- Si l'écran de relance lui-même plante : repli sur un texte fixe et un rechargement à 30 secondes, écrits sans dépendance.
- `prefers-reduced-motion` : le chiffre change sans retournement, le reflet ne tourne pas, tout se lit.
- Lecteur d'écran : une annonce à l'apparition (« Retour dans 3 secondes »), pas une par seconde. Régie et téléphone : focus sur le bouton.

## Ce qui est journalisé

Aujourd'hui un plantage de rendu côté navigateur ne laisse aucune trace (pas de `hooks.client.js`, `handleError` ne voit que le serveur). Avec cette fiche, un envoi par plantage (pas par seconde), avant le décompte :

- écran (TV, régie, téléphone), code de la soirée, numéro de l'essai ;
- message de l'exception et début de la pile, tronqués ;
- version de l'application, navigateur, heure.

Jamais le pseudo, la clé de régie ni le jeton du joueur. Côté serveur : entrée validée par un schéma, limitée en débit, écrite dans le journal existant (`ops.errors`, alerte aux admins comme pour toute erreur). La « Réf. » de la régie (code et heure) permet au support de retrouver la ligne.

## Ce qui ne change pas

- Le reste du site garde `src/routes/+error.svelte` (« Le disque est rayé », « L'ampli a sauté », bouton Réessayer, pas de relance automatique).
- Les règles de jeu, les événements Socket.io, l'instantané des salons : aucun changement. Pas de nouveau message entre écrans.
- Les messages existants du salon (connexion perdue, mise à jour, musique qui ne répond pas, pause) et leurs textes.

## À vérifier par `/tech` avant le code

Trois points vus en lisant le code, non testés. Ils décident si « se relance tout seul » est tenu :

1. **Téléphone** : après un rechargement, `JoinForm` affiche la carte « Re-bonjour {pseudo}. Reprends ta place dans la partie. » : il faut un appui. Après une relance automatique, le téléphone doit rejoindre sans appui (marqueur posé juste avant le rechargement, valable une fois).
2. **TV, son** : un rechargement sans geste peut bloquer le son du lecteur selon le navigateur (règles de lecture automatique). À mesurer sur Chrome, Firefox et une TV connectée.
3. **TV, plein écran** : le plein écran demandé par « Plein écran et activer le son » se perd au rechargement, la barre du navigateur revient devant le public. Si 2 ou 3 échouent, étudier un remontage de la page sans rechargement au 1er essai (même écran, même décompte), rechargement ensuite.

Aussi : où poser l'écran (`src/routes/(site)/salon/` ne contient que les trois écrans, la préparation est ailleurs), composants sous 300 lignes, boutons des écrans du salon au moment du code (la maquette montre les pilules du `DESIGN.md` v2), « Appeler un admin » branché sur l'aide existante (`SalonHelp`) si elle peut vivre hors de la page plantée.

## Critères de recette

- Exception provoquée sur chaque écran en pleine manche (staging) : l'écran de relance s'affiche, puis l'écran retrouve la partie sans aucune action, points et places intacts, les deux autres écrans n'ont rien vu.
- Exception qui se répète : 3 s, 10 s, 30 s, puis un essai par minute ; jamais deux rechargements en moins de 3 secondes ; retour à zéro après 2 minutes de bon fonctionnement.
- Réseau coupé pendant le décompte : état « Réseau », pas de page d'erreur du navigateur, retour seul au rétablissement.
- TV en 1920 × 1080 : tout se lit à 5 m, aucun mot technique, un seul magenta. Régie en 390 px et 1024 px, téléphone en 390 px et sur un vrai iPhone : bouton dans la moitié basse, aucun défilement.
- Une ligne par plantage dans `ops.errors`, sans donnée personnelle. Test d'entrées hostiles sur le point d'envoi.
- Une erreur sur une autre page du site : écran actuel, inchangé.

## Questions pour Théo

1. Le concept et les textes (« On retourne le disque. », « Bouge pas. », « Encore un tour. », « Petite pause. ») : validés, à corriger, refusés ?
2. Les durées : 3 s, 10 s, 30 s, puis un essai par minute sans fin. D'accord ?
3. En pause longue, la TV affiche « Si l'écran reste ici, rechargez la page de la TV. » devant le public. D'accord, ou rien du tout ?
4. Hors de cette fiche : veux-tu que la régie soit prévenue quand la TV se relance (« La TV se relance, retour dans 3 secondes ») ? C'est un message de plus entre écrans, donc une tâche à part.
