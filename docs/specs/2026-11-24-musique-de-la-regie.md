# Ta sono : l'organisateur lance la musique, ZIK fait le jeu — fiche de cadrage

Statut : **à valider par Théo** (concept, parcours, textes, question 1).

Maquette (hors dépôt) : `C:\Users\Teamr\AppData\Local\Temp\claude\c23315e6417d4b11\4bf816a1-7c19-48ef-b732-f7835b9c5024\scratchpad\maquette-sono\index.html`, captures `capture-390.png` et `capture-1440.png` dans le même dossier. Cinq états, régie 390 px et TV 1920 × 1080 côte à côte : lancement, manche en cours, révélation, bascule depuis la panne, avertissement « écran de la salle ».

## Problème

1. **Quand le son de ZIK ne répond pas, la salle attend.** Après 4 titres injouables d'affilée, `outage.js` met la partie en attente et réessaie toutes les 10 à 60 s. La TV affiche « Petite pause technique », la régie « La musique ne répond pas… Si ça dure, appelle un admin » (`src/routes/(site)/salon/regie/+page.svelte`, ligne 66). L'organisateur n'a rien à faire, donc rien à tenter : sa soirée dépend de nous. Cas réel : incident du 30/10.
2. **Beaucoup d'organisateurs ont déjà leur son.** Un bar a sa sono et ses comptes Spotify ou Deezer, un animateur sa propre playlist. Aujourd'hui ZIK impose son lecteur, sur la TV.

## Objectif

Une soirée ne s'arrête jamais faute de son : l'organisateur peut lancer lui-même chaque titre sur sa sono, en un geste, pendant que ZIK garde le chrono, les réponses, les points et la révélation. Pour les pros, c'est aussi une liberté : leur son, leur matériel, notre jeu.

Chiffre visé : **soirées réussies** (une panne de son ne coupe plus une partie). Suivi dans `etat.md` : parties terminées en mode « Ta sono », dont celles passées depuis la panne, et temps entre le début de la panne et la bascule (journal du salon, `note()`).

## L'idée : tu passes les disques, ZIK fait le jeu

Un DJ a toujours le disque suivant prêt dans le bac. La régie devient ce bac : elle montre le titre à lancer maintenant, puis le suivant à préparer pendant la révélation. Un seul geste lance la manche : **« C'est parti »**, quand le son joue. Le chrono part à ce moment, pas avant. La TV ne montre que « Écoutez bien… » : la réponse n'existe que sur la régie, jusqu'à la révélation, où la TV pose la pochette comme aujourd'hui sans vidéo.

## Deux sources de son

