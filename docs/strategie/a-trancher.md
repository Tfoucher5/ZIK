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
- **Question** : Connecté sur claude.ai le 15/11 (la routine quotidienne y a accès). Dans la session Claude Code ouverte, il faut encore taper /mcp puis claude.ai Stripe (ou ouvrir une nouvelle session) pour que les agents Argent l'utilisent ici.
- **Options** : connecter ; ne pas connecter
- **Recommandation** : connecter, pour la lecture seule des agents Argent, aucune écriture en mode live

## Promo : 2 posts LinkedIn à relire

- **Chantier** : Marketing
- **Depuis** : 15/11
- **Question** : Louis a écrit 2 posts pour ton compte (1 : cap des inscrits et ce que ZIK est devenu ; 2 : comment un dev seul fait tourner ZIK avec une équipe d'agents). Il manque le vrai nombre total d'inscrits (visible dans /admin) pour le post 1. Textes dans le scratchpad promo/linkedin.md, Claude te les colle sur demande.
- **Options** : publier tels quels ; retoucher ; donner le nombre d'inscrits
- **Recommandation** : donner le nombre d'inscrits, publier le post 1 d'abord, le 2 une semaine après

## Intégration des pages : en-tête

- **Chantier** : Accueil, /pro, /soiree (code)
- **Depuis** : 15/11
- **Question** : Les maquettes ont deux en-têtes : le bandeau façon TV (accueil, celui que tu as validé) et la barre arrondie (/pro, /soiree, celle que tu as trouvée « basique et IA »). On met le bandeau TV partout sur les pages refaites (puis tout le site au fil de l'eau) ?
- **Options** : bandeau TV partout · bandeau TV sur l'accueil seulement
- **Recommandation** : bandeau TV partout, un seul en-tête pour tout ZIK

## Intégration des pages : connexion dans l'en-tête

- **Chantier** : Accueil, /pro, /soiree (code)
- **Depuis** : 15/11
- **Question** : Les nouveaux en-têtes n'ont ni « Connexion », ni avatar, ni notifications. On les ajoute dans le bandeau ?
- **Options** : ajouter connexion + avatar (+ notifications) · seulement connexion + avatar
- **Recommandation** : connexion + avatar, notifications dans le menu de l'avatar

## Intégration des pages : où mettre les vidéos

- **Chantier** : Accueil, /soiree (code)
- **Depuis** : 15/11
- **Question** : Les vidéos (accueil 25 Mo, /soiree 28 Mo avant compression) vont dans le dépôt GitHub (public, gardées pour toujours dans l'historique) ou dans Supabase Storage ?
- **Options** : dépôt, après compression (~3 Mo par vidéo mobile) · Supabase Storage
- **Recommandation** : dépôt après compression : rien à payer ni quota à surveiller, servies par notre serveur comme le reste

## Intégration des pages : fond animé et bar 3D

- **Chantier** : /soiree (code)
- **Depuis** : 15/11
- **Question** : Le fond animé (WebGL) de /soiree et la page « Visiter le bar en 3D » : dans cette release ou la suivante ?
- **Options** : tout maintenant · fond en dégradé CSS et bar 3D à la release suivante
- **Recommandation** : dégradé CSS et bar 3D à la release suivante : release plus légère et plus sûre, la vidéo du bar reste
