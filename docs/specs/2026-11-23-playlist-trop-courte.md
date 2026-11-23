# Playlist trop courte : les manches suivent les titres — fiche de cadrage

Statut : **à valider par Théo** (porte concept : ça se voit sur la création, la régie et le compteur TV).

Maquette (hors dépôt) : `C:\Users\Teamr\AppData\Local\Temp\claude\c23315e6417d4b11\4bf816a1-7c19-48ef-b732-f7835b9c5024\scratchpad\maquette-playlist\index.html`, captures `capture-390.png` et `capture-1440.png` dans le même dossier. Cinq écrans : création, régie avant la partie, régie Réglages, régie en partie, TV.

## Problème

Le 21/11, un bar (ZIK Pro) lance 5 manches avec une seule playlist de 3 titres. La TV affiche « Manche 3 / 5 », puis le podium arrive sans prévenir. L'organisateur signale un bug depuis la régie.

Ce que dit le code :

- Le serveur accepte une sélection dès 3 titres (`TROP_COURTES`, `src/lib/server/socket/salon/rooms.js` l. 14 et 39). Le choix des manches est borné de 5 à 20 (`rooms.js` l. 46), sans regarder le nombre de titres.
- `prepareSession` tire `maxRounds` titres (`salon/session.js` l. 40) ; `buildSessionPlaylist` en rend moins s'il n'y en a pas assez (`salon/tracks.js` l. 109).
- `startNextRound` finit la partie dès que la pile est vide (`salon/rounds.js` l. 168-173), sans message.
- Tout le monde affiche `settings.maxRounds` comme total : TV (`host/hostEvents.js` l. 49 et 106, `HostTopBar` l. 82, `HostCenter` l. 68), téléphones (`play/playerEvents.js` l. 56), régie (`regie/onglets.js`, « Manche en cours · 3 / 5 », puis « avant la manche 4 » au lieu de « avant le podium »).
- La vérification de la musique est trompeuse : elle compte la pile tirée, pas les manches choisies. Avec 3 titres pour 5 manches, la régie lit « Musique prête : 3 titres sur 3 » (`salon/media.js` l. 79, `regie/prep.js` `musiqueCheck`).
- La création l'écrit déjà, mais en petit et sans alerte : « 1 playlist · 3 titres · 5 manches » (`setup/SetupBar.svelte` l. 14).
- Titre injouable : `skipTrack` cherche un titre de réserve (`session.js` `drawSpareTrack`). Sans réserve, la partie perd une manche de plus, toujours sans message.

À noter : le jeu en ligne règle déjà ce cas (`src/lib/shared/rooms/settings.js`, `maxRounds(trackCount)` : « Pas plus de manches que de titres »). ZIK Soirée ne l'a pas.

## Objectif

Un organisateur ne voit jamais une partie s'arrêter avant le total affiché. Chiffre visé : **soirées réussies**. Suivi : nombre de parties terminées avec moins de manches que le total affiché au lancement. Cible : 0 (relevé dans le journal de fin de partie, `recordSalonGameEnd`).

## La règle

**La partie fait autant de manches que le plus petit des deux : manches choisies, titres jouables.** Le total affiché partout (TV, téléphones, régie) est ce nombre-là, et il dit toujours vrai.

- Le choix de l'organisateur reste mémorisé (5, 10, 15, 20). Il revient tout seul dès que la sélection a assez de titres. On ne le réécrit pas.
- Titres jouables : les titres de la sélection, moins ceux que la vérification n'a trouvés ni en vidéo ni en extrait, quand aucun titre de réserve ne les remplace.
- En partie, si un titre ne passe pas et qu'il n'y a plus de réserve, le total baisse de 1. La régie le dit, la TV montre juste le nouveau compteur.
- Rien n'est bloqué. On ne répète jamais un titre déjà joué.

Piste pour `/tech` (intuition, à vérifier) : ce total peut se calculer sans nouvel état, `min(maxRounds, currentRound + titres restants dans la pile)`. Aucun nouveau champ dans l'instantané (`salon/snapshot.js`). À envoyer avec les événements qui portent déjà `settings`.

## Parcours

