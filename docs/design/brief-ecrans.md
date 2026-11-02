# ZIK — Brief des écrans pour Stitch

Ce document décrit le site ZIK tel qu'il doit être après la refonte : chaque page, à qui elle sert, ce qu'on y trouve et ce qu'on peut y faire. Le style vient de `DESIGN.md`. La disposition (emplacement des boutons, menus, grilles) est laissée libre : propose ce qui rend la navigation la plus simple et la plus rapide.

Statut de chaque page : **Gardée** (existe, contenu inchangé), **Modifiée** (existe, change), **Nouvelle** (à créer), **Fusionnée** (disparaît, son contenu va ailleurs), **Plus tard** (prévue, pas pour la première version).

## 1. Contexte

ZIK est un blind test musical : on entend un extrait, on trouve le titre et l'artiste le plus vite possible. Le site a deux univers qui partagent un compte et une identité visuelle :

- **Jouer en ligne** : jeu grand public, gratuit, depuis son téléphone ou son ordinateur. Rooms par thème, partie du jour (Zikle), défi de la semaine, cartes à collectionner, classements.
- **ZIK Soirée** : l'outil des organisateurs de soirées. Un écran TV diffuse la musique et les scores, l'animateur pilote depuis une régie, les joueurs répondent sur leur téléphone après avoir scanné un QR code, sans compte ni appli. Gratuit jusqu'à 12 joueurs et 2 équipes ; **ZIK Pro** (abonnement ou pass d'une soirée) débloque tout le reste. C'est la partie qui fait vivre ZIK : elle doit inspirer confiance à des professionnels.

## 2. Publics

| Public                                                                      | Ce qu'il veut                                                               | Où il passe                                     |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| Joueur en ligne                                                             | Jouer vite, progresser, comparer                                            | Jouer en ligne, profil                          |
| Organisateur (gérant de bar, camping, entreprise, association, particulier) | Lancer une soirée qui marche du premier coup, sans stress devant son public | ZIK Soirée, espace organisateur                 |
| Joueur en soirée                                                            | Rejoindre en 10 secondes et jouer                                           | Téléphone uniquement : rejoindre, jouer, podium |
| Admin ZIK                                                                   | Surveiller, aider les organisateurs en direct, gérer le contenu             | Admin (hors de ce brief, sauf la page Statut)   |

## 3. Navigation globale

- **Accueil = choix de direction.** Deux portes de taille égale : « Jouer en ligne » et « Animer une soirée ». Un champ « J'ai un code » pour rejoindre directement une soirée ou une partie privée.
- **Deux navigations distinctes.** Dans Jouer en ligne : Rooms, Zikle, Défi, Playlists, Cartes, Classements, plus le compte. Dans ZIK Soirée : Découvrir, Tarifs, Créer une soirée, Mon espace, Aide. On passe d'un univers à l'autre par un lien discret et permanent, et par le logo qui ramène à l'accueil.
- **Écrans de jeu en soirée (TV, régie, téléphone) : aucune navigation du site.** Ils sont en plein écran et ne montrent que ce qui sert à la soirée.
- **Compte** : un seul compte pour les deux univers. Le menu compte donne accès au profil, à la collection, aux paramètres et, pour un organisateur, à son espace.
- **Pied de page** : statut des services, nouveautés, aide, mentions légales, CGU, CGV, confidentialité, soutenir ZIK.

## 4. Arborescence cible

