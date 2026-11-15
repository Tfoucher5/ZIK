# Board — Tour 1 (15/11)

Les 7 membres votent B, chacun avec une condition. Personne ne vote A, C ou D.

| Membre     | Vote   | Ce qu'il met en premier                                                                        | Ce qu'il refuse avant la release                             | Condition                                                                                                                                                   |
| ---------- | ------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client Pro | B si   | B1, B2, B3, reprise sans régie                                                                 | Badges PRO pendant le jeu, « Bientôt dans ZIK Pro »          | B1-B3 et reprise rejoués avec plus de 12 téléphones, message clair au 13ᵉ joueur                                                                            |
| CFO        | B si   | Bandeau 12/12 non bloquant, message au 13ᵉ, `source` Stripe                                    | D, podium or, arrivée animée, « Bientôt »                    | Ces trois points dans la v3.32 (Stripe : Théo)                                                                                                              |
| CPO        | B si   | Reprise de place, gérant sur téléphone                                                         | D, tout ajout « fun »                                        | + message au 13ᵉ, + QR de régie sur la TV ; la v3.33 commence par l'arrivée animée et la phrase de révélation                                               |
| CTO        | B si   | B1, B2, B3 (avec e2e), `?v=3.32.0`, `reclaim.js` (plafond, `saveSnapshot`), `httpLookups`      | A (B1 en prod), D, SEO, textes, gérant sur téléphone         | Porte limitée à la reconnexion, au cache CSS, à la reprise et au compteur de codes. 2 à 3 jours (intuition)                                                 |
| CMO        | B si   | `noindex` `/salon` + `/soiree` seule vitrine, story `?ref=story` en bouton principal           | D, podium or                                                 | + story avec `ref`, + message au 13ᵉ, + QR local ou sonde qrserver                                                                                          |
| COO        | B si   | B1-B3 + e2e, `phone.css`, reprise (abus, jeton), `httpLookups`, puis JOUEREN / salon / tu-vous | SEO, `llms.txt`, gérant sur téléphone, fun                   | Liste figée aujourd'hui. Reprise sans régie M : si elle déborde, on corrige le texte de `/soiree`. Recette Safari iOS réel, plus de 3 joueurs, limite de 12 |
| Avocat     | oui si | `phone.css`, B1 (+ test et e2e), B2, plafond `reclaim`, sauvegarde du jeton                    | Reprise TV seule (c'est une fonctionnalité), SEO, `llms.txt` | 5 points seulement, recette à 12 téléphones dont un vrai iPhone                                                                                             |

## Points de friction

- **Taille de la porte de prod** : 5 points (avocat, CTO) contre B élargi (CFO, CMO, CPO, client Pro).
- **Reprise de place sans régie** : indispensable pour le client Pro et le CPO ; trop grosse pour l'avocat et le COO, qui proposent de corriger la promesse de `/soiree`.
- **Message au 13ᵉ joueur** : demandé par 4 membres (client Pro, CFO, CPO, CMO), effort S, texte seulement.
- **SEO `/salon` et `llms.txt`** : premier sujet pour le CMO, à repousser pour le COO, le CTO et l'avocat.

## Fait vérifié après le tour 1 (CEO)

Question de l'avocat : B1 existe-t-il déjà en prod ? **Oui.** Le bloc de reprise `if (data.reconnecting)` de `playerEvents.js` est le même sur `master` : il met à jour `round` sans remettre `chosenIndex` à zéro. La v3.32 n'a touché qu'aux handlers de reprise de place. B1 relève donc d'un `/hotfix` sur `master`, indépendant de la release.

## Chiffres de prod (agent analyste, 30 jours, lecture seule)

- **Régie ou TV seule : non mesurable.** Aucune colonne ne le garde (`play.games`). Il suffirait d'une colonne `regie_seen` écrite à la fin de partie (migration). 337 salons à 2 joueurs ou plus, dont 57 d'hôtes ZIK Pro (12 hôtes).
- **Limite de 12 : marginale.** 18 refus au minimum, 4 parties, 4 salons, 3 hôtes sans Pro, **aucun achat derrière**. Les 8 nouveaux pass Soirée viennent d'autres comptes. (Les « 44 salons au-delà de 12 » d'`etat.md` sont surtout des salons Pro, sans refus.)
- **Pages d'arrivée** :
  - Google : 1 506 visites, dont **62 % sur `/`**, 16 % sur `/blind-test/rap-fr`, `/salon` 0,8 %. La part de `/` baisse chaque semaine (79 % → 49 %), au profit des pages thématiques.
  - ChatGPT : 273 visites, dont 39 % sur `/`, **12,8 % sur `/salon`**, 9,5 % sur `/blind-test/soiree`, 6,6 % sur `/pro`.
  - Conséquence : l'aiguillage `/` touche la majorité du trafic Google. Le risque SEO est sur `/`, pas sur `/salon`. `llms.txt` pèse côté ChatGPT.
