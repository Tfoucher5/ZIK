# Audit ergonomique de la page d'accueil `/`

- **Site :** https://www.zik-music.fr/ (v3.11.0)
- **Date :** 2026-10-02
- **Méthode :** critères ergonomiques de Bastien & Scapin
- **Périmètre :** page de production parcourue dans Chrome, avec le compte connecté « TESKO », sur un écran de bureau en 1456×823, du haut de la page jusqu'au pied de page. Affichage mobile non testé.

---

## Synthèse

| # | Problème | Critère | Gravité |
|---|---|---|---|
| 1 | Trop d'actions de même poids dans l'écran d'accueil | Guidage → Distinction par le format | **Élevé** |
| 2 | Libellés incohérents : soirée / session / salon, room / code | Homogénéité + Signification | **Élevé** |
| 3 | Menu principal peu lisible, contenu visible derrière l'en-tête | Guidage → Lisibilité | **Élevé** |
| 4 | Panneau du défi qui cache le titre principal | Guidage → Lisibilité | Moyen |
| 5 | Petits textes à faible contraste | Guidage → Lisibilité | Moyen |
| 6 | Jargon non expliqué : Rooms, ELO, streaks, QCM | Signification des codes | Moyen |
| 7 | Saisie du code : bouton « → » seul, champ placé loin | Contrôle explicite → Actions explicites | Moyen |
| 8 | Top joueurs : colonne « — » sans légende, rangs peu visibles | Signification des codes | Moyen |
| 9 | Cartes des rooms : informations qui n'aident pas à choisir | Charge de travail → Densité informationnelle | Faible |
| 10 | Grille 01 à 08 : on ne sait pas si c'est cliquable ou ordonné | Guidage → Incitation | Faible |

---

## Constats détaillés

### 1. Trop d'actions de même poids dans l'écran d'accueil

- **Problème constaté :** 7 actions sont visibles sans faire défiler la page :
  - `Organiser une soirée` (rose, plein) ;
  - `Jouer en ligne` (contour) ;
  - `Discord` (violet, plein) ;
  - `Lancer une soirée →` (rose, plein) ;
  - `J'ai un code` ;
  - `Mode salon` dans l'en-tête ;
  - le badge `12 %` du défi.

  Deux boutons roses pleins ont des libellés presque identiques et semblent mener au même endroit. Discord, un lien vers un site externe, a le même poids visuel que les actions de jeu.
- **Critère impacté :** Guidage → Distinction par le format ; Charge de travail → Densité informationnelle.
- **Gravité :** Élevé. C'est le premier écran pour 100 % des visiteurs et il conditionne leur parcours.
- **Risque utilisateur :** hésitation sur le chemin à prendre ; dispersion vers Discord ; un joueur seul ne voit pas en priorité `Jouer en ligne`.
- **Recommandation :**
  - Garder **une seule action principale** par public :
    - `Organiser une soirée` (rose, plein) pour l'hôte ;
    - `Jouer en ligne` en bouton secondaire mieux contrasté (contour blanc).
  - Retirer `Discord` du bloc principal. Il reste dans le pied de page et dans la ligne de liens de la section « T'as un code ? ».
  - Dans la carte Mode salon, passer `Lancer une soirée` en lien texte, ou supprimer le bouton s'il mène au même endroit que `Organiser une soirée`.

### 2. Libellés incohérents pour une même fonction

- **Problème constaté :**
  - Le Mode salon apparaît sous **5 noms** : `Mode salon`, `ZIK Salon`, `Organiser une soirée`, `Lancer une soirée`, `Lancer une session`.
  - L'accès par code apparaît sous **3 formes** :
    - `J'ai un code` dans le bloc du haut, qui renvoie à un code salon (exemple `7F3K2Q`) ;
    - `T'as un code ? Entre-le.` ;
    - `Code de la room` (exemple `ABC123`) dans un « billet d'entrée » intitulé « Multijoueur en ligne ».
  - Même chose pour room / partie / session, qui désignent des notions proches.
