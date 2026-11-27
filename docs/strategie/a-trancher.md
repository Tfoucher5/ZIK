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

## Script de seed du staging sans test automatique

- **Chantier** : Suites de « les manches suivent les titres »
- **Depuis** : 27/11
- **Question** : la PR `chore/seed-playlist-courte` ajoute au seed du staging une playlist « Test · 3 titres ». C'est du SQL lancé sur la base de staging : aucun test Vitest possible sans vrai Postgres (interdit dans les tests). La définition de terminé (« test pour tout code nouveau ») n'est donc pas tenue et la PR n'est pas fusionnée. Accepter, pour les scripts de seed, une vérification sur le staging en transaction annulée à la place du test ?
- **Options** : oui (Claude fusionne et lance le seed) ; non (la PR reste ouverte, ou on la ferme et on crée la playlist à la main sur le staging)
- **Recommandation** : oui, seulement pour `scripts/seed-staging.mjs` (outil de staging, jamais lancé sur la prod) ; bloc vérifié sur le staging le 27/11 : 3 titres, compteur à 3

## Statut de vente et TVA

- **Chantier** : Argent / légal
- **Depuis** : 15/11
- **Statut** : reporté par Théo (pas de micro-entreprise pour l'instant), à revoir avant de pousser les ventes Pro
- **Question** : Tu n'as pas d'entreprise pour le moment, alors que ZIK Pro vend des abonnements à des pros (CGV et mentions légales : vendeur « Particulier », sans SIRET, « TVA non applicable » sans article de loi). Créer une micro-entreprise (gratuit, en ligne) pour encaisser ZIK Pro légalement ?
- **Options** : micro-entreprise en franchise → mention « TVA non applicable, art. 293 B du CGI » + SIRET sur /pro, CGV, factures Stripe ; ou assujetti à la TVA → prix HT + 20 % via Stripe Tax
- **Recommandation** : créer la micro-entreprise, faire confirmer la franchise de TVA par l'URSSAF ou un comptable, puis envoyer le SIRET à Claude qui corrige CGV, mentions légales, /pro et factures Stripe. Seuils de franchise services 2026 : 37 500 € / 41 250 € (à vérifier sur service-public.gouv.fr)
- **Lien** : https://formalites.entreprise.gouv.fr/