| Source     | Qui joue le titre                   | Quand le chrono démarre                                  |
| ---------- | ----------------------------------- | -------------------------------------------------------- |
| Son de ZIK | la TV (aujourd'hui, rien ne change) | quand la TV signale que la musique joue, ou 12 s au plus |
| Ta sono    | l'organisateur, sur son matériel    | quand l'organisateur touche « C'est parti » sur la régie |

Le choix se fait dans la régie : avant la partie (Réglages, ligne 01 « La musique », et la liste de vérification de l'onglet Direct), et en pleine partie depuis l'encart de panne. Il demande une régie ouverte : sans régie, une soirée TV seule garde le mode panne d'aujourd'hui. La page de création ne change pas.

## Parcours

### A. Préparer avant la partie (facultatif)

1. Régie, onglet Réglages, ligne 01 « La musique » : segment **Le son : Son de ZIK · Ta sono**.
2. Choisir « Ta sono » ouvre l'avertissement (voir E). Confirmé, la liste de vérification de Direct remplace la ligne « Son testé » par **« Le son : ta sono »** avec le bouton **« Copier la liste »**.
3. « Copier la liste » copie les titres dans l'ordre de la partie, un par ligne : `Manche 1 · Michael Jackson – Billie Jean`. L'organisateur la colle dans sa recherche Spotify, Deezer, ou prépare sa playlist.

### B. Une manche en mode « Ta sono »

1. **Lancement.** La manche commence (décompte 3, 2, 1 inchangé). La régie affiche en clair : « Manche 3 : lance » + titre + artiste, avec la pochette. Action magenta pleine largeur : **« C'est parti »**. Action secondaire : « Passer ce titre » (titre introuvable : un titre de réserve le remplace, la manche n'est pas consommée). Ligne « Sur la TV : La musique arrive ». TV et téléphones : leur écran d'attente actuel.
2. **Manche en cours.** L'organisateur touche « C'est parti » : chrono lancé sur la TV et les téléphones, choix affichés. La régie repasse au titre brouillé de `RegieAnswer` (« Afficher la réponse »), comme aujourd'hui. Barre : Pause, Révéler.
3. **Révélation.** Comme aujourd'hui côté TV, avec la pochette (`AudioReveal`). La régie ajoute l'encart **« Prochain titre : … Prépare-le. »** À la dernière manche : « C'était le dernier titre. Le podium arrive. »
4. Manche suivante : retour à l'étape 1.

### C. Basculer depuis la panne

1. Le son de ZIK ne répond pas (même seuil qu'aujourd'hui : 4 titres d'affilée). La partie se met en attente, comme aujourd'hui.
2. L'encart de la régie devient : **« Le son de ZIK ne répond pas. Passe sur ta sono. »** et un bouton magenta **« Passer sur ta sono »**. ZIK continue de réessayer en fond tant que l'organisateur n'a rien touché.
3. Un appui, sans confirmation supplémentaire (la salle attend déjà) : la panne s'efface, la manche en attente repart tout de suite en mode « Ta sono » (étape B1). L'avertissement E s'affiche une fois, en bandeau, pas en fenêtre.
4. **Retour.** En mode « Ta sono », la régie garde une ligne discrète : « Le son : ta sono » et **« Revenir au son de ZIK »**. Le retour s'applique à la manche suivante. Si le son de ZIK ne répond toujours pas, la panne revient et on propose de nouveau la sono.

### D. Ce qui ne bloque jamais la soirée

- Pas de délai automatique sur « C'est parti » : l'organisateur est là, le son vient de lui. Si la salle attend plus de 45 s, la phrase de la barre passe en orange : « La salle attend. Lance le titre ou passe-le. »
- **Régie absente** (téléphone en veille, batterie) plus de 60 s pendant une manche en mode « Ta sono » : la partie repasse seule sur le son de ZIK et le note dans le journal. Si le son de ZIK était en panne, la partie attend comme aujourd'hui. Au retour de la régie, un bandeau dit ce qui s'est passé.
- Une seule régie connectée suffit ; si deux régies sont ouvertes, « C'est parti » de l'une vaut pour les deux.
- Pause : arrête le chrono de ZIK. La barre rappelle « Baisse ta sono toi-même. »
- Buzzer : quand un joueur buzze, la note dit « Coupe le son : Léa répond à voix haute. »
- Manche spéciale « Intro éclair » (musique coupée à 5 s) : jamais tirée en mode « Ta sono ». « Points doubles » et « Sprint » restent.

### E. Le piège de l'écran de la salle

En mode « Ta sono », la régie affiche la réponse en clair avant la manche. Si elle est ouverte sur l'ordinateur branché à la TV, toute la salle la voit.

- **Au premier passage en « Ta sono »** (Réglages) : fenêtre « Le titre à lancer s'affiche ici en clair. » avec deux choix : « Ma régie est sur mon téléphone » (confirme) et « Annuler ».
- **Depuis la panne** : même phrase, en bandeau orange au-dessus du titre, sans bloquer la bascule.
- **TV ouverte dans le même navigateur** (détectée entre onglets, `BroadcastChannel`, sans serveur) : bandeau permanent « La TV est ouverte sur cet ordinateur. Ce que tu vois ici est peut-être sur l'écran de la salle. » et le titre reste brouillé jusqu'à un appui sur « Afficher ». Intuition : même navigateur = même machine dans la quasi-totalité des cas ; à mesurer en recette.

## Textes

### Régie (tu, sobre)

| Où                               | Texte                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Réglages, segment                | Le son : **Son de ZIK** · **Ta sono**                                                                             |
| Réglages, aide sous le segment   | Ta sono : tu lances chaque titre sur ton matériel, ZIK garde le chrono, les réponses et les points.               |
| Liste de vérification            | **Le son : ta sono.** Prépare tes titres avant de lancer. Bouton : Copier la liste                                |
| Après la copie                   | Liste copiée : 10 titres dans l'ordre.                                                                            |
| Lancement, étiquette             | À lancer · Manche 3 / 10                                                                                          |
| Lancement, titre                 | Lance ce titre                                                                                                    |
| Lancement, aide                  | Le chrono démarre quand tu touches « C'est parti ».                                                               |
| Lancement, ligne TV              | Sur la TV : « La musique arrive »                                                                                 |
| Boutons                          | C'est parti · Passer ce titre                                                                                     |
| Attente longue                   | La salle attend. Lance le titre ou passe-le.                                                                      |
| Titre passé                      | Titre passé. Celui-ci le remplace : …                                                                             |
| En cours, note de la barre       | Révéler affiche la réponse sur la TV sans attendre la fin du chrono. (inchangée)                                  |
| Pause, note                      | Le chrono est arrêté. Baisse ta sono toi-même.                                                                    |
| Buzzer, note                     | Coupe le son : {pseudo} répond à voix haute.                                                                      |
| Révélation, encart               | **Prochain titre :** Take On Me – a-ha. Prépare-le.                                                               |
| Révélation, dernière manche      | C'était le dernier titre. Le podium arrive.                                                                       |
| Panne, encart                    | **Le son de ZIK ne répond pas.** Passe sur ta sono : tu lances les titres, ZIK garde le chrono et les points.     |
| Panne, bouton                    | Passer sur ta sono                                                                                                |
| Panne, ligne discrète            | Sinon, ZIK réessaie tout seul (prochain essai dans 20 s).                                                         |
| Ligne permanente en mode sono    | Le son : ta sono · Revenir au son de ZIK                                                                          |
| Retour demandé                   | Le son de ZIK reprend à la manche suivante.                                                                       |
| Régie revenue après bascule auto | Ta régie ne répondait plus : la partie est repassée sur le son de ZIK.                                            |
| Avertissement, titre             | Le titre à lancer s'affiche ici en clair.                                                                         |
| Avertissement, texte             | Si cette régie est sur l'écran de la salle, tout le monde verra la réponse. Ouvre-la sur ton téléphone.           |
| Avertissement, boutons           | Ma régie est sur mon téléphone · Annuler                                                                          |
| TV dans le même navigateur       | La TV est ouverte sur cet ordinateur. Ce que tu vois ici est peut-être sur l'écran de la salle. Bouton : Afficher |

### TV (vous pluriel, festive)

| Moment                | Texte                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| Avant « C'est parti » | Manche 3 / 10 · La musique arrive (inchangé)                                     |
| Pendant la manche     | Manche 3 / 10 · chrono · **Écoutez bien…** · choix et réponses comme aujourd'hui |
| Révélation            | pochette, titre, artiste, le plus rapide (inchangé, chemin sans vidéo)           |

Aucun mot sur la source du son : la salle ne voit pas la différence.

### Téléphone

« La musique arrive sur la TV… » devient « La musique arrive… » pour les deux sources (le son ne vient plus forcément de la TV). Rien d'autre ne change : jamais le titre, jamais le média.

## États à prévoir

| État                               | Régie                                                   | TV                           |
| ---------------------------------- | ------------------------------------------------------- | ---------------------------- |
| Chargement de la régie             | « Connexion à la soirée… » (inchangé)                   | inchangé                     |
| Régie reconnectée en pleine manche | reprend l'étape en cours (titre à lancer ou chrono)     | inchangé                     |
| Serveur redémarré (instantané)     | source gardée, manche rejouée depuis « Lance ce titre » | « La musique arrive »        |
| Pochette absente                   | titre et artiste sans image                             | égaliseur seul (déjà le cas) |
| Liste vide (fin de pile)           | « Copier la liste » masqué                              | —                            |
| Copie refusée par le navigateur    | la liste s'affiche dans une zone sélectionnable         | —                            |
| Hors ligne                         | bandeau « Connexion perdue » actuel                     | inchangé                     |

## Ce qui ne change pas

- Le son de ZIK reste la source par défaut des soirées de groupe, avec la même détection de panne.
- Règles de jeu, points, bonus de rapidité, révélation, podium, classement de soirée.
- Les téléphones ne reçoivent jamais la réponse ni le média, dans les deux modes.

## À vérifier par `/tech` avant le code

1. **Source dans les réglages** : un champ `settings.musicSource` (`"zik"` ou `"sono"`), modifié par `salon_update_settings` (schéma à étendre), sérialisé avec les réglages dans l'instantané (test d'instantané à compléter).
2. **« C'est parti »** : `salon_music_ready` n'accepte aujourd'hui que le rôle `screen` (`control.js`, ligne 161). En mode sono, l'accepter de la régie seulement, et ne pas armer `musicReadyTimer` (`rounds.js`, ligne 256, et `resumeGame` dans `timers.js`).
3. **Pas de média vers la TV en mode sono** : `roundData` sans `videoId` ni `audioUrl`. Vérifier que `loadMedia` sans média n'appelle pas `onVideoError` (sinon `skipTrack` et fausse panne), et que la révélation prend le chemin `AudioReveal`.
4. **Titre à lancer et suivant** : `hostInfo` part déjà à `salon:ctrl` seulement ; y ajouter le titre suivant. La liste pour « Copier la liste » part aussi à `salon:ctrl` seulement, jamais dans `salon_settings` (envoyé à tous).
5. **« Passer ce titre »** : nouveau handler via `safe()`, régie seulement, manche non consommée (`drawSpareTrack`), sans `skipStreak`, sans signalement de titre (`reportTrackIssue`).
6. **Bascule depuis la panne** : `clearOutage` puis relance immédiate de la manche en attente, en annulant `outageTimer`. Entrées hostiles : bascule hors panne, hors partie, depuis un téléphone.
7. **Régie absente 60 s** : brancher sur `_ctrlLeaveTimer` (`leave.js`) le retour au son de ZIK.
8. **Intro éclair** exclue du tirage en mode sono (`specials.js`).

## Critères de recette

- Staging, 1 TV, 1 régie au téléphone, 4 téléphones : partie de 5 manches en « Ta sono ». Le chrono ne part qu'au « C'est parti » ; la TV et les téléphones n'affichent jamais titre, artiste ni pochette avant la révélation ; la TV ne joue aucun titre.
- « Copier la liste » colle les titres dans l'ordre réel des manches. Un « Passer ce titre » : le remplaçant s'affiche, le total de manches ne baisse pas tant qu'il reste des réserves.
- Panne simulée (source vidéo coupée) : l'encart propose la sono ; un appui relance la manche en moins de 2 s ; « Revenir au son de ZIK » reprend à la manche suivante ; panne toujours là : l'encart revient.
- Régie fermée 60 s en mode sono : la partie repasse sur le son de ZIK, la régie le dit à son retour.
- TV et régie dans le même navigateur : bandeau affiché, titre brouillé jusqu'à « Afficher ».
- Redémarrage du serveur en pleine manche sono : la source est gardée, la manche repart à « Lance ce titre ».
- Régie 390 px : « C'est parti » dans la moitié basse, 60 px de haut, aucun défilement pour le lancer. TV 1920 × 1080 : un seul magenta, rien sous 28 px.

## Questions pour Théo

1. **Source par défaut en ZIK Pro** : (A) son de ZIK, la sono en secours et proposée dans la liste de vérification ; ou (B) ta sono par défaut, le son de ZIK en secours. Recommandation : A (intuition : lancer une soirée en 2 minutes reste plus simple sans rien préparer ; un bar qui préfère sa sono le choisit une fois, le réglage est gardé).
2. « Ta sono » est-il ouvert à tous (groupes compris) ou réservé à ZIK Pro ? Recommandation : à tous, puisque c'est d'abord le filet de la panne.
3. Le nom affiché : « Ta sono » (proposé), « Ton son », « Musique de la régie » ?
4. Les textes et le seuil de 60 s de régie absente : validés, à corriger ?
