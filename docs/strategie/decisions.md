# Journal des décisions

Décisions du board (`/board`) et de Théo, la plus récente en haut. Chaque entrée garde son critère d'arrêt pour qu'on sache quand revenir dessus.

## 15/11/2026 — Posts LinkedIn

**Décision de Théo** : seul le post « cap des 1 000 inscrits » (ton naturel) est retenu, publié par Théo sur son compte. Pas de posts techniques pour l'instant.

## 15/11/2026 — Intégration des pages refaites

**Décision de Théo** : en-tête unique « bandeau TV » sur les pages refaites (plus de barre arrondie, trop classique : ZIK doit être plus original), avec Connexion et avatar (compte facultatif, profil par partie à venir). Il laisse à Claude les choix techniques : vidéos dans le dépôt après compression ; fond animé WebGL et page du bar 3D à une release suivante si pas assez testés, sans casser la cohérence entre pages. Stripe connecté dans Claude Code.

## 15/11/2026 — Maquettes validées

**Décision de Théo** : maquettes validées pour le code : accueil v2 « Un immeuble, deux façons de jouer » (https://claude.ai/artifact/X83DboZRQimzda7M5cRiBy, retouche demandée : mettre en forme le bloc « Le blind test musical, gratuit et sans appli »), /pro et /pro/merci (https://claude.ai/artifact/WZhgyaL7hgzjBX7fMPpmvu, sans promesses de fonctions futures), /soiree (https://claude.ai/artifact/BuH2PVJ6Qe3Eni5H81AXZu).

## 15/11/2026 — Réponses de Théo depuis le QG

**Décision de Théo** : les 7 sons du plan promo sont validés ; post LinkedIn sur son compte personnel, général (cap des inscrits) puis un plus technique ; script de prise de vue d'un salon sur le staging validé ; routine quotidienne `/operations suite` dans le cloud : oui ; règle « soirée réussie d'abord » confirmée. Instagram : création refusée, à retenter ; YouTube Shorts à ajouter.

## 15/11/2026 — Charte v2 et refonte des pages ZIK Soirée

**Décision de Théo** : la maquette `/soiree` (bar 3D, vidéo au scroll, 10 sections animées) devient la direction de style de tout le site et la future page principale du mode soirée. `DESIGN.md` v2 en découle. Ton mixte : tu pour les joueurs, l'accueil, la création et la régie ; vous sur `/pro` et `/soiree` ; vous pluriel sur la TV. Univers ZIK Soirée toujours sombre. Aucune release (dont la v3.32, #428) avant la refonte, maquette validée d'abord, page par page : accueil, `/pro`, `/soiree`, création et avant-partie (TV, téléphone, régie), passage en ZIK Pro en pleine soirée, fin de partie et « Rejouer », régie.

**Critère d'arrêt** : si une maquette est refusée deux fois, on revient à la fiche avec l'équipe Produit avant d'en refaire une.

## 15/11/2026 — Vision et direction de ZIK

**Décision de Théo** : ZIK Soirée pour tous (groupes et pros) est le produit jusqu'en mai 2027 ; le jeu en ligne est maintenu sans nouveau chantier. Trois chiffres à égalité : soirées réussies, organisateurs fidèles, clients payants. Ton : pro côté organisateur, festif côté joueurs. Porte concept : tout ce qui se voit est validé sur fiche et maquette avant le code. Détail : `docs/strategie/vision.md`.

**Confirmé par Théo le 15/11** : en cas de conflit entre les chiffres, la soirée réussie d'abord. **Proposé par Claude** : tutoiement partout (remplacé le 15/11 par le ton mixte) ; nouvel agent `animation` (gardien du fun) dans l'équipe Produit.

**Critère d'arrêt** : revue au `/board` mensuel. Si aucun des trois chiffres n'a progressé au 15/02/2027, on revoit la direction.

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

**Décision de Théo** (15/11) :

- Option B : fiabilité d'abord, expérience en v3.33.
- Le pass à 7,90 € devient « Pass 24 h », prix inchangé (v3.33).
- Charte : on aligne DESIGN.md sur le code (sombre, ombres). La direction de ZIK, les agents et le QG sont retravaillés le 16/11, avant d'écrire la charte.
- Encore à décider, pour la v3.33 : ligne ZIK sur la TV gratuite, nom du lieu sur la story, adresse courte, source Stripe.

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