1. **Création** (`/salon`, `SetupSheet` bloc 02, `SetupBar`). L'organisateur choisit 1 playlist de 3 titres et 5 manches. Le bloc 02 affiche « 3 titres » en orange à droite du titre (prop `aide` de `SetupBlock`, déjà là). Une alerte apparaît sous les boutons, avec un bouton qui remonte au bloc 01. La barre du bas affiche le vrai total. « Créer la soirée » reste actif.
2. **Régie avant la partie** (`RegiePrep`, contrôle « Musique » de `prep.js`). Le contrôle passe en « non » (orange, comme « Peu de clips disponibles »), avec un bouton qui ouvre la fenêtre « Changer de playlist » existante (`PlaylistModal`). Sous « Lancer la partie », une phrase remplace « La TV lance un décompte de 5 secondes. ».
3. **Régie Réglages** (`TabSettings`, ligne 02). Le résumé de la ligne donne le vrai total en orange. Sous les boutons des manches, la même alerte et le même bouton.
4. **L'organisateur ajoute une playlist.** Le total remonte à son choix (5). Alertes et phrases disparaissent. Il lance.
5. **Ou il lance quand même.** TV et téléphones affichent « Manche 1 / 3 ». À la manche 3, la régie dit « avant le podium » (`onglets.js`, déjà juste si le total est le vrai).
6. **En partie, un titre ne passe pas et la réserve est vide.** Le compteur passe de « 3 / 5 » à « 3 / 4 ». La régie écrit une ligne au journal et une phrase dans la barre du bas jusqu'à la fin de la manche.

## États

| État                                                 | Création                                            | Régie                                          | TV et téléphones              |
| ---------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| Titres ≥ manches                                     | rien de nouveau                                     | rien de nouveau                                | « Manche 1 / 5 »              |
| Titres < manches, avant la partie                    | alerte bloc 02, recap orange                        | contrôle Musique « non », phrase sous Lancer   | « Manche 1 / 3 »              |
| Vérification en cours                                | sans objet                                          | contrôle Musique « … » comme aujourd'hui       | inchangé                      |
| Vérification finie, titres introuvables sans réserve | sans objet                                          | contrôle Musique « non » avec les introuvables | total baissé                  |
| En partie, titre injouable, réserve vide             | sans objet                                          | journal + phrase dans la barre                 | compteur baissé, rien d'autre |
| Moins de 3 titres                                    | erreur serveur actuelle (`TROP_COURTES`), inchangée | idem dans « Changer de playlist »              | sans objet                    |
| Reconnexion, TV rechargée, serveur redémarré         | sans objet                                          | même total (calculé depuis la pile restaurée)  | même total                    |

## Textes exacts

Régie et création : tutoiement (comme `prep.js`, `SetupBar`). TV : aucun texte nouveau.

`{t}` = titres jouables, `{m}` = manches choisies. Seulement quand `{t} < {m}`.

| Où                                             | Texte                                                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Création, bloc 02, à droite du titre           | `{t} titres`                                                                                                            |
| Création, alerte bloc 02                       | **Ta sélection a {t} titres.** La partie fera {t} manches, pas {m}. Ajoute une playlist pour en jouer plus.             |
| Création, bouton de l'alerte                   | Ajouter une playlist                                                                                                    |
| Création, barre du bas                         | 1 playlist · {t} titres · {t} manches (le dernier chiffre en orange)                                                    |
| Régie, contrôle Musique, titre                 | {t} titres pour {m} manches                                                                                             |
| Régie, contrôle Musique, détail                | La partie fera {t} manches. Pour en jouer {m}, ajoute une playlist.                                                     |
| Régie, contrôle Musique, détail (introuvables) | {n} titre(s) introuvable(s), sans titre de réserve. La partie fera {t} manches. Pour en jouer {m}, ajoute une playlist. |
| Régie, bouton du contrôle et de Réglages       | Ajouter une playlist (ouvre la fenêtre « Changer de playlist »)                                                         |
| Régie, sous « Lancer la partie »               | **{t} manches seulement :** ta sélection n'a que {t} titres.                                                            |
| Régie, Réglages, résumé de la ligne 02         | {t} manches ({t} titres) · 30 s · suite automatique                                                                     |
| Régie, Réglages, alerte sous « Manches »       | **Ta sélection a {t} titres :** la partie fera {t} manches.                                                             |
| Régie, journal, en partie                      | Titre injouable passé : {artiste} - {titre}. Plus de titre en réserve : la partie fera {t} manches.                     |
| Régie, barre du bas, en partie                 | **Un titre ne passe pas** et il n'y a plus de titre en réserve : la partie fera {t} manches.                            |

