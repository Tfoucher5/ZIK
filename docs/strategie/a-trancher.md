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

## Statut de vente et TVA

- **Chantier** : Argent / légal
- **Depuis** : 15/11
- **Question** : Tu n'as pas d'entreprise pour le moment, alors que ZIK Pro vend des abonnements à des pros (CGV et mentions légales : vendeur « Particulier », sans SIRET, « TVA non applicable » sans article de loi). Créer une micro-entreprise (gratuit, en ligne) pour encaisser ZIK Pro légalement ?
- **Options** : micro-entreprise en franchise → mention « TVA non applicable, art. 293 B du CGI » + SIRET sur /pro, CGV, factures Stripe ; ou assujetti à la TVA → prix HT + 20 % via Stripe Tax
- **Recommandation** : créer la micro-entreprise, faire confirmer la franchise de TVA par l'URSSAF ou un comptable, puis envoyer le SIRET à Claude qui corrige CGV, mentions légales, /pro et factures Stripe. Seuils de franchise services 2026 : 37 500 € / 41 250 € (à vérifier sur service-public.gouv.fr)
- **Lien** : https://formalites.entreprise.gouv.fr/

## Accueil refait : valider la maquette

- **Chantier** : Produit & design, refonte des pages ZIK Soirée (charte v2)
- **Depuis** : 15/11
- **Statut** : bientôt
- **Question** : La maquette du nouvel accueil (Nina, DA) est-elle validée pour passer au code ?
- **Options** : valider ; demander des retouches ; refuser (retour à la fiche)
- **Recommandation** : attendre la maquette, puis la juger avec la grille de la vision
- **Lien** : https://github.com/Tfoucher5/ZIK/blob/develop/docs/strategie/decisions.md

## Promo : poster la vidéo du bar 3D (V1)

- **Chantier** : Marketing, plan promo de 2 semaines
- **Depuis** : 15/11
- **Question** : Poster la V1 (bar 3D) ou attendre une autre version ?
- **Options** : poster ; retravailler ; ne pas poster

## Promo : chaîne YouTube Shorts

- **Chantier** : Marketing
- **Depuis** : 15/11
- **Question** : Instagram a refusé la création du compte (theo@zik-music.fr), on réessaie plus tard. On crée une chaîne YouTube pour les Shorts ? La création du compte et le mot de passe restent à toi ; ensuite Claude peut préparer chaque publication dans Chrome, que tu valides une par une.
- **Options** : créer la chaîne YouTube maintenant · plus tard
- **Recommandation** : créer la chaîne maintenant (mêmes vidéos que TikTok, zéro effort en plus)

## Connecter Stripe : `/mcp` puis claude.ai Stripe

- **Chantier** : Argent (agents `offres` et `analyste`)
- **Depuis** : 15/11
- **Question** : (toujours à faire de ton côté : la connexion se valide dans ton navigateur) Connecter Stripe pour que les agents Argent lisent paiements et offres : taper `/mcp`, choisir « claude.ai Stripe » et autoriser ?
- **Options** : connecter ; ne pas connecter
- **Recommandation** : connecter, pour la lecture seule des agents Argent, aucune écriture en mode live

## Promo : 2 posts LinkedIn à relire

- **Chantier** : Marketing
- **Depuis** : 15/11
- **Question** : Louis a écrit 2 posts pour ton compte (1 : cap des inscrits et ce que ZIK est devenu ; 2 : comment un dev seul fait tourner ZIK avec une équipe d'agents). Il manque le vrai nombre total d'inscrits (visible dans /admin) pour le post 1. Textes dans le scratchpad promo/linkedin.md, Claude te les colle sur demande.
- **Options** : publier tels quels ; retoucher ; donner le nombre d'inscrits
- **Recommandation** : donner le nombre d'inscrits, publier le post 1 d'abord, le 2 une semaine après
