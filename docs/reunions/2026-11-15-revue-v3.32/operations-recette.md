# Pôle Opérations (recette) — revue v3.32

Staging `develop` a916e902, Chromium headless. 20 scénarios e2e verts contre le staging (3,4 min). Parcours joué 2 fois en entier : TV 1920, régie 1024, 3 téléphones 390, 5 manches de 15 s en 4 choix, code tapé sur `/`, coupures pendant une manche, onglet fermé puis rouvert. Captures 1440/390 des pages publiques sans débordement. Console : aucune erreur ZIK.

**Verdict** : on garde après une retouche courte. Le parcours tient de bout en bout, mais un bug de reconnexion peut bloquer un joueur une manche entière devant la salle.

## Ce qui marche

- Création sans compte rapide, préparation reprise. TV ouverte en 0,8 s.
- Grand QR et code en lobby et entre deux parties.
- TV voit le joueur hors ligne ; bandeau téléphone clair.
- Reprise : même navigateur en un tap (« Re-bonjour Chloé », points gardés), autre navigateur avec confirmation de l'hôte.
- Podium TV, « Tu gagnes ! », bouton story.
- « Musique prête : 5 titres sur 5 ».

## Problèmes

- **B1 Bloquant** — téléphone qui répond pendant une coupure reste bloqué la manche suivante : couper Bob en manche 1, il tape une case (« Réponse verrouillée »), rendre le réseau en manche 2 → « Manche 2 / 5 », case déjà choisie, aucun bouton ; TV « 0 / 2 ont répondu ». Cause probable : `salon/play/playerEvents.js:217-228` met à jour `round` sans remettre `chosenIndex`, `revealCorrectIndex`, `allFound` (remis seulement en `:97-99`). Reproduit 1/1 (`scratchpad\tampon.mjs`).
- **B2 Important** — hors ligne, « Réponse verrouillée » alors que rien n'est parti : `submitChoice` verrouille sans confirmation serveur (`salonPlayer.svelte.js:119-123`) ; chrono figé à 15 pendant que la barre baisse.
- **B3 Important** — retour après coupure en 0,5 à 5 s, téléphone sur l'ancienne manche avec boutons actifs ; pas d'écouteur `online` / `visibilitychange` (`salonPlayer.svelte.js:198`).
- **B4 Confort visible** — « JOUEREN LIGNE » (`Nav.svelte:83`) : `Jouer&nbsp;`.
- **B5 Confort** — « Salon » côté joueur (`salon/play/+page.svelte:35,66`, `PlayLobby.svelte:28`, `HostGameOver.svelte:133`, `TabSettings.svelte:29`) ; masculin (« Tu es 1er sur 3 », `HostGameOver.svelte:46-57`) ; « Le plus régulier · 1 titre trouvé » tombe à plat.
- **B6 Confort** — régie tutoie ; badges PRO dans la barre d'action pendant le jeu (« Révéler PRO », volume, « Terminer la soirée PRO ») ; régie bascule seule sur Réglages en fin de partie.
- **B7 Accessibilité** — `radiogroup` sans étiquette (`SetupSheet.svelte:23`), deux « 15 s » indistinguables.
- **B8 À vérifier sur vraie TV** — habillage YouTube visible pendant la révélation (titre chaîne, CC, roue, pause).
- Non reproduit : 1er passage, clics de la manche 5 en délai dépassé sur 3 téléphones, manche 3 de 34 s après le retour de Bob (sans doute même famille que B1/B3).

## Propositions

| #   | Proposition                                                                                                                                                                                    | Impact | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| 1   | B1 : à la reprise, manche changée → remettre `chosenIndex`, `revealCorrectIndex`, `guess`, `allFound` ; mieux : reprendre le choix enregistré par le serveur ; test `onState` avec reconnexion | fort   | S      |
| 2   | B2 : « Réponse verrouillée » seulement après confirmation serveur, cases désactivées hors ligne                                                                                                | fort   | S/M    |
| 3   | B3 : `socket.connect()` sur `online` / `visibilitychange`                                                                                                                                      | moyen  | S      |
| 4   | B4, B5 : `&nbsp;` + passe de textes                                                                                                                                                            | —      | S      |
| 5   | Scénario B1 dans `e2e/salon.spec.js`                                                                                                                                                           | —      | S      |

## Questions

- Tech : le serveur renvoie-t-il le choix enregistré à la reconnexion ? Sinon l'ajouter à l'état de reprise et au test d'instantané ?
- Produit : badges PRO dans la barre d'action devant le public d'un client gratuit ?

_Non testé : texte libre, buzzer, équipes, manches spéciales, > 3 joueurs et limite de 12, son réel, vraie caméra, Safari iOS réel, story jusqu'au bout. Aucune action en prod._
