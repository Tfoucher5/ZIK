# Pôle Argent (offres) — revue v3.32

**Verdict** : on garde les parcours, on retouche la vente. Offre visible et propre, sauf au seul moment où l'on veut payer : en pleine soirée, quand le 13ᵉ joueur est refusé.

## Ce qui marche

- Lien « Tarifs » dans la nav soirée (`layout/Nav.svelte:73,167`), `/pro` rangé dans l'univers soirée.
- `/soiree` : « 12 joueurs, 2 équipes, sans carte bancaire » à côté de « dès 7,90 € » (`soiree/SoireePro.svelte`).
- La TV n'affiche jamais rien de payant (`host/HostGameOver.svelte:98,102`).
- `/salon` : étiquette « Pro » + fenêtre qui nomme la fonction (`setup/SetupSheet.svelte:19`, `ProUpsell.svelte`).
- Préparation retenue (#427) ne fait pas miroiter un réglage Pro à un gratuit (`client/salonClient.js:83-92`).

## Problèmes

1. **Bloquant (conversion)** — payer en pleine soirée ne débloque pas le salon : droit Pro lu à la création (`server/socket/salon/rooms.js:43`) ; la page merci dit « Ouvrez un salon » (`pro/merci/+page.svelte:51,62`) = nouveau code, scores perdus. Or les 9 pass vendus l'ont été à des groupes de 7 à 13, à la limite des 12.
2. **Important** — fenêtre bloquante sur la régie à chaque refus, sans délai (`regie/regieEvents.js:161`) ; « Découvrir ZIK Pro » ouvre une vitrine, pas l'achat (`ProUpsell.svelte:39`).
3. **Important** — joueur refusé : « Le salon est complet. » seulement (`salon/join.js:187`).
4. **Important (image)** — le pass s'appelle « Soirée » (`data/proPlans.js:27`) à l'intérieur de « ZIK Soirée » ; orthographe « passe » variable (`soireeContent.js`, `pro/proContent.js:109`).
5. **Confort** — Pro vendu aux seuls lieux sur `/` (`accueil/guide.js:39`), « Chez soi » sans mention du pass (`soireeContent.js:53`) : le groupe d'anniversaire de 13, acheteur réel, n'est jamais nommé.
6. **Confort** — pass expiré : la préparation ramène 4 équipes à 2 sans le dire (`salonClient.js:90`).
7. **Mesure** — pas de `source` dans les métadonnées Stripe (`api/pro/checkout/+server.js:36`), pourtant décidé le 13/11.

## Propositions (aucun prix ne change)

| #   | Proposition                                                                                                         | Impact       | Effort            |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------- |
| A   | Salon passé en Pro à l'achat (webhook → `salon.pro = true` + `salon_pro`), achat direct depuis la régie avec retour | Fort         | M (Stripe : Théo) |
| B   | Bandeau non bloquant « 1 joueur refusé, 12/12 · Débloquer » avec délai entre alertes                                | Fort (image) | S                 |
| C   | Téléphone : « Salon complet : 12 joueurs en version gratuite. Prévenez l'organisateur. »                            | Moyen        | S                 |
| D   | Nom du pass distinct (« Pass 24 h » ?), choix de Théo                                                               | Moyen        | S                 |
| E   | FAQ `/` et « Chez soi » : « plus de 12 invités ? pass à 7,90 € »                                                    | Moyen        | S                 |
| F   | `source` dans les métadonnées checkout                                                                              | Mesure       | S (Stripe : Théo) |
| G   | Préparation sans Pro : « Votre dernière soirée était en 4 équipes avec ZIK Pro » + lien                             | Faible       | S                 |

44 salons ont dépassé 12 joueurs sur 30 jours. 1 sur 10 converti ≈ 4 pass ≈ 31,60 €/mois (hypothèse).

**Test le moins cher** : B, C, F d'abord ; 4 semaines de comparaison `limit_hits` (`services/admin/board.js:68`) vs pass `regie-limite`. A seulement si refus nombreux et achats rares.

## Questions

- Tech : le webhook atteint-il `globalThis.__zik_salonRooms` ? Salon restauré d'instantané ?
- Produit : bandeau de limite en régie à 390 px ?
- Marketing : nom du pass ?
- Théo : tolérance d'un dépassement par mois (comme Kahoot) ? Pas recommandé avant le test.

_Non vérifié sur le staging ; tout vient du code._