Le « Changer de playlist » en pleine partie (`PlaylistModal` l. 26) garde son texte : « les {remaining} manches restantes » doit utiliser le vrai reste.

## Style

Rien de nouveau : l'alerte reprend `.rp-alerte` de `RegiePrep` (bord `rgb(255 179 71 / 0.5)`, fond 8 %, `--warn` pour le gras), le bouton reprend `.rg-em` (44 px). Orange et pas rouge : ce n'est pas une panne, c'est une info. Un seul bouton magenta par écran, il reste à « Lancer la partie ».

## Ce qui ne change pas

- Le plancher serveur de 3 titres et son message.
- Les choix 5, 10, 15, 20 : aucun bouton grisé.
- La TV : aucun bandeau, aucun mot nouveau. Seul le chiffre après la barre change.
- La pause, la panne de musique (`outage.js`), le remplacement d'un titre injouable par la réserve quand il y en a une.

## Critères de recette

Sur le staging, avec une playlist de test de 3 titres.

1. Création, 3 titres et 5 manches : alerte visible au bloc 02 en 390 px et 1440 px, barre « 1 playlist · 3 titres · 3 manches », « Créer la soirée » actif.
2. Régie en lobby : contrôle « 3 titres pour 5 manches » en orange, phrase sous « Lancer la partie ». « Ajouter une playlist » ouvre la fenêtre de playlists.
3. Ajouter une playlist de 20 titres depuis la régie : alertes et phrase disparaissent, Réglages affiche « 5 manches ».
4. Lancer avec 3 titres : TV, téléphones et régie affichent « 1 / 3 ». À la manche 3, la régie dit « avant le podium ». La partie finit après la manche 3, podium normal.
5. Choisir 10 manches avec 12 titres : aucune alerte, la partie fait 10 manches (pas de régression).
6. Titre injouable avec réserve vide (titre de test sans vidéo ni extrait) : le compteur baisse de 1 partout, journal et barre de la régie le disent, la partie finit sur le nouveau total.
7. Recharger la TV et un téléphone en manche 2 d'une partie de 3 : « 2 / 3 » après reprise. Redémarrage serveur (instantané) : même total.
8. Zones tactiles des nouveaux boutons ≥ 44 px, contraste AA (orange `#ffb347` sur `#050507`).
9. Test serveur : une partie à 5 manches choisies et 3 titres envoie un total de 3 et finit après 3 manches ; un titre injouable sans réserve fait baisser le total de 1.

## Écarté

- **Bloquer le lancement** (ou la création) quand titres < manches : en pleine soirée, une régie qui refuse de lancer est pire qu'une partie courte. Une partie de 3 titres pour tester est un usage légitime.
- **Avertir seulement**, sans changer le total : la TV affiche toujours « 3 / 5 » et la partie s'arrête net devant la salle. Le bug ressenti reste.
- **Rejouer des titres** pour atteindre le nombre choisi : les joueurs reconnaissent, les points sont faussés, ce n'est pas drôle.
- **Réécrire le choix des manches** (mettre `maxRounds` à 3) : le choix est perdu quand on ajoute une playlist, il faut le refaire.
- **Fenêtre de confirmation au lancement** : un geste de plus, lu en vitesse dans le bruit et vite ignoré.
- **Message sur la TV** quand un titre tombe : le public n'a rien à faire de cette info, le compteur suffit.
- **Monter le plancher serveur à 5 titres** : ne règle pas 5 titres pour 10 manches, et refuse des sélections valables.

## À vérifier par `/tech` avant le code

- Les écrans de l'admin (`admin/live/liveRooms.js`, `admin/salons/phase.js`) affichent aussi `round / maxRounds` : le support doit voir le même total que la régie.
- Les commandes de fin de partie sur la TV (`HostEndCommands.svelte` l. 41, choix « {n} manches ») : le total suit, pas de texte ajouté, à confirmer en solo (sans régie).
- `CardDrop` et `CardTray` (jeu en ligne) ne sont pas concernés.
