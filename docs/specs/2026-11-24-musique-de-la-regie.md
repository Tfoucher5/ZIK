# Le son des soirées : l'extrait sur la TV, « Votre sono » en secours — fiche de cadrage

Statut : **à valider par Théo** (deux changements, textes, questions en fin de fiche).

Remplace la fiche « Ta sono » (mode de jeu refusé le 24/11 : « ça enlève l'idée de simplifier l'organisation »). Il n'y a plus de choix ni de réglage : l'organisateur ne touche à rien tant que le son de ZIK répond.

Maquette (hors dépôt) : `C:\Users\Teamr\AppData\Local\Temp\claude\c23315e6417d4b11\4bf816a1-7c19-48ef-b732-f7835b9c5024\scratchpad\maquette-repli\index.html`, captures `capture-390.png` et `capture-1440.png` dans le même dossier.

## Problème

1. **YouTube peut tomber en pleine soirée.** Le 30/10, la recherche vidéo ne répondait plus chez un client Pro : les parties se terminaient en quelques secondes (mémoire « Incident salon 30/10 »). Depuis, le serveur passe sur l'extrait quand la vidéo manque (`salon/media.js`, `resolveMedia`), mais la vidéo reste le premier choix et la TV charge un lecteur YouTube devant la salle.
2. **Quand plus aucun son ne répond, la salle attend sans rien pouvoir faire.** Après 4 titres injouables d'affilée, `outage.js` met la partie en attente. La régie dit « Si ça dure, appelle un admin » (`src/routes/(site)/salon/regie/+page.svelte`, ligne 68). L'organisateur a souvent une sono et un téléphone avec Spotify ou Deezer à côté de lui, sans pouvoir s'en servir.

Chiffre visé : **soirées réussies**. Suivi dans `etat.md` : parties passées en « Votre sono », et temps entre le début de la panne et « C'est parti » (journal du salon, `note()`).

## Changement 1 : la TV joue l'extrait, plus la vidéo

**Ce qui change.** En ZIK Soirée, la TV joue l'extrait audio de 30 s de chaque titre au lieu de la vidéo cachée. À la révélation, elle affiche la pochette en grand (`AudioReveal`, déjà utilisé quand la vidéo manque). L'organisateur n'a rien à régler, rien ne change pour les joueurs. Le jeu en ligne ne change pas.

**Pourquoi.** Une seule source de son par soirée, déjà en place et déjà testée en secours. Écran plus sobre : plus de vidéo, donc plus de pub ni de logo possible devant la salle. Moins de choses à charger sur la TV.

**Titre sans extrait.** Comme aujourd'hui : la vérification du lobby (`checkSession`) le compte en « introuvable », il est remplacé par un titre de réserve, et le lobby annonce le vrai nombre de manches.

**Manche plus longue que l'extrait** (durée réglable de 15 à 60 s, `rooms.js`, ligne 202). Proposition : **l'extrait recommence au début**, sans rien d'autre. C'est déjà le comportement de la TV (`hostAudio.js`, ligne 18, `loop = true`), donc rien à coder ni à tester de neuf. À la révélation, l'extrait repart du début (`restart()`, déjà là). Refusé : limiter la durée à 30 s (change un réglage que les organisateurs ont déjà choisi) et couper le son à 30 s (un silence en pleine manche fait croire à une panne).

**Lobby, régie.** Le bilan de vérification (`MediaCheck.svelte`) ne parle plus de vidéos :

