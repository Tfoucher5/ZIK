# Pôle Produit (idées, fun) — revue v3.32

**Verdict** : on garde les deux univers. On retouche le fun : la soirée marche mais reste muette et sans surprise aux trois moments qui font rire (arrivée, révélation, fin).

## Ce qui marche

- Code d'abord puis portes : norme du secteur (Jackbox). 353 arrivées sur `/salon/play` : les invités ne passent pas par `/`.
- Podium pas à pas, tambour, confettis (`HostFinale.svelte`), flèches de places et points qui montent (`SummaryView.svelte:111-124`), 3-2-1, story.

## Problèmes

1. **Important** — arrivée muette : un joueur = une étiquette grise (`HostCenter.svelte:93-96`, `tv-screens.css:130`), deux sons seulement (`sounds.js:3-6`).
2. **Important** — téléphone sans rien à faire en attendant : « Regarde la TV » (`PlayLobby.svelte:9-10`).
3. **Important** — révélation sans récit de course : réponse + « Le plus rapide » (`HostCenter.svelte:121-137`).
4. **Confort fort** — playlist de fin illisible sur la TV (titre en `title=`, `HostGameOver.svelte:83`), absente du téléphone (`phoneView.js:75-79`).
5. **Confort** — « buzzer » promis (`Doors.svelte`) mais Pro (`HostGameOver.svelte:98`) ; « salon » restant ; « Créer mon compte » → `/` au lieu de `/jouer` (`SummaryView.svelte:137`).

## Propositions

| #   | Proposition                                                                                                                                              | Impact     | Effort                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------- |
| 1   | Arrivée qui se voit et s'entend : pseudo en grand + petit son, compteur qui saute, coupé par « sons de la TV »                                           | fort       | S                                |
| 2   | « Je suis prêt » sur le téléphone, TV coche, régie « 8/10 prêts » (n'empêche pas de lancer)                                                              | fort       | M (handler `safe()`, instantané) |
| 3   | Phrase de commentaire à chaque révélation (« Julie passe à la 1re place », « 3 pts entre la 1re et la 2e place ») via `withPrevRank` (`phoneView.js:83`) | fort       | S/M                              |
| 4   | Récap perso + playlist de la partie sur le téléphone (lien de recherche Deezer, sans API)                                                                | moyen/fort | S                                |
| 5   | Prix positifs en plus : « La remontada », « Sur le fil »                                                                                                 | moyen      | M                                |

Autres : lobby vide 30 s → « Testez avec votre propre téléphone » (191 salons à 1 joueur / 30 j) ; « Partie rapide » sur la porte Jouer ; « Revanche ! » avec l'écart ; vibration à la bonne réponse.

Écartées : réactions affichées sur la TV (spam), musique d'attente (sono du bar, option coupée par défaut au mieux), avatars/dessins (quasi nouveau mode), prix « dernière place » (humiliant).

## Questions

- UX : « prêt » bloquant ? (non proposé)
- UI : un son par arrivée à 40 joueurs, regrouper ?
- Rédaction : voix des phrases de révélation, liste des prix ?
- Tech : historique aux téléphones seulement en `gameover` ?
- Théo : priorité arrivée (1-2) ou fin (4-5) ?

Sources : [Kahoot réglages](https://support.kahoot.com/hc/articles/115016055107), [forum Kahoot](https://support.kahoot.com/hc/en-us/community/posts/42060702544019-Kahoot-should-add-a-what-can-I-do-while-I-wait-game-mode), [Jackbox](https://www.jackboxgames.com/how-to-play), [quizado](https://quizado.com/how-to-host-bar-trivia).

_Non vérifié en vrai ; AnimTonBar et Blinest non lus._