```
/                                   Accueil, choix de direction           Modifiée
/rejoindre                          Saisie d'un code                      Nouvelle

Jouer en ligne
/rooms  /room/[code]                Rooms et partie                       Gardées
/game   /results/[id]               Partie en cours, résultats            Gardées
/zikle  /zikle/archives/…           Chanson du jour                       Gardées
/defi   /defi/archives/…            Défi communautaire                    Gardées
/playlists                          Playlists du joueur                   Gardée
/cartes /carte/[n] /collection/…    Cartes à collectionner                Gardées
/classements                        Classements                           Gardée
/blind-test /blind-test/…           Pages thèmes et artistes (SEO)        Gardées
/profile  /user/[username]          Profil                                Modifiées (onglet Mes soirées)
/settings                           Paramètres du compte                  Gardée

ZIK Soirée
/soiree                             Présentation pour organisateurs        Nouvelle (remplace le haut de /salon)
/soiree/tarifs                      Offres ZIK Pro                        Modifiée (ex /pro)
/soiree/tarifs/merci                Confirmation d'achat                  Modifiée (ex /pro/merci)
/soiree/bar  /camping  /entreprise  /evenement  /association
                                    Pages par usage                       Nouvelles
/soiree/comparatif                  Comparatif avec les autres outils      Nouvelle (remplace /vs/*)
/soiree/creer                       Création d'une soirée                 Modifiée (ex /salon)
/soiree/tv                          Écran TV                              Modifiée (ex /salon/host)
/soiree/regie                       Régie de l'animateur                  Modifiée (ex /salon/regie)
/soiree/jouer                       Téléphone du joueur                   Modifiée (ex /salon/play)
/soiree/espace                      Espace organisateur                   Nouvelle
/soiree/espace/lieux/[id]           Fiche d'un lieu et son historique     Nouvelle
/soiree/espace/soirees/[id]         Détail d'une soirée passée            Nouvelle
/soiree/aide                        Guide de l'organisateur               Nouvelle (extrait de /docs)

Commun
/statut                             État des services                     Nouvelle
/nouveautes  /docs  /soutenir       Nouveautés, aide joueur, dons         Gardées
/cgu /cgv /confidentialite /mentions-legales                              Gardées
/reset-password                     Nouveau mot de passe                  Gardée
/vs/blinest  /vs/blindtest-io  /vs/kahoot                                 Fusionnées dans /soiree/comparatif
```

Les anciennes adresses (`/salon`, `/salon/host`, `/salon/regie`, `/salon/play`, `/pro`) redirigent vers les nouvelles : les QR codes et liens déjà partagés doivent continuer à marcher.

## 5. Écrans communs

### Accueil `/` — Modifiée

- **But** : envoyer chaque visiteur dans le bon univers en un clic.
- **Contenu** : accroche courte ; deux grandes portes « Jouer en ligne » (rooms en direct, Zikle du jour) et « Animer une soirée » (TV + téléphones, pour bars, campings, entreprises, soirées privées) ; champ « J'ai un code » ; soirées et rooms en direct maintenant (nombre de joueurs) ; aperçu des nouveautés ; preuve de confiance pour les organisateurs (nombre de soirées jouées, avis de clients Pro quand il y en aura).
- **Actions** : choisir une porte, saisir un code, se connecter.
- **États** : visiteur, connecté, connecté organisateur Pro (accès direct à son espace).

### Rejoindre `/rejoindre` — Nouvelle

- **But** : un seul endroit pour taper un code, qu'il s'agisse d'une soirée ou d'une room privée.
- **Contenu** : champ code de 6 caractères, gros et lisible ; aide « le code est affiché sur la TV ».
- **États** : code inconnu ou expiré, soirée pleine (offre gratuite), soirée terminée.

### Statut `/statut` — Nouvelle

- **But** : montrer aux clients que ZIK est surveillé et transparent.
- **Contenu** : état global en une phrase ; quatre services (Site, Soirées en direct, Musique, Paiements) avec Opérationnel, Dégradé ou Panne ; historique sur 90 jours en barres par jour ; incidents récents avec heure de début, de fin et explication courte ; maintenances annoncées.
- **États** : tout va bien, dégradé, panne en cours, maintenance programmée.

### Connexion et inscription — Modifiée

- **But** : se connecter sans quitter la page en cours (fenêtre par-dessus la page).
- **Contenu** : e-mail et mot de passe, Google, Discord ; vérification anti-robot ; lien mot de passe oublié.
- **Variante organisateur** : à l'inscription depuis ZIK Soirée, demander en plus le type de lieu (bar, camping, entreprise, association, particulier).

## 6. Jouer en ligne

Ces pages existent et fonctionnent ; la refonte porte surtout sur une navigation propre à cet univers et sur la cohérence visuelle. Contenu actuel à conserver :

