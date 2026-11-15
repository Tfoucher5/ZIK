# Journal des décisions

Décisions du board (`/board`) et de Théo, la plus récente en haut. Chaque entrée garde son critère d'arrêt pour qu'on sache quand revenir dessus.

## 15/11/2026 — Que faire de la v3.32 refusée ?

**Question** : faut-il sortir la v3.32 après des retouches ciblées, ou la retravailler plus en profondeur avant toute mise en prod ?

**Recommandation du board** : option B, porte réduite.

- **Tout de suite** : B1 (téléphone bloqué une manche après une coupure, déjà en prod) en hotfix sur `master`.
- **Dans la porte de la v3.32** :
  - B2 et B3 (reconnexion), avec e2e ;
  - version de `phone.css` ;
  - plafond de `reclaim` et sauvegarde du jeton ;
  - `httpLookups` ;
  - TV de fin de partie sans les réglages de l'hôte ;
  - « JOUEREN LIGNE » ;
  - texte de `/soiree` aligné sur la reprise de place.
- **Recette** à plus de 12 téléphones, dont un vrai iPhone.
- **Lot « expérience »** (fun, textes, UI, gérant sur téléphone, story, vente) : v3.33, cadrée par `/produit`, qui commence par la colonne `regie_seen`.

Détail : `docs/reunions/2026-11-15-revue-v3.32/synthese.md`.

**Votes** : B 7/7 aux deux tours. Le CFO, le CPO, le CMO et le client Pro ont réduit leur porte au tour 2, au vu des chiffres de prod : 18 refus à 12 joueurs, sans achat, et 0,8 % des visites Google sur `/salon`.

**Arguments décisifs** :

- Avocat : B1 était déjà en prod.
- Analyste : 62 % des arrivées Google se font sur `/`.
- CTO : moins de code d'un coup dans `join.js` et `playerEvents.js`.

**Désaccords restants** :

- Message au 13ᵉ joueur dans la porte : oui pour le CTO et le COO, non pour les cinq autres.
- Le lot « expérience » ne répond qu'en v3.33 à la demande de Théo.

**Critère d'arrêt** : si les arrivées Google sur `/` baissent de plus de 20 % dans les 7 jours après la release, on remet l'ancien accueil sur `/`.

**Décision de Théo** : en attente. À trancher : le rythme (B ou C), le nom du pass, charte ou code (clair et sans ombres, ou sombre avec ombres), les options marketing de la v3.33.

## 13/11/2026 — Offre payante pour les particuliers ?

**Question** : faut-il lancer une offre payante pour les particuliers qui jouent à la maison, distincte de ZIK Pro ?

**Recommandation du board** (unanime au tour 2) : option 3. Pas d'abonnement « Maison » maintenant, pas de fonctions « maison » gratuites. On rend le pass « Soirée » (7,90 €) visible pour les groupes : anniversaires, associations, soirées entre amis. Ça passe par une page dédiée et un texte, avec une source « maison » enregistrée dans les métadonnées Stripe pour mesurer les ventes. Rien n'est codé dans le salon.

**Votes** : option 3 : 7 sur 7 · option 2 (abonnement Maison) : 0 · option 4 (gratuit) : 0. Au tour 2, le CPO et le CMO ont retiré la playlist des invités de leur condition, et le CMO a renoncé à un pass moins cher.

**Arguments décisifs**

- CTO : `isPro()` ne gère qu'un droit par compte. Un abonnement « Maison » demande des niveaux de droits et touche à l'argent réel (1 à 2 semaines). La playlist des invités, ajoutée en pleine partie, va contre la règle « aucun appel YouTube côté serveur pendant une partie ». Piste à faire valider : les invités ajoutent leurs titres seulement dans le salon d'attente.
- CFO : 4 mensuels sur 5 animent des salons de 1 à 3 joueurs. Une formule à 3 à 5 € les ferait descendre, et le revenu mensuel passerait d'environ 95 € à environ 40 €.
- Chiffres de la base : les 9 acheteurs du pass sont des groupes de 7 à 13 joueurs, souvent à la limite des 12, et 6 sur 9 reviennent sur plusieurs jours. Le pass marche déjà pour eux.

**Désaccords restants** : seuil de réouverture (8 ou 10 pass par mois, 4 semaines ou 2 mois). La place de la playlist des invités : réservée aux formules payantes (CPO, CFO) ou à cadrer d'abord (CTO, COO, avocat).

**Test le moins cher** : la page « soirée de groupe » avec la source « maison » dans Stripe, pendant 4 semaines.

**Critère d'arrêt** : on ne rouvre l'abonnement « Maison » que si le pass dépasse 10 ventes par mois pendant 2 mois (à partir du 14/01/2027), sans qu'aucun mensuel ne résilie. La playlist des invités attend la phase 3 de fiabilité et un plan de l'architecte sans appel YouTube pendant la partie.

**Décision de Théo** (13/11) : rien pour l'instant. On suit le plan en cours, qui a déjà sa liste de tâches. La question revient dans 2 mois.
