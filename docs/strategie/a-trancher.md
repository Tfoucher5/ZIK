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

## Playlist trop courte pour la partie

- **Chantier** : Produit (signalement de Rom, client Pro, 21/11)
- **Depuis** : 23/11
- **Question** : Une soirée avec moins de titres que de manches (3 titres pour 5 manches) s'arrête net à la manche 3, devant la salle. On valide la maquette ?
- **Options** : les manches suivent les titres (la partie fait le vrai nombre, « 3 / 3 », alerte orange à la création et dans la régie avec « Ajouter une playlist ») ; avertir seulement ; bloquer le lancement
- **Recommandation** : les manches suivent les titres. Rien n'est bloqué, le choix de l'organisateur revient seul quand il ajoute une playlist, la TV affiche le vrai compte
- **Lien** : https://claude.ai/artifact/SFLPkkzpALduC8in64kTJm

## Statut de vente et TVA

- **Chantier** : Argent / légal
- **Depuis** : 15/11
- **Statut** : reporté par Théo (pas de micro-entreprise pour l'instant), à revoir avant de pousser les ventes Pro
- **Question** : Tu n'as pas d'entreprise pour le moment, alors que ZIK Pro vend des abonnements à des pros (CGV et mentions légales : vendeur « Particulier », sans SIRET, « TVA non applicable » sans article de loi). Créer une micro-entreprise (gratuit, en ligne) pour encaisser ZIK Pro légalement ?
- **Options** : micro-entreprise en franchise → mention « TVA non applicable, art. 293 B du CGI » + SIRET sur /pro, CGV, factures Stripe ; ou assujetti à la TVA → prix HT + 20 % via Stripe Tax
- **Recommandation** : créer la micro-entreprise, faire confirmer la franchise de TVA par l'URSSAF ou un comptable, puis envoyer le SIRET à Claude qui corrige CGV, mentions légales, /pro et factures Stripe. Seuils de franchise services 2026 : 37 500 € / 41 250 € (à vérifier sur service-public.gouv.fr)
- **Lien** : https://formalites.entreprise.gouv.fr/