| Page                                          | But                                | Contenu principal                                                                    |
| --------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| Rooms `/rooms`                                | Choisir une partie publique        | Rooms par thème avec joueurs en ligne, rooms officielles, création d'une room privée |
| Room `/room/[code]`                           | Salle d'attente puis partie        | Joueurs présents, playlist, chat, lancement                                          |
| Partie `/game`                                | Jouer                              | Extrait, chrono, saisie libre ou QCM, classement en direct, cartes gagnées           |
| Résultats `/results/[id]`                     | Bilan d'une partie                 | Podium, scores, titres joués, rejouer, partager                                      |
| Zikle `/zikle`                                | La chanson du jour                 | Essais successifs, indices, série de jours, partage du résultat, archives            |
| Défi `/defi`                                  | Objectif collectif de la semaine   | Progression commune, contributions, paliers de badges, archives                      |
| Playlists `/playlists`                        | Gérer ses playlists                | Import Deezer et Spotify, création manuelle, réponses personnalisées par titre       |
| Cartes `/cartes`, `/carte/[n]`, `/collection` | Collectionner les cartes de titres | Catalogue par rareté, fiche d'une carte, collection d'un joueur                      |
| Classements `/classements`                    | Se comparer                        | ELO, meilleurs scores, semaine et tout temps, collectionneurs                        |
| Thèmes `/blind-test/…`                        | Pages d'entrée depuis Google       | Un thème ou un artiste, bouton jouer                                                 |
| Paramètres `/settings`                        | Réglages du compte                 | Pseudo, avatar, thème clair ou sombre, notifications, confidentialité                |

### Profil `/profile` et `/user/[username]` — Modifiées

- **Ajout** : onglet **Mes soirées**. Liste des soirées jouées avec un compte : date, lieu (si l'organisateur l'a renseigné), rang, score, équipe. Un joueur parti avant la fin apparaît avec son score au moment du départ, marqué « parti en cours ».
- Le reste est gardé : niveau, statistiques, succès, cartes vitrines, amis.

## 7. ZIK Soirée — pages publiques

### Présentation `/soiree` — Nouvelle

