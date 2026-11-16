# Passer en ZIK Pro en pleine soirée

Statut : parcours validé par Théo le 16/11 (réponses ci-dessous) ; écrans 2 et 3 à maquetter avant le code.

## Problème

Au 13e joueur refusé, l'organisateur ouvre /pro dans un autre onglet, s'inscrit, confirme son e-mail : la formule choisie (en `sessionStorage`) peut se perdre, et même payé, le salon en cours ne passe pas Pro (`salon.pro` calculé une fois à la création, `rooms.js:43` ; seul `supportGiftPro` bascule un salon vivant). Il doit recréer la soirée et faire rescanner la salle. C'est la plus grosse perte de revenu repérée.

## Parcours cible

1. Régie : « Passer à ZIK Pro » ouvre `/pro?formule=night&salon=CODE#tarifs` dans un nouvel onglet, la régie reste ouverte.
2. /pro garde l'intention en `localStorage` (formule, salon, 1 h), la reprend après connexion ou inscription ; le mail de confirmation ramène sur /pro.
3. Paiement : le serveur vérifie compte connecté + clé de régie, rattache le salon au compte (403 si salon d'un autre compte). Compte déjà Pro : bascule immédiate sans paiement.
4. Webhook payé : tous les salons en mémoire de l'acheteur passent Pro, la régie et la TV le voient, instantané écrit. Reprise après redémarrage : `pro` recalculé.
5. Joueurs refusés : mis en attente, ils entrent seuls dès que le salon passe Pro.

## Découpage

1. Serveur : rattachement, bascule au webhook, reprise (rien de visible).
2. Achat : URL, intention, fenêtre de la régie, /pro/merci, redirection du mail (maquette).
3. File d'attente des refusés (maquette téléphone).

Pas de migration. Tests : régression webhook → salon Pro, entrées hostiles du paiement, webhook rejoué, instantané, intégration de la file d'attente.

## Réponses de Théo (16/11)

1. Oui : la régie propose la Soirée 24 h en un clic, **et aussi les abonnements** par un lien vers /pro ouvert dans un nouvel onglet.
2. Compte obligatoire pour payer ou s'abonner.
3. File d'attente oui, mais le texte n'est pas « en attendant que Pro soit actif » : c'est « tu entres **si une place se libère** » (un joueur qui part libère une place, le passage Pro en libère d'un coup).
