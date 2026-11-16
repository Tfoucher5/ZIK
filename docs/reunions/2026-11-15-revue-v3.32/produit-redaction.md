# Pôle Produit (rédaction) — revue v3.32

**Verdict** : on retouche. Ton du jeu bon (chaleureux, tutoiement). Côté organisateur, deux choses font amateur : « vous » et « tu » mélangés, et « salon » encore partout (TV, régie, erreurs) alors que la v3.32 devait installer « ZIK Soirée ».

## Ce qui marche

- `/` : « J'ai un code » clair avec erreur utile (`CodeStub.svelte:16`), portes nettes.
- `/soiree` : accroche forte, déroulé concret.
- Téléphone : « {pseudo}, c'est toi ? », « Re-bonjour Julie. », « C'est bon, tu es dedans. » ; podium neutre en genre.
- TV : « Sortez vos téléphones. », « Lancer la partie suivante ».
- Erreurs de création (#431) au vouvoiement avec quoi faire.

## Problèmes

1. **Important** — tu/vous mélangés face à l'organisateur : `SetupPro.svelte:10`, `TabDirect.svelte:54-56`, `RegieHeader.svelte:55,64`, `MediaCheck.svelte:32`, `SalonHelp.svelte:111-143` tutoient (« ZIK Pro : ta demande passe en priorité »).
2. **Important** — « salon » visible : TV `HostGameOver.svelte:133-147`, téléphone `PlayLobby.svelte:28`, erreurs `join.js:49,159,187,193`, onglet `/salon/play` « ZIK Salon » (`+page.svelte:35`), `NightBoard:39`, `TabSettings:29`, `soireeContent.js:15,70`, `SoireeCta:6`, `SalonHelp:29,116,123`, adresse `zik-music.fr/salon/play` sur la TV.
3. **Important** — erreurs joueur sèches sans quoi faire (`join.js`).
4. **Important** — organisateur nommé « l'hôte », « l'animateur » (`SetupSheet.svelte:50`, masculin) et « sans animateur » (titre `/soiree`) vs porte « Animer une soirée ».
5. **Confort (public)** — masculin sur la TV : `HostGameOver.svelte:46,51,54,57` (« Vainqueur », « Meilleur joueur », « Le plus rapide »…), `HostCenter.svelte:135`, `SummaryView.svelte:77`, `PlayBoard.svelte:7` (« Tu es 1er »), `SoireeCta.svelte:10`, `SetupHero.svelte:3` (« Invité ? »).
6. **Confort** — jargon : « L'hôte doit confirmer sur la régie » (`JoinForm.svelte:26`).
7. **Important** — `/nouveautes` 3.32.0 (`news.js:7-19`) ne parle que de l'accueil : manquent story, reprise de place, grand QR, préparation mémorisée, coupures affichées.

## Réécritures

| Fichier:ligne                   | Actuel                                                                   | Proposé                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| SetupPro.svelte:10              | …branche cet ordinateur à la télé.                                       | En ouvrant la soirée, cet onglet devient l'écran TV : branchez cet ordinateur à la télé. |
| TabDirect.svelte:54-56          | Ouvre l'écran TV… / Lance la partie…                                     | Ouvrez l'écran TV… / Lancez la partie…                                                   |
| RegieHeader.svelte:64           | Ces liens donnent le contrôle du salon. Ne les partage pas…              | Ces liens pilotent la soirée. Ne les partagez pas avec les joueurs.                      |
| SalonHelp.svelte:119            | ZIK Pro : ta demande passe en priorité.                                  | ZIK Pro : votre demande passe en priorité.                                               |
| HostGameOver.svelte:139         | Fermer ce salon ?                                                        | Fermer cette soirée ?                                                                    |
| HostGameOver.svelte:133/146/147 | Nouveau salon… / Rester dans ce salon / Fermer et créer un nouveau salon | Nouvelle soirée… / Garder cette soirée / Fermer et recommencer avec un nouveau code      |
| join.js:159                     | Salon introuvable ou expiré.                                             | Aucune soirée en cours avec ce code. Vérifie-le sur la TV.                               |
| join.js:187                     | Le salon est complet.                                                    | La soirée est complète. Préviens l'organisateur ou l'organisatrice.                      |
| join.js:153                     | Pseudo requis.                                                           | Choisis un pseudo pour jouer.                                                            |
| join.js:193                     | L'hôte t'a retiré de ce salon.                                           | L'hôte a retiré ton pseudo de la soirée.                                                 |
| PlayLobby.svelte:28             | Dans le salon · N                                                        | Dans la partie · N                                                                       |
| JoinForm.svelte:26              | L'hôte doit confirmer sur la régie.                                      | On attend le feu vert de l'hôte.                                                         |
| HostGameOver.svelte:46          | Vainqueur                                                                | 1re place                                                                                |
| HostGameOver.svelte:51/54/57    | Meilleur joueur / Le plus rapide / Le plus régulier                      | Meilleur score / Plus rapide / Plus régulier                                             |
| SetupSheet.svelte:50            | L'animateur valide à voix haute                                          | Vous validez à voix haute                                                                |
| SoireeCta.svelte:10-11          | Vous êtes invité ? / Rejoindre avec un code                              | Un code sur la TV ? / Rejoindre la partie                                                |
| SetupHero.svelte:3              | Invité ? Entrer le code                                                  | Tu joues ? Entre le code                                                                 |
| /salon/play +page.svelte:35     | … - ZIK Salon                                                            | Rejoindre une soirée - ZIK Soirée                                                        |
| SoireeCta.svelte:6              | Lancez un salon gratuit…                                                 | Lancez une soirée gratuite…                                                              |

Impact fort / effort S : tout le tableau (mettre à jour `playlists.test.js`, `playerEvents.test.js`) + compléter `/nouveautes`. Moyen S : sur la TV « ou tapez le code sur zik-music.fr » (le champ de `/` existe). Moyen M : un seul nom pour le rôle (« l'hôte » ?) écrit dans DESIGN.md.

## Questions

- Tech : tests sur les textes de `join.js` ?
- Marketing : adresse courte (`/go`) = nouvelle route, à Théo.
- Produit : règle TV « vous » à la salle, « tu » au joueur seul, à écrire dans la charte.
- Ops : « Mise à jour de ZIK » sur la TV → « Petite coupure, on revient » ?

_Non vérifié : diff exact (pas de shell), `/pro`._