- **But** : convaincre un organisateur en moins d'une minute et l'amener à créer sa première soirée.
- **Contenu** : promesse claire (« Le blind test de votre soirée, sur votre TV, avec les téléphones des joueurs ») ; démonstration du fonctionnement en 3 étapes (ouvrir la TV, les joueurs scannent, l'animateur pilote) avec visuels des trois écrans ; ce qui est gratuit et ce qu'apporte Pro ; usages (bar, camping, entreprise, événement privé, association) menant aux pages dédiées ; chiffres de confiance ; questions fréquentes (matériel nécessaire, droits musicaux, connexion internet, nombre de joueurs).
- **Actions** : « Créer une soirée » (principal), « Voir les tarifs », « Rejoindre une soirée ».

### Tarifs `/soiree/tarifs` — Modifiée (ex `/pro`)

- **But** : choisir une formule.
- **Contenu** : comparaison Gratuit / Soirée (7,90 €, 24 h) / Mensuel (19 €) / Annuel (190 €) ; ce que débloque Pro (joueurs et équipes illimités, classement de la soirée, buzzer, manches spéciales, régie complète, historique par lieu) ; fonctions à venir ; rappel que les droits SACEM et SPRE sont à la charge du lieu ; questions fréquentes sur le paiement et la résiliation.
- **États** : visiteur, connecté sans Pro, Pro actif (date de fin, lien vers la gestion d'abonnement).

### Pages par usage `/soiree/bar`, `/camping`, `/entreprise`, `/evenement`, `/association` — Nouvelles

- **But** : parler à chaque type d'organisateur avec ses mots, et être trouvées sur Google.
- **Contenu** (même gabarit) : situation type (« un jeudi soir au bar », « la soirée animation du camping », « le séminaire d'équipe ») ; déroulé d'une soirée type ; réglages conseillés (nombre de manches, équipes, mode buzzer) ; playlists conseillées ; formule conseillée ; bouton « Créer une soirée ».

### Comparatif `/soiree/comparatif` — Nouvelle

- **But** : répondre honnêtement à « pourquoi ZIK plutôt qu'un autre outil ».
- **Contenu** : tableau factuel avec les outils du marché (prix, nombre de joueurs, buzzer, régie séparée, équipes, classement de soirée, historique) ; points forts de ZIK ; date de mise à jour des prix.

### Guide de l'organisateur `/soiree/aide` — Nouvelle

- **But** : tout ce qu'il faut savoir avant et pendant une soirée.
- **Contenu** : matériel (TV ou projecteur, ordinateur, son, connexion), préparer ses playlists, rôle de chaque écran, que faire si la vidéo ou la connexion coupe, droits musicaux, contact du support.

## 8. ZIK Soirée — créer et animer

### Créer une soirée `/soiree/creer` — Modifiée (ex `/salon`)

- **But** : lancer une soirée en moins de deux minutes.
- **Contenu** :
  - choix des playlists (officielles par thème, les siennes, import Deezer) avec pochettes ;
  - réglages : nombre de manches (5, 10, 15, 20), temps pour répondre (15 à 60 s), mode de réponse (saisie libre « pour les connaisseurs », QCM « tout le monde joue », buzzer « l'animateur valide à voix haute »), manches spéciales (points doubles, intro éclair, sprint), enchaînement automatique ou au clic, nombre d'équipes (0 à 16), durée d'affichage de la réponse, entracte ;
  - choix du lieu (Pro, nouveau) : un lieu enregistré, en créer un, ou aucun ;
  - les options Pro restent visibles avec un badge et un lien vers les tarifs.
- **Actions** : « Ouvrir l'écran TV » (principal), qui crée la soirée et donne le lien de la régie.
- **États** : visiteur (peut créer sans compte), connecté, Pro, playlist trop courte, erreur de chargement.

### Écran TV `/soiree/tv` — Modifiée (ex `/salon/host`)

- **But** : ce que voit toute la salle. Lisible de loin, une seule information forte à la fois. Sans navigation, en plein écran.
- **Séquence d'états** :
  1. **Accueil** : nom de la soirée ou du lieu, gros QR code, code à 6 caractères, adresse à taper, joueurs qui arrivent, équipes et leurs membres.
  2. **Vérification de la musique** (avant le lancement) : progression du nombre de titres prêts.
  3. **Annonce de manche** : numéro de manche, et annonce plein écran si manche spéciale.
  4. **Manche** : vidéo ou visuel de l'extrait, chrono, nombre de joueurs qui ont trouvé, premier à trouver ; en mode buzzer, nom du joueur ou de l'équipe qui a buzzé.
  5. **Réponse** : titre, artiste, pochette, joueurs qui ont trouvé, points gagnés.
  6. **Classement** entre deux manches : joueurs ou équipes, évolution.
  7. **Fin de partie** : podium, statistiques amusantes.
  8. **Entracte** : classement de la soirée, compte à rebours, invitation à rejoindre pour les retardataires.
  9. **Podium final de la soirée** (Pro) : cumul de toutes les parties.
- **États transverses** : pause, « petite pause technique » (musique indisponible, nouvel essai automatique), reconnexion en cours, mise à jour annoncée, régie déconnectée.

### Régie `/soiree/regie` — Modifiée (ex `/salon/regie`)

- **But** : le poste de pilotage de l'animateur, sur ordinateur, tablette ou téléphone, à côté de la TV. Il doit pouvoir réagir en une seconde, sans chercher.
- **Toujours visibles** : état de la soirée (phase, manche x/y, chrono), titre en cours avec la réponse (visible seulement ici), actions de la manche : lancer, révéler, manche suivante, pause et reprise, terminer la partie, volume de la TV.
- **Sections** :
  - **Direct** : la manche en cours ; en mode buzzer, le joueur qui a buzzé avec « Bonne réponse » et « Raté » ; titres déjà joués ; signaler un souci sur une vidéo.
  - **Joueurs** : liste avec score, équipe, connecté ou parti ; déplacer un joueur d'équipe, corriger un score, retirer un joueur (avec confirmation).
  - **Équipes** : noms et couleurs, renommer, équilibrer.
  - **Soirée** (Pro) : classement cumulé, lancer la partie suivante, entracte, podium final, remise à zéro.
  - **Réglages** : les mêmes que la création, modifiables en cours (Pro).
  - **Aide** : guide rapide et chat avec le support ZIK (« Écris ce qui se passe, l'admin le lira ici », « Rappeler un admin »).
- **États** : TV non connectée (instructions pour l'ouvrir), aucun joueur, partie en cours, fonction Pro verrouillée (badge + lien), connexion perdue, mise à jour annoncée.

### Téléphone du joueur `/soiree/jouer` — Modifiée (ex `/salon/play`)

- **But** : rejoindre en 10 secondes et jouer d'une main, sans quitter la TV des yeux.
- **Séquence** :
  1. **Rejoindre** : code (pré-rempli par le QR code), pseudo ; option se connecter pour garder ses scores.
  2. **Attente** : « Tu es dans la partie », choix de l'équipe, nombre de joueurs.
  3. **Manche** : selon le mode, champ de saisie avec retour immédiat (trouvé, presque, raté), 4 grands choix QCM, ou gros buzzer. Rien sur le titre ou l'artiste avant la révélation.
  4. **Réponse** : bonne réponse, points gagnés, rang actuel.
  5. **Fin de partie et de soirée** : rang final, score, équipe ; inviter à créer un compte pour retrouver la soirée dans « Mes soirées » ; « Organiser ma soirée ».
- **États** : reconnexion en cours, soirée terminée, retiré par l'animateur, soirée pleine (offre gratuite), mise à jour annoncée.

## 9. ZIK Soirée — espace organisateur

### Tableau de bord `/soiree/espace` — Nouvelle

- **But** : le point d'entrée d'un organisateur connecté.
- **Contenu** : bouton « Créer une soirée » ; soirée en cours si une est ouverte (reprendre la régie) ; dernières soirées ; lieux ; playlists favorites ; abonnement (formule, date de fin, gérer le paiement et les factures) ; état des services (lien vers `/statut`).
- **États** : pas encore de soirée (premier pas guidé), gratuit, Pro actif, Pro expiré.

### Fiche d'un lieu `/soiree/espace/lieux/[id]` — Nouvelle

- **But** : l'historique d'un lieu pour les organisateurs réguliers (entreprise, camping, association, bar). Inclus dans Pro.
- **Contenu** : nom, type, ville ; liste des soirées jouées ici ; joueurs et équipes les plus réguliers ; classement du lieu sur une période ; playlists les plus jouées.
- **Actions** : créer une soirée dans ce lieu, renommer, archiver.

### Détail d'une soirée passée `/soiree/espace/soirees/[id]` — Nouvelle

- **But** : retrouver et partager le résultat d'une soirée.
- **Contenu** : date, lieu, nombre de parties et de joueurs ; podium final ; classement complet des joueurs et des équipes, partants inclus ; titres joués.
- **Actions** : télécharger l'image du podium au format story, exporter les scores (Pro).

### Plus tard

- Soirées programmées et inscription des équipes à l'avance.
- Écran TV aux couleurs du lieu (logo, couleurs, message d'accueil).
- Offre pour animateurs qui tournent dans plusieurs lieux.

## 10. États à prévoir partout

Chaque écran doit avoir une version pour : chargement, vide (première utilisation), erreur avec action pour réessayer, hors ligne ou reconnexion, maintenance annoncée, fonction Pro verrouillée quand c'est pertinent. Messages courts, en français, rassurants, jamais d'erreur technique brute devant la salle.

## 11. Comment utiliser ce brief dans Stitch

1. Charger `DESIGN.md` comme système de design du projet.
2. Donner les sections 1 à 4 de ce brief comme contexte général.
3. Générer un écran à la fois en collant sa fiche (sections 5 à 9), en précisant le format : TV en 1920×1080, régie en ordinateur 1440×900 et tablette, téléphone en 390×844, pages du site en ordinateur et téléphone.
4. Pour la TV et le téléphone, générer chaque état de la séquence séparément.