| Cas                     | Texte                                          |
| ----------------------- | ---------------------------------------------- |
| En cours                | Vérification de la musique : 6 / 10 (inchangé) |
| Tout est là             | ✓ Musique prête : 10 titres sur 10 (inchangé)  |
| Titres remplacés        | ✓ 8 titres prêts · 2 remplacés automatiquement |
| Alerte « peu de clips » | supprimée (n'a plus de sens)                   |

## Changement 2 : le bouton de secours « Votre sono »

**Invisible en temps normal.** Il n'existe que dans la régie, et seulement quand la partie est en panne de son (`game.videoOutage`). Sans régie ouverte, la panne reste celle d'aujourd'hui.

### Parcours

1. **Panne.** Le son de ZIK ne répond plus (même seuil qu'aujourd'hui, 4 titres d'affilée). La partie attend, la TV affiche « Petite pause technique » (inchangé). Dans la régie, l'encart actuel devient : **« Le son de ZIK ne répond pas. »**, une phrase d'aide et un bouton magenta **« Passer sur ma sono »**. ZIK continue de réessayer seul tant que personne n'appuie.
2. **Un appui, sans confirmation** (la salle attend déjà). La panne s'efface sur la TV et les téléphones. La manche en attente repart en « Votre sono » : décompte 3, 2, 1, puis la régie affiche **« Lance ce titre »**, la pochette, le titre et l'artiste en clair, et le bouton **« C'est parti »**. Au-dessus, une fois, le bandeau d'avertissement (voir plus bas). La TV affiche « La musique arrive » (inchangé), sans jouer de son.
3. **« C'est parti ».** L'animateur a lancé le titre sur sa sono, il appuie. Le chrono part sur la TV et les téléphones. La régie repasse au titre brouillé habituel (`RegieAnswer`). Pause et Révéler comme aujourd'hui.
4. **Révélation.** Pochette sur la TV, comme au changement 1. La régie ajoute **« Prochain titre : Take On Me – a-ha. Prépare-le. »** (à la dernière manche : « C'était le dernier titre. Le podium arrive. »).
5. **Manches suivantes** : retour à l'étape 2 (« Lance ce titre »), jusqu'au retour au son de ZIK.

### Retour au son de ZIK

- **À la main, toujours possible.** Une ligne en haut de la régie : « Le son : ma sono » et le lien **« Revenir au son de ZIK »**. Le retour vaut pour la manche suivante (la sono joue peut-être déjà).
- **Quand le son de ZIK répond de nouveau** : proposé, pas automatique. À chaque manche en « Votre sono », le serveur vérifie l'extrait du titre suivant (déjà fait par `previewUrl`, avec cache). S'il répond, la ligne du haut devient verte : **« Le son de ZIK répond de nouveau. »** avec le bouton **« Revenir au son de ZIK »**. Refusé, le retour automatique : l'animateur a souvent déjà lancé le titre suivant sur sa sono, la salle entendrait deux musiques à la fois.
- Si le son de ZIK retombe après le retour, la panne revient et le bouton aussi.

### Ce qui ne casse jamais la soirée

- **Pas de chrono automatique** en « Votre sono » : le son vient de l'animateur. Après 45 s sans « C'est parti », la phrase de la barre passe en orange : « La salle attend. Lance le titre ou passe-le. »
- **« Passer ce titre »** (bouton secondaire) : l'animateur ne trouve pas le titre. Un titre de réserve le remplace, la manche n'est pas perdue, aucun signalement de titre n'est créé.
- **Régie absente plus de 60 s** (téléphone en veille) pendant « Votre sono » : la partie revient seule au son de ZIK. S'il est toujours en panne, la partie attend comme aujourd'hui, et le bouton revient avec la régie. Au retour, un bandeau dit ce qui s'est passé.
- **Pause** : la note rappelle « Le chrono est arrêté. Baisse ta sono toi-même. »
- **Buzzer** : la note dit « Coupe le son : {pseudo} répond à voix haute. »
- **Intro éclair** (musique coupée à 5 s, `salonOptions.js`, ligne 18) : jamais tirée en « Votre sono », la régie ne peut pas couper la sono. Points doubles et Sprint restent.
- **Redémarrage du serveur** : « Votre sono » est gardé dans l'instantané, la manche reprend à « Lance ce titre ».

### Le piège de l'écran de la salle

En « Votre sono », la régie affiche la réponse en clair avant la manche. Si elle est ouverte sur l'ordinateur branché à la TV, toute la salle la voit. Un seul filet, simple : au passage en « Votre sono », un bandeau orange au-dessus du titre, **« Le titre s'affiche ici en clair. Si cette régie est sur l'écran de la salle, tout le monde le voit. »**, fermé par « Compris ». Il ne bloque pas la manche. Refusé : la fenêtre de confirmation et la détection de la TV dans le même navigateur (de la mécanique pour un cas rare, en pleine panne).

## Textes

### Régie (tu)

| Où                          | Texte                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Panne, titre de l'encart    | Le son de ZIK ne répond pas.                                                                                  |
| Panne, aide                 | Lance les titres sur ta sono : ZIK garde le chrono, les réponses et les points.                               |
| Panne, bouton               | Passer sur ma sono                                                                                            |
| Panne, ligne discrète       | Sinon, ZIK réessaie tout seul (prochain essai dans 20 s).                                                     |
| Bandeau d'avertissement     | Le titre s'affiche ici en clair. Si cette régie est sur l'écran de la salle, tout le monde le voit. · Compris |
| Ligne du haut               | Le son : ma sono · Revenir au son de ZIK                                                                      |
| Ligne du haut, son revenu   | Le son de ZIK répond de nouveau. · Revenir au son de ZIK                                                      |
| Retour demandé              | Le son de ZIK reprend à la manche suivante.                                                                   |
| Lancement, étiquette        | À lancer · Manche 3 / 10                                                                                      |
| Lancement, titre            | Lance ce titre                                                                                                |
| Lancement, note de la barre | Le chrono démarre quand tu appuies sur « C'est parti ».                                                       |
| Attente longue              | La salle attend. Lance le titre ou passe-le.                                                                  |
| Boutons                     | C'est parti · Passer ce titre                                                                                 |
| Titre passé                 | Titre passé. À lancer à la place : …                                                                          |
| Révélation                  | Prochain titre : Take On Me – a-ha. Prépare-le.                                                               |
| Dernière manche             | C'était le dernier titre. Le podium arrive.                                                                   |
| Pause                       | Le chrono est arrêté. Baisse ta sono toi-même.                                                                |
| Buzzer                      | Coupe le son : {pseudo} répond à voix haute.                                                                  |
| Régie revenue               | Ta régie ne répondait plus : la partie est revenue au son de ZIK.                                             |

### TV et téléphones

- TV : aucun texte nouveau. La salle ne voit pas d'où vient le son.
- Téléphone : « La musique arrive sur la TV… » (`RoundPlay.svelte`, ligne 51) devient « La musique arrive… » (en « Votre sono », elle ne vient pas de la TV). Jamais le titre ni le média, dans tous les cas.

## À vérifier par `/tech` avant le code

1. **Extrait d'abord** : `resolveMedia` et `checkSession` cherchent l'extrait seulement (plus `findVideo` en salon). Le lecteur YouTube de la TV n'a plus de raison d'être chargé en salon : le retirer ou le laisser inerte, au choix le plus sûr.
2. **« Votre sono »** : un champ d'état de partie sérialisable (instantané et son test). En « Votre sono », `roundData` part sans média, et la TV ne doit pas prendre cette absence pour une erreur (sinon titre sauté et fausse panne).
3. **« C'est parti »** : `salon_music_ready` n'accepte que la TV (`control.js`, ligne 161). En « Votre sono », l'accepter de la régie seulement, et ne pas armer `musicReadyTimer` (`rounds.js`, ligne 256).
4. **Nouveaux handlers** (passer sur ma sono, revenir, passer ce titre) via `safe()`, régie seulement, avec entrées hostiles : hors panne, hors partie, depuis un téléphone.
5. **Titre à lancer et suivant** : seulement dans `hostInfo` (vers `salon:ctrl`), jamais vers la TV ni les téléphones.
6. **Régie absente 60 s** : brancher sur `_ctrlLeaveTimer` (`leave.js`, ligne 67).

## Critères de recette

- Staging, 1 TV, 1 régie au téléphone, 4 téléphones, manches de 60 s : la TV joue l'extrait, il reprend au début après 30 s sans coupure de partie ; révélation avec pochette ; aucune vidéo chargée par la TV.
- Lobby : sur 5 playlists du catalogue et 1 playlist importée de YouTube, noter la part de titres avec extrait. Sous 90 %, on en reparle avant la release.
- Panne simulée (source du son coupée dans admin › Réglages) : le bouton « Passer sur ma sono » apparaît, et seulement à ce moment. Un appui : la manche repart en moins de 2 s, le chrono ne part qu'au « C'est parti ».
- TV et téléphones n'affichent jamais titre, artiste ni pochette avant la révélation, dans les deux modes.
- Son de ZIK rallumé : la régie le propose, rien ne bascule seul. « Revenir au son de ZIK » reprend à la manche suivante.
- Régie fermée 60 s en « Votre sono » : la partie revient au son de ZIK, la régie le dit à son retour.
- Redémarrage du serveur en « Votre sono » : la manche reprend à « Lance ce titre ».
- Régie 390 px : « C'est parti » dans la moitié basse, 60 px de haut au moins, sans défilement.

## Questions pour Théo

1. **Les mots du bouton.** La régie tutoie : je propose « Passer sur ma sono » et « Le son : ma sono » plutôt que « Votre sono » (qui vouvoierait au milieu d'une régie en « tu »). D'accord ?
2. **Retour au son de ZIK** : proposé par la régie quand il répond de nouveau, jamais automatique (risque de deux musiques à la fois). D'accord ?
