# Journal des décisions

Décisions du board (`/board`) et de Théo, la plus récente en haut. Chaque entrée garde son critère d'arrêt pour qu'on sache quand revenir dessus.

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
