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
- **Statut** : reporté par Théo (pas de micro-entreprise pour l'instant), à revoir avant de pousser les ventes Pro
- **Question** : Tu n'as pas d'entreprise pour le moment, alors que ZIK Pro vend des abonnements à des pros (CGV et mentions légales : vendeur « Particulier », sans SIRET, « TVA non applicable » sans article de loi). Créer une micro-entreprise (gratuit, en ligne) pour encaisser ZIK Pro légalement ?
- **Options** : micro-entreprise en franchise → mention « TVA non applicable, art. 293 B du CGI » + SIRET sur /pro, CGV, factures Stripe ; ou assujetti à la TVA → prix HT + 20 % via Stripe Tax
- **Recommandation** : créer la micro-entreprise, faire confirmer la franchise de TVA par l'URSSAF ou un comptable, puis envoyer le SIRET à Claude qui corrige CGV, mentions légales, /pro et factures Stripe. Seuils de franchise services 2026 : 37 500 € / 41 250 € (à vérifier sur service-public.gouv.fr)
- **Lien** : https://formalites.entreprise.gouv.fr/

## Promo : vraie partie, version équilibrée (25 s)

- **Chantier** : Marketing (Clara)
- **Depuis** : 16/11
- **Question** : Dernier essai de ce format, comme tu l'as demandé : 3 manches montrées en entier (Madonna trouvée vite, Silver Pozzoli ratée « qui ça ? », DeBarge trouvée), seuls les temps morts coupés, son du jeu continu, puis « score final : 7/10, vous ? ». Risque droits : extraits protégés hors bibliothèque TikTok. On la garde ou on abandonne ce format ?
- **Options** : planifier · retoucher · abandonner le format
- **Recommandation** : la regarder une fois ; si elle ne te donne pas envie, on abandonne ce format
- **Lien** : C:/Users/Teamr/Documents/GitHub/ZIK-memes/promo/montage/out/lot1/partie-equilibre.mp4

## Pro en pleine soirée : Soirée 24 h en un clic depuis la régie ?

- **Chantier** : Passage Pro en pleine soirée (fiche de l'architecte)
- **Depuis** : 16/11
- **Question** : Quand un salon gratuit est plein (13e joueur), la régie propose seulement la Soirée 24 h en un clic, les abonnements restant sur /pro. Le salon en cours passe Pro tout seul après paiement, sans recréer ni rescanner.
- **Options** : oui · proposer aussi les abonnements
- **Recommandation** : oui
- **Lien** : docs/specs/2026-11-16-pro-en-pleine-soiree.md

## Pro en pleine soirée : compte obligatoire pour payer ?

- **Chantier** : Passage Pro en pleine soirée (fiche de l'architecte)
- **Depuis** : 16/11
- **Question** : On garde le compte obligatoire pour payer (il sert à rattacher le salon et à retrouver l'abonnement), ou on autorise le paiement sans compte ?
- **Options** : compte obligatoire · paiement sans compte
- **Recommandation** : compte obligatoire
- **Lien** : docs/specs/2026-11-16-pro-en-pleine-soiree.md

## Pro en pleine soirée : file d'attente des refusés ?

- **Chantier** : Passage Pro en pleine soirée (fiche de l'architecte)
- **Depuis** : 16/11
- **Question** : Les joueurs refusés au-delà de 12 restent en attente sur leur téléphone et entrent tout seuls dès que ZIK Pro est actif ?
- **Options** : oui · non, ils rescannent
- **Recommandation** : oui
- **Lien** : docs/specs/2026-11-16-pro-en-pleine-soiree.md
