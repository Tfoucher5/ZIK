# Pôle Produit (UI, visuel) — revue v3.32

Captures staging 1440 / 390 / TV 1920 et 1280, clair et sombre, prod pour comparer, et une vraie partie de 5 manches (TV, régie, 3 téléphones, coupure, « c'est toi ? »).

**Verdict** : on retouche. Pages publiques et téléphone tiennent. Deux écrans ne font pas « pro devant la salle » : la fin de partie TV et `/`.

## Ce qui marche

- Lobby TV : « Sortez vos téléphones », code en 6 cases, QR énorme. Ça fait scène.
- Grand QR de fin, reprise en 1280.
- Téléphone : rejoindre, « Bob, c'est toi ? », « Tu gagnes ! ».
- Bandeau de coupure jaune en haut, rassurant.
- `/soiree` : scène heure par heure, podium or/argent/bronze, « Pour qui ».
- `/jouer` : mosaïque de pochettes, cartes de rooms.
- `/salon` : « Ce soir, c'est blind test. », tuiles de playlists colorées.

## Problèmes

1. **Bloquant** — la TV de fin de partie montre les réglages de l'hôte à la salle (mode, équipes 3-16, manches en 14 px, « Lancer la partie suivante », « Changer de playlist », « Nouveau salon… ») même avec « Régie connectée » (`HostGameOver.svelte`). Contre DESIGN.md:250 et « rien sous 28 px ».
2. **Important** — podium TV gris et blanc, sans or/argent/bronze, alors que la vitrine `/soiree` est dorée. Égalité 15/15 donne quand même « 2 » ; « 15 pts · 0 trouvé » se contredit.
3. **Important** — émojis 🔔 🔊 🔇 dans la barre TV (`HostSounds.svelte:16`, `HostTopBar.svelte:91`), interdits par DESIGN.md:313.
4. **Important** — magenta partout sur TV et régie ; en fin de partie, deux boutons magenta côte à côte en régie (« Terminer la soirée » / « Lancer la partie suivante ») : risque de mauvais clic.
5. **Important** — bug « JOUEREN LIGNE » dans la nav de `/soiree` (`Nav.svelte:83`, `nav.css:119`).
6. **Important** — `/` : mots fantômes « JOUER » / « ANIMER » coupés à mi-hauteur (`Doors.svelte:121-133`), pochettes grises sous voile 82 % (`Doors.svelte:71-72`) presque invisibles en clair. L'accueil a perdu l'énergie de la prod.
7. **Important** — « Ta place a été reprise » en rouge sur formulaire vide avec « Rejoindre » magenta : pousse à reprendre en boucle. Pendant la coupure, « C'est bon, tu es dedans » + « Reconnexion… ». Attente de l'hôte sans signe d'attente.
8. **Important (fun)** — story en secondaire, « Créer mon compte » en magenta (`SummaryView.svelte:131-137`), pas d'aperçu ni de couleurs de podium sur le téléphone.
9. **Confort** — régie : « Rendre sa place » et « Refuser » même style, bandeau gris.
10. **Confort** — `/salon` : grille « Équipes » sur 2-3 lignes avec case vide, « A » orphelin, 2ᵉ magenta « Découvrir ZIK Pro », « salon » restant.
11. **Confort** — `/soiree` : titre sur 5 lignes, accent du « É » qui touche (`SoireeHero.svelte:75`, `line-height:0.9`) ; « Lancer » vs « Créer une soirée ».
12. **Confort** — zones tactiles : Connexion/S'inscrire 27-29 px, barre du bas 8,8 px (`bottom-nav.css:26`), pied 8 et 12 px (`footer.css:97,115`) ; pied « Édition en ligne » même en univers Soirée.
13. **Confort** — ZIK Soirée suit le thème clair (`/soiree`, `/salon`, téléphone), DESIGN.md:246 le veut toujours sombre.

## Propositions

| Proposition                                                                                                                                | Impact | Effort |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ |
| TV : cacher « Prochaine partie » et boutons quand une régie est connectée ; garder vainqueur, podium, QR                                   | fort   | S      |
| Podium TV en or `#FBBF24` / argent `#94A3B8` / bronze `#D97706`, « ex æquo »                                                               | fort   | S      |
| Téléphone : story en principal, compte en secondaire                                                                                       | fort   | S      |
| Émojis TV → SVG au trait                                                                                                                   | moyen  | S      |
| Régie : « Terminer la soirée » en contour, un seul magenta par écran                                                                       | moyen  | S      |
| Nav : `.nav-switch { gap: .3em }`                                                                                                          | moyen  | S      |
| `/` : mot fantôme entier ou supprimé, pochettes en couleur voile 40 %                                                                      | moyen  | S      |
| Place reprise : écran neutre « Ta place est passée sur un autre téléphone » ; coupure : « On te reconnecte… » ; point qui pulse en attente | moyen  | S      |
| `/soiree` : `line-height: 0.95`, un seul libellé « Créer une soirée »                                                                      | faible | S      |
| `/salon` : grille Équipes en 2 rangées ; sombre forcé sur `/soiree`, `/salon`, `/salon/play`                                               | moyen  | M      |
| Zones tactiles 44 px, barre du bas 11 px, pied 14 px                                                                                       | moyen  | M      |

## Questions

- Tech : « 0 trouvé » avec 15 pts = bug du compteur `found` ?
- Produit/UX : TV sans régie, réglages visibles ?
- Théo : DESIGN.md (clair par défaut, pas d'ombres) vs code (sombre, ombres décalées) : on aligne la charte ou le code ?
- Marketing : « 2 joueurs inscrits · 6 parties ce mois » sur `/jouer`, assez flatteur en prod ?

_Captures : `C:\Users\Teamr\AppData\Local\Temp\claude\c23315e6417d4b11\1c92b168-99f4-4167-adef-5abaca3a40ae\scratchpad\shots\`. Non vérifié : image story, régie tablette, équipes, buzzer._