- **Critère impacté :** Homogénéité/Cohérence ; Signification des codes et dénominations → Adéquation libellé/référent.
- **Gravité :** Élevé. Un invité de soirée qui a reçu un code salon peut le saisir dans le champ « Code de la room ».
- **Risque utilisateur :** erreur de saisie, frustration, incompréhension de la différence entre salon et room.
- **Recommandation :**
  - Fixer un vocabulaire unique :
    - « Soirée » (Mode salon) = `Organiser une soirée` partout ;
    - « Partie en ligne » = `Jouer en ligne`.
  - Pour le champ de code : soit un **champ unique** qui reconnaît le type de code, soit deux libellés explicites : « Code de soirée (TV) » et « Code de partie en ligne ».
  - Remplacer `J'ai un code` par `Rejoindre une soirée avec un code`.

### 3. Menu principal peu lisible

- **Problème constaté :**
  - `ROOMS · ZIKLE · PLAYLISTS · CLASSEMENTS · DOCS` sont écrits en lettres creuses (contour seul), gris foncé sur fond noir. Ce sont les éléments les moins contrastés de l'en-tête, moins que le logo et que `Mode salon`.
  - En faisant défiler, l'en-tête reste semi-transparent. Les cartes de rooms et le bandeau qui défile passent derrière les libellés du menu et se superposent visuellement à eux.
- **Critère impacté :** Guidage → Lisibilité.
- **Gravité :** Élevé. Le menu sert sur toutes les pages, à chaque visite.
- **Risque utilisateur :** effort de lecture ; le menu est pris pour un élément décoratif ; navigation ignorée.
- **Recommandation :**
  - Écrire les libellés en lettres pleines, blanc à 80-90 % d'opacité, avec un état actif rose.
  - Donner à l'en-tête un fond opaque, ou un fond flouté avec au moins 90 % d'opacité, une fois la page défilée.

### 4. Panneau du défi hebdomadaire qui cache le titre principal

- **Problème constaté :** sur la capture du haut de page, le panneau « Bonnes réponses / 588 / 5 000 / top 3 » est ouvert sous le badge `12 %`. Il recouvre « T'AS » et le début de « L'OREILLE ? ». Le badge `12 %`, isolé, ne dit pas ce qu'il mesure.
- **Critère impacté :** Guidage → Lisibilité ; Signification des codes → `12 %` sans libellé.
- **Gravité :** Moyen.
- **Risque utilisateur :** message d'accroche tronqué ; le pourcentage n'a pas de sens sans contexte.
- **Recommandation :**
  - Libellé explicite sur le badge : `Défi de la semaine · 12 %`.
  - Panneau fermé par défaut, ouvert au clic seulement, et placé sous le badge, aligné à gauche, sans recouvrir le titre. Sinon, l'afficher en encart à droite.

### 5. Petits textes à faible contraste

- **Problème constaté :** plusieurs informations utiles sont en très petites majuscules condensées, gris sur noir :
  - le sous-titre « Blind test en soirée sur la TV ou en ligne… » ;
  - « 751 joueurs inscrits · 287 parties ce mois » ;
  - « Disponible » sur les cartes ;
  - « Pts ELO », « 51 parties » ;
  - « Voir les nouveautés → » ;
  - le bouton `En savoir plus` ;
  - les liens du pied de page.
- **Critère impacté :** Guidage → Lisibilité.
- **Gravité :** Moyen.
- **Risque utilisateur :** informations de réassurance non lues (gratuité, communauté active) ; effort visuel, surtout sur TV ou mobile.
- **Recommandation :**
  - Taille minimale de 12-13 px.
  - Contraste d'au moins 4,5:1 (norme d'accessibilité WCAG AA).
  - Écrire en casse normale les textes de plus de 3 mots, comme le sous-titre du haut.
  - Remonter `En savoir plus` au niveau de contraste du bouton `Jouer en ligne`.

### 6. Jargon non expliqué

- **Problème constaté :** `Rooms`, `ELO`, `streaks`, `QCM` et l'interrupteur `Classique / QCM` sont utilisés sans explication à l'endroit où ils apparaissent. Seuls la FAQ, en bas de page, et la grille de fonctionnalités en parlent.
- **Critère impacté :** Signification des codes et dénominations ; Compatibilité, car le public visé (soirées, bars, campings) n'est pas forcément un public de joueurs.
- **Gravité :** Moyen.
- **Risque utilisateur :** incompréhension de l'interrupteur Classique / QCM ; le classement ELO n'a pas de sens pour un néophyte.
- **Recommandation :**
  - Sous l'interrupteur, ajouter une ligne d'aide qui change selon le choix :
    - « Classique : tape le titre ou l'artiste » ;
    - « QCM : choisis parmi 4 réponses ».
  - Remplacer `streaks` par « séries ».
  - Ajouter une infobulle « ? » à côté de « Pts ELO ».

