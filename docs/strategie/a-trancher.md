# À trancher

Les questions qui attendent Théo, affichées dans le QG (`/qg`, bouton « À trancher », où Théo répond). Une section par décision :

```
## Titre
- **Chantier** : …
- **Depuis** : JJ/MM
- **Statut** : bientôt (facultatif : la décision arrive mais n'est pas encore prête)
- **Question** : …
- **Options** : …
- **Recommandation** : …
- **Lien** : … (facultatif)
```

Une décision tranchée est retirée d'ici et notée dans `decisions.md`. La plus urgente en haut.

## Fiche « Ta sono » (l'animateur lance la musique, ZIK fait le jeu)

- **Chantier** : ZIK Soirée / fiabilité
- **Depuis** : 24/11
- **Question** : valides-tu la fiche et la maquette ? Source par défaut en ZIK Pro : (A) son de ZIK, ta sono en secours, ou (B) ta sono par défaut ? Mode ouvert à tous ou réservé à ZIK Pro ? Nom affiché : « Ta sono », « Ton son », « Musique de la régie » ?
- **Options** : A ou B ; tous ou Pro ; un des trois noms
- **Recommandation** : maquette validée, A, ouvert à tous (c'est d'abord le secours de la panne), « Ta sono »
- **Lien** : `docs/specs/2026-11-24-musique-de-la-regie.md`, maquette https://claude.ai/artifact/G5Ke3AkYH75AbwKG4o1wWq

## Statut de vente et TVA

- **Chantier** : Argent / légal
- **Depuis** : 15/11
- **Statut** : reporté par Théo (pas de micro-entreprise pour l'instant), à revoir avant de pousser les ventes Pro
- **Question** : Tu n'as pas d'entreprise pour le moment, alors que ZIK Pro vend des abonnements à des pros (CGV et mentions légales : vendeur « Particulier », sans SIRET, « TVA non applicable » sans article de loi). Créer une micro-entreprise (gratuit, en ligne) pour encaisser ZIK Pro légalement ?
- **Options** : micro-entreprise en franchise → mention « TVA non applicable, art. 293 B du CGI » + SIRET sur /pro, CGV, factures Stripe ; ou assujetti à la TVA → prix HT + 20 % via Stripe Tax
- **Recommandation** : créer la micro-entreprise, faire confirmer la franchise de TVA par l'URSSAF ou un comptable, puis envoyer le SIRET à Claude qui corrige CGV, mentions légales, /pro et factures Stripe. Seuils de franchise services 2026 : 37 500 € / 41 250 € (à vérifier sur service-public.gouv.fr)
- **Lien** : https://formalites.entreprise.gouv.fr/
