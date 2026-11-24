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

## Fiche « TV sans vidéo YouTube et repli sur ma sono »

- **Chantier** : ZIK Soirée / fiabilité
- **Depuis** : 24/11 (le mode « Ta sono » a été refusé par Théo : il complique l'organisation ; on garde le repli)
- **Question** : valides-tu la maquette ? « Passer sur ma sono » au tutoiement comme le reste de la régie ? Retour au son de ZIK proposé par la régie, jamais automatique ? Avant de retirer la vidéo, compléter les identifiants Deezer du catalogue en prod (36 % des titres des playlists officielles n'en ont pas, mesuré sur le staging) ?
- **Options** : oui / non pour chaque point
- **Recommandation** : oui aux quatre ; la TV sans vidéo ne part qu'une fois au moins 90 % des titres avec un extrait sûr
- **Lien** : `docs/specs/2026-11-24-musique-de-la-regie.md`, maquette https://claude.ai/artifact/ETZHspB9GR17cSjHgNZQDG

## Statut de vente et TVA

- **Chantier** : Argent / légal
- **Depuis** : 15/11
- **Statut** : reporté par Théo (pas de micro-entreprise pour l'instant), à revoir avant de pousser les ventes Pro
- **Question** : Tu n'as pas d'entreprise pour le moment, alors que ZIK Pro vend des abonnements à des pros (CGV et mentions légales : vendeur « Particulier », sans SIRET, « TVA non applicable » sans article de loi). Créer une micro-entreprise (gratuit, en ligne) pour encaisser ZIK Pro légalement ?
- **Options** : micro-entreprise en franchise → mention « TVA non applicable, art. 293 B du CGI » + SIRET sur /pro, CGV, factures Stripe ; ou assujetti à la TVA → prix HT + 20 % via Stripe Tax
- **Recommandation** : créer la micro-entreprise, faire confirmer la franchise de TVA par l'URSSAF ou un comptable, puis envoyer le SIRET à Claude qui corrige CGV, mentions légales, /pro et factures Stripe. Seuils de franchise services 2026 : 37 500 € / 41 250 € (à vérifier sur service-public.gouv.fr)
- **Lien** : https://formalites.entreprise.gouv.fr/
