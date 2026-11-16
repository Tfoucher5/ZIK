# Synthèse — revue de la v3.32 (15/11/2026)

10 ateliers de pôle, une réunion inter-pôles en 2 tours (7 membres) et les chiffres de prod de l'analyste.

## Décision recommandée

**B, porte réduite. La fiabilité part maintenant ; l'expérience (UX, UI, fun) devient une v3.33 cadrée par le pôle Produit.**

1. **Hotfix sur `master`, tout de suite** (7/7) : **B1**, un téléphone qui répond pendant une coupure reste bloqué toute la manche suivante. Le bug est **déjà en prod** (`playerEvents.js`, bloc `reconnecting`), indépendant de la v3.32.
2. **Porte de la v3.32**, liste figée :

   | Point                                                                                                  | Pour                 | Effort |
   | ------------------------------------------------------------------------------------------------------ | -------------------- | ------ |
   | B2 « Réponse verrouillée » seulement après confirmation du serveur, B3 reconnexion immédiate, avec e2e | 7/7                  | S/M    |
   | `phone.css?v=3.32.0` + test qui vérifie la version des CSS modifiés                                    | 7/7                  | S      |
   | `reclaim.js` : plafond de demandes, une demande par téléphone, `saveSnapshot` après `renewToken`       | 7/7                  | S      |
   | `httpLookups` par IP (503 sur la reprise de soirée)                                                    | 6/7                  | S      |
   | TV de fin de partie sans les réglages de l'hôte quand une régie est connectée                          | CPO + arbitrage CEO  | S      |
   | « JOUEREN LIGNE »                                                                                      | CPO, COO, CMO        | S      |
   | Texte de `/soiree` aligné sur ce que fait la reprise de place (sans promettre la TV seule)             | CTO, CPO, client Pro | S      |

   Arbitrage du CEO sur les deux points visuels : ce sont des défauts **vus par toute la salle**, de taille S, sans risque pour la partie. Ils entrent dans la porte.

3. **Recette avant fusion** : plus de 12 téléphones, dont un vrai iPhone, sur le staging (6/7).
4. **Après la release** : comparer les arrivées Google sur `/` 7 jours avant et 7 jours après ; revert de l'aiguillage prêt (avocat, CMO).

## v3.33 « expérience », dans cet ordre

1. Colonne `regie_seen` dans `play.games` (migration) : mesurer avant de construire la reprise sans régie.
2. Fiche de cadrage `/produit` (ux, ui, redaction, idees) sur les comptes rendus de cette revue :
   - **fun** : arrivée qui se voit et s'entend, phrase de commentaire à la révélation, podium or/argent/bronze avec ex æquo, récap et playlist sur le téléphone, prix « La remontada » / « Sur le fil » ;
   - **pro** : textes (plus de « salon », vous pour l'organisateur, neutre en genre), émojis de la TV en SVG, un seul magenta par écran, accueil `/` plus vivant, zones tactiles, ZIK Soirée toujours en sombre ;
   - **facile** : gérant qui crée depuis son téléphone, QR de régie sur la TV, code faux signalé sur `/`, reprise de place qui ne boucle pas ;
   - **bouche-à-oreille** : story en bouton principal avec `?ref=story`, QR généré en local ;
   - **vente** : message au 13ᵉ joueur, bandeau 12/12 non bloquant, « Bientôt dans ZIK Pro » retiré.
3. SEO : H1 avec « blind test » sur `/jouer` et `/soiree`, `llms.txt`, quelques questions mixtes sur `/`.

## Votes

- Tour 1 : B 7/7, chacun avec une condition.
- Tour 2 : B 7/7.
- Changements d'avis :
  - Le CFO, le CPO, le CMO et le client Pro retirent le message au 13ᵉ joueur de la porte. Raison : 18 refus en 30 jours, aucun achat derrière.
  - Le CMO retire le `noindex` de `/salon`. Raison : Google n'y envoie que 0,8 % de ses visites, ChatGPT 12,8 %.
  - Le CPO et le client Pro acceptent de reporter la reprise de place sans régie, puisqu'on ne sait pas mesurer l'usage de la TV seule.

## Arguments décisifs

- **Avocat** : B1 existe peut-être déjà en prod (vérifié : oui). Bloquer la v3.32 ne protégeait donc personne ; le hotfix si.
- **Analyste** : la limite de 12 donne 18 refus en 30 jours, sans achat. 62 % des arrivées Google se font sur `/`. Le risque SEO est sur l'accueil, pas sur `/salon`.
- **CTO** : C et D touchent `join.js` et `playerEvents.js`, proches de 300 lignes. Plus de code d'un coup, c'est plus de risque en soirée.

## Désaccords restants

- Message au 13ᵉ joueur : dans la porte pour le CTO et le COO (texte seul), en v3.33 pour les 5 autres.
- `httpLookups` : hors porte pour l'avocat.
- Le lot « expérience » ne répond qu'en v3.33 à la demande de départ (pro, agréable, fun). C'est un choix de rythme pour Théo, pas un consensus technique.

## Le test le moins cher pour trancher

Recette à plus de 12 téléphones sur le staging après la porte (une demi-journée), et la colonne `regie_seen` pendant 2 semaines pour décider de la reprise sans régie.

## Critère d'arrêt

Si la part des arrivées Google sur `/` baisse de plus de 20 % (seuil d'intuition) dans les 7 jours qui suivent la release, alors qu'elle baissait déjà de 79 % à 49 %, on remet l'ancien accueil sur `/` et on garde `/jouer` et `/soiree`.

## Ce que Théo doit décider

1. **Le rythme** : B (fiabilité maintenant, expérience en v3.33) ou C (tout ensemble, release dans environ 2 semaines) ?
2. Le nom du pass à 7,90 € (« Soirée » se confond avec ZIK Soirée ; proposition : « Pass 24 h »).
3. La charte : DESIGN.md dit « clair par défaut, pas d'ombres », le code est sombre avec des ombres. On aligne la charte ou le code ?
4. En v3.33, à valider ou non : une ligne « Organisez la vôtre, zik-music.fr/soiree » sur la TV des soirées gratuites, le nom du lieu sur la story pour les Pro, une adresse courte à dicter, la source dans les métadonnées Stripe.