### 7. Saisie du code : bouton peu explicite, champ placé loin

- **Problème constaté :** le bouton de validation est une simple flèche `→`, sans texte. Le champ arrive après le classement, environ 5 écrans plus bas, alors que `J'ai un code` est déjà proposé en haut de page.
- **Critère impacté :** Contrôle explicite → Actions explicites ; Guidage → Incitation.
- **Gravité :** Moyen. Un invité qui arrive avec un code doit le saisir vite.
- **Risque utilisateur :** doute sur l'action déclenchée ; long défilement.
- **Recommandation :**
  - Bouton libellé `Rejoindre`.
  - Rendre le champ de code accessible dès le haut de page, soit dans un champ intégré, soit avec `J'ai un code` qui fait défiler jusqu'au champ et y place le curseur.

### 8. Top joueurs : colonne sans légende, rangs peu visibles

- **Problème constaté :**
  - Une colonne affiche « — » sur les 8 lignes, sans en-tête.
  - Les rangs 4 à 8 sont en gris très foncé, presque invisibles.
  - Le classement des points (1 180, 1 154…) est lisible, mais rien n'indique la période couverte.
- **Critère impacté :** Signification des codes ; Guidage → Lisibilité.
- **Gravité :** Moyen.
- **Risque utilisateur :** on se demande ce que signifie « — » (évolution ? égalité ?) ; lecture du classement plus difficile.
- **Recommandation :**
  - Si la colonne indique une évolution, afficher ▲ / ▼ / = avec une légende. Sinon, la retirer.
  - Rangs 4 à 8 en blanc à 50 % d'opacité minimum.
  - Préciser « depuis toujours » ou « ce mois-ci ».

### 9. Cartes des rooms : informations qui n'aident pas à choisir

- **Problème constaté :**
  - « Classique » est répété sur chaque carte alors que l'interrupteur l'indique déjà.
  - « Disponible » est identique partout.
  - Aucun nombre de joueurs connectés n'est affiché.
- **Critère impacté :** Charge de travail → Densité informationnelle / Brièveté.
- **Gravité :** Faible.
- **Risque utilisateur :** choix de room « à l'aveugle » ; on lit des informations qui ne servent à rien.
- **Recommandation :**
  - Remplacer « Classique · Disponible » par une information utile, par exemple « 3 joueurs en partie » ou « Vide — lance la partie ».
  - N'afficher le statut que lorsqu'il diffère, par exemple « Pleine ».

### 10. Grille « Tout ZIK » 01 à 08 : nature ambiguë

- **Problème constaté :** 8 encarts numérotés 01 à 08, sans flèche, sans lien visible et sans état au survol. La numérotation fait penser à des étapes alors qu'il s'agit de fonctionnalités indépendantes.
- **Critère impacté :** Guidage → Incitation ; Signification des codes.
- **Gravité :** Faible.
- **Risque utilisateur :** clics inutiles, ou au contraire des fonctionnalités jamais explorées.
- **Recommandation :**
  - Rendre chaque encart cliquable vers la page concernée, avec un `→` visible en bas de carte.
  - Remplacer les numéros par une icône de fonctionnalité.

---

## Points positifs (à conserver)

- La proposition de valeur du Mode salon est claire : « La TV diffuse. Les téléphones répondent. », complétée par 3 arguments concrets.
- La FAQ en accordéon est bien structurée, avec des questions formulées comme les utilisateurs les posent.
- Le pied de page est organisé par intention (Jouer, Soirée, Thème, Comparer).
- Le chiffre de réassurance (« 751 joueurs inscrits ») est pertinent, mais il faut le rendre lisible (constat 5).

## Priorités

1. **Constats 1, 2 et 3** : clarifier les actions du haut de page et le vocabulaire soirée / room / code, et rendre le menu lisible.
2. **Constats 4 et 7** : badge du défi et saisie du code.
3. Le reste en amélioration continue.
