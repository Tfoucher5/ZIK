# À trancher

Les questions qui attendent Théo, affichées dans le QG (`node scripts/qg/serveur.mjs`, panneau « À trancher »). Une section par décision :

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

## Promo : 7 sons des vidéos

- **Chantier** : Marketing, plan promo de 2 semaines (scratchpad `promo/plan-2-semaines.md`)
- **Depuis** : 15/11
- **Question** : Valider les 7 sons : La Traine « Tu danses pas tu bois pas », Soso Maness « Mistral », disiz « melodrama », Claude François « Le mal aimé », Sexion d'Assaut « Casquette à l'envers », Ronisia « Solide », et le son du post pro ?
- **Options** : tout valider ; remplacer certains sons
- **Recommandation** : valider, une musique différente par vidéo, ajoutée dans TikTok

## Promo : poster la vidéo du bar 3D (V1)

- **Chantier** : Marketing, plan promo de 2 semaines
- **Depuis** : 15/11
- **Question** : Poster la V1 (bar 3D) ou attendre une autre version ?
- **Options** : poster ; retravailler ; ne pas poster

## Promo : post pro sur LinkedIn

- **Chantier** : Marketing, plan promo de 2 semaines
- **Depuis** : 15/11
- **Question** : Depuis quel compte LinkedIn publier le post pro, et peut-on afficher en public « plus de 200 soirées par semaine » ?
- **Options** : compte de Théo ; page ZIK ; chiffre affiché ou retiré
- **Recommandation** : n'afficher le chiffre que s'il est vérifié dans `etat.md` (aucun chiffre inventé)

## Promo : comptes Instagram et YouTube Shorts

- **Chantier** : Marketing, plan promo de 2 semaines
- **Depuis** : 15/11
- **Question** : Ouvrir (ou utiliser) des comptes Instagram et YouTube Shorts pour reposter les vidéos TikTok ?
- **Options** : les deux ; Instagram seul ; TikTok seul pour l'instant

## Promo : script de prise de vue d'un salon

- **Chantier** : Marketing, plan promo de 2 semaines
- **Depuis** : 15/11
- **Question** : Valider le script qui filme une partie de salon sur le staging pour les vidéos ?
- **Options** : valider ; retoucher
- **Recommandation** : valider, prises sur le staging uniquement, jamais sur la prod

## Connecter Stripe : `/mcp` puis claude.ai Stripe

- **Chantier** : Argent (agents `offres` et `analyste`)
- **Depuis** : 15/11
- **Question** : Connecter Stripe pour que les agents Argent lisent paiements et offres : taper `/mcp`, choisir « claude.ai Stripe » et autoriser ?
- **Options** : connecter ; ne pas connecter
- **Recommandation** : connecter, pour la lecture seule des agents Argent, aucune écriture en mode live

## Routine quotidienne `/operations suite` dans le cloud

- **Chantier** : Opérations
- **Depuis** : 15/11
- **Question** : Lancer `/operations suite` chaque jour automatiquement dans le cloud ?
- **Options** : oui ; non, à la main

## Règle de conflit entre les trois chiffres

- **Chantier** : Direction (vision)
- **Depuis** : 15/11
- **Question** : Confirmer « en cas de conflit entre les chiffres, la soirée réussie d'abord » ?
- **Options** : confirmer ; changer l'ordre
- **Recommandation** : confirmer
- **Lien** : https://github.com/Tfoucher5/ZIK/blob/develop/docs/strategie/vision.md
