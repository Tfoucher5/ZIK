# Séparer Jouer en ligne et ZIK Soirée

Fiche de cadrage du 14/11 (agents `ux`, `ui`, `redaction`). Plan : phase 5, « Séparer Jouer en ligne et ZIK Soirée ». Feu vert de Théo le 14/11, avec une exigence : un design propre, pro, original, qui ne fait pas « IA ».

## Objectif

- **`/` devient un aiguillage** : deux portes et un champ « J'ai un code ».
- **Le jeu en ligne déménage sur `/jouer`.**
- **La vitrine organisateurs est `/soiree`.**
- **Chaque univers a sa navigation.**

On garde la DA (DESIGN.md), on change la structure.

## Direction visuelle : l'objet de scène, pas l'illustration

On met en scène les signatures que ZIK a déjà, on n'en invente pas :

- **Ombre pleine décalée** : `8px 8px 0 var(--accent)` avec une bordure 2px `var(--text)`, comme `.hero-salon` et `.sh-qr`.
- **Code en cases mono** : `.sh-code b`, `static/css/salon/tv-stage.css`.
- **Billet à talon** : `TicketSection`.
- **Mur de pochettes** : `HERO_COVERS`.
- **Mini-TV de `HeroSalon`** et nom du gagnant en couleur d'équipe.

Règles :

- **Titres** : Barlow Condensed 900, en capitales, en drapeau à gauche, jamais centrés.
- **Chiffres et codes** : JetBrains Mono.
- **Pas d'effets décoratifs** : ni dégradé, ni flou, ni emoji, ni grille de cartes icône + titre + texte.
- **Magenta** : un seul usage par écran.

Réutiliser :

- `.btn-accent` et `.btn-ghost` ;
- les variables de `theme.css` ;
- l'action `reveal`.

Animations sobres, jouées une seule fois, coupées par `prefers-reduced-motion` et `.no-animations`.

**Piège** : ne pas charger `static/css/salon/shared.css` hors du salon (reset global). Pour les couleurs d'équipe, mettre les 4 valeurs en dur en scoped, comme `HeroSalon`.

## `/` : aiguillage

**Desktop** : l'écran est coupé en deux à parts égales, avec une couture verticale de 2px.

- **Porte « Jouer en ligne »**
  - Suit le thème.
  - Une bande de pochettes recouverte d'un aplat opaque.
  - Le mot **JOUER** à environ 11vw, coupé au bord.
  - Une ligne mono vivante : nombre de joueurs en ligne.
- **Porte « Animer une soirée »**
  - Toujours de nuit.
  - Le mot **ANIMER**.
  - La mini-TV dans un cadre à ombre magenta.
  - La ligne « Bar, camping, entreprise, association ».
  - Un lien secondaire « Déjà organisateur ? Créer une soirée » vers `/salon`.
- **Bande « J'ai un code »**
  - En forme de talon de billet, posée en bas, à cheval sur la couture.
  - Une seule `<input>`, cases dessinées en CSS, majuscules, `maxlength=6`, `<label>` visible.
  - Le bouton « Rejoindre » est le seul magenta de la page.

**Mobile 390** : la bande du code en premier, puis les deux portes empilées. Zones tactiles de 44 px minimum.

**Bandeau** « Reprendre votre soirée XXXXXX » (`ResumeSalon`, `lastSalon()`) quand une soirée a moins de 12 h.

**Code tapé** : on interroge `/api/rooms/custom/{code}`. S'il répond, on va vers la partie en ligne ; sinon vers `/salon/play?code=`, qui affiche déjà l'erreur d'un code inconnu. Un seul champ couvre ainsi les deux codes.

**Choix** : un connecté qui revient voit **toujours l'aiguillage**, sans redirection. Le logo doit rester un moyen de changer d'univers. C'est la recommandation de l'agent ux ; Théo peut la changer.

Pas de `load` serveur, l'onboarding ne démarre pas sur `/` (test d'égalité stricte, pas `startsWith`). Un seul `<h1>`.

### Textes

- **Title** : « ZIK - Blind test en ligne ou en soirée, gratuit et sans appli ».
- **Meta** : « Joue au blind test en ligne contre d'autres joueurs, ou anime une soirée : la TV diffuse la musique, chacun répond sur son téléphone. Gratuit, sans appli. »
- **h1** : « Le blind test, en ligne ou en soirée ».
- **Porte jeu** : « Affronte d'autres joueurs dans les rooms ou avec tes playlists Deezer. Le Zikle du jour, les classements et tes succès t'attendent. »
- **Porte soirée** : « La TV diffuse la musique, chaque téléphone sert de manette. Pour un bar, un camping, une entreprise, une asso ou une soirée chez soi. »
- **Code**
  - Libellé : « J'ai un code ».
  - Aide : « Le code de 6 caractères affiché sur la TV de la soirée, ou celui qu'on t'a envoyé pour une partie en ligne. »
  - Erreur : « Le code fait 6 caractères. Recopie-le depuis la TV ou le message reçu. »

Le JSON-LD `WebSite` et `Organization` reste sur `/`.

## `/jouer` : entrée du jeu en ligne

C'est l'accueil actuel déplacé, `+page.server.js` compris.

**On retire** :

- `HeroSalon` et le bouton « Organiser une soirée » ;
- le lien rapide « Mode Salon » de `TicketSection` ;
- la tuile salon de `Features` ;
- les questions soirée de `faq.js`, qui partent sur `/soiree` ;
- les emojis de `TodayStrip`.

**Textes** :

- h1 : « T'as l'oreille ? Prouve-le. »
- Sous-titre : « Rejoins une room, crée la tienne avec tes playlists Deezer, joue au Zikle du jour et grimpe au classement. Gratuit, avec ou sans compte. »
- Bouton principal : « Jouer maintenant », qui fait défiler jusqu'aux rooms.

**SEO** : le JSON-LD `VideoGame` et la FAQ du jeu sont ici, canonique `/jouer`. L'onboarding démarre ici.

## `/soiree` : vitrine organisateurs

En vouvoiement, toujours de nuit. La page se lit comme le déroulé d'une soirée, avec des heures en mono dans la marge.

1. **Hero en drapeau**
   - Titre : « La TV diffuse. Les téléphones répondent. »
   - Texte : « Un écran, du son, et les téléphones que vos invités ont déjà en poche. ZIK s'occupe des extraits, du chrono, des points et du classement. Rien à installer, et aucun compte demandé aux joueurs. »
   - Bouton « Lancer une soirée » vers `/salon`, lien « Voir ZIK Pro ».
   - À droite, une réplique HTML du lobby TV (code en cases, QR qui pointe vers `/soiree`) et un téléphone qui chevauche le coin.
2. **19:45 Ouvrez la soirée sur la TV** : la barre `.sh-top` en réplique.
3. **20:00 Vos invités rejoignent** : le QR et le compteur de joueurs.
4. **20:10 La partie tourne** : le timer et les 4 choix (nom et couleur), la régie et les téléphones. Chacun a son rôle, en texte à côté.
5. **22:30 Le podium** : or, argent, bronze, scores en mono.
6. **Pour qui** : une liste typographique BAR, CAMPING, ENTREPRISE, ASSOCIATION, CHEZ SOI, avec des filets entre les lignes et une phrase chacune. Ce n'est pas des cartes.
7. **ZIK Pro, pour aller plus loin** : gratuit jusqu'à `FREE_MAX_PLAYERS` et `FREE_MAX_TEAMS`, avantages de `PRO_PERKS`, prix lu dans `PLANS`, lien `/pro`.
8. **FAQ** : installation, compte joueur, coupure (10 min, ou 2 h en pause), matériel, prix. On y ajoute le contenu de `SalonSeo`, déplacé depuis `/salon`.
9. **Appel final en forme de billet** : « Votre prochaine soirée, c'est sur la TV. », bouton « Lancer une soirée », et la ligne « Vous êtes invité ? Rejoindre avec un code » vers `/salon/play`.

Aucun chiffre en dur : tout vient des constantes de `src/lib/data/`. Les répliques sont `aria-hidden`, avec leur contenu redit en texte.

**Mobile** :

- la rail horaire passe au-dessus des titres ;
- la TV prend toute la largeur, le téléphone se place dessous ;
- la liste « Pour qui » passe à 2.4rem.

**Composants** : `src/lib/components/soiree/`. La mini-TV est extraite de `HeroSalon` en `MiniTv.svelte`, partagée avec `/`.

## Navigation

L'univers se déduit du chemin :

- `/` exactement : aiguillage ;
- `/soiree*`, `/pro*`, `/vs/*` : soirée ;
- le reste : jeu.

Par univers :

- **Aiguillage** : logo, thème, compte ; ni liens ni barre du bas.
- **Jeu** : liens actuels ; « Mode Salon » devient un lien discret gris « ZIK Soirée ». La barre du bas mène à `/jouer` au centre, sans « Salon ».
- **Soirée** : Découvrir, Tarifs, Aide, « Créer une soirée » en contour, lien discret « Jouer en ligne ». Barre du bas : Découvrir, Tarifs, Créer, Aide.

Le logo mène toujours à `/`. Le pied de page a deux colonnes : « Jouer en ligne » et « ZIK Soirée ».

**Liens à corriger** :

- vers `/rooms` : `GameHeader.svelte:12` et `game/+page.svelte:160` ;
- vers `/jouer` : `PlayerBar.svelte:15` ;
- vers `/soiree` : `VsPage.svelte:106` et `SetupHero` (« ← ZIK ») ;
- à retirer : `pro/+page.svelte:45`.

Les libellés visibles « Mode Salon » deviennent « ZIK Soirée ».

## SEO

**Aucune adresse ne disparaît**, donc pas de redirection.

**Plan du site** :

| Page      | Priorité | Fréquence |
| --------- | -------- | --------- |
| `/soiree` | 1.0      | weekly    |
| `/jouer`  | 0.9      | daily     |
| `/salon`  | 0.8      | inchangée |

`/salon` prend le titre d'outil « Créer une soirée blind test | ZIK ».

**Suivi** : Search Console de `/`, `/jouer` et `/salon` avant la bascule, puis 4 semaines après, noté dans `docs/strategie/etat.md`.

**Risque accepté** : une baisse temporaire sur « blind test en ligne » le temps que Google indexe `/jouer`.

## Découpage en PR

1. **`feature/page-jouer`** : `/jouer`, prop de `HeroSection` pour masquer `HeroSalon`, FAQ jeu séparée, sans emoji. `/` ne bouge pas.
2. **`feature/page-soiree`** : `/soiree`, `MiniTv`, `SalonSeo` déplacé, titre de `/salon`, plan du site.
3. **`feature/accueil-aiguillage`** : nouvel `/`, onboarding, liens, entrée `/nouveautes`.
4. **`feature/nav-univers`** : `Nav.svelte`, barre du bas, pied de page, libellés « ZIK Soirée ».
5. Plus tard : `/pro` réduit aux tarifs.

Les PR 1 et 2 peuvent partir seules. Les PR 3 et 4 partent dans la même release.

## Critères d'acceptation (1440 et 390 px)

1. `/` ne montre que le titre, les deux portes de même taille, le code et le pied de page. Un seul magenta.
2. Code `abc123` puis Entrée :
   - code de room : arrivée dans la partie en ligne ;
   - sinon : `/salon/play?code=ABC123`, code pré-rempli, focus sur le pseudo.
3. Avec moins de 6 caractères, le code ne part pas et un message s'affiche.
4. Soirée de moins de 12 h : le bandeau ouvre la régie.
5. Le logo mène à `/` partout, et le lien de l'autre univers est visible.
6. Une page du jeu n'a aucun lien soirée sauf le lien discret. Une page soirée n'a ni Rooms, ni Zikle, ni Cartes.
7. « Quitter » et « ← Rooms » dans `/game` mènent à `/rooms`.
8. L'onboarding ne s'ouvre pas sur `/`, il s'ouvre sur `/jouer`.
9. Canoniques et titres distincts, un seul JSON-LD FAQ par page, plan du site à jour.
10. À 390 px : pas de défilement horizontal, zones tactiles de 44 px, barre du bas propre à l'univers.

## Erreurs trouvées en route (petites tâches à part)

- `docs/SalonSection.svelte` et `RejoindreSection.svelte` annoncent un « code à 4 chiffres » : c'est 6 caractères.
- `SalonSection` dit encore « Kahoot-like » et « Mode Salon ».
- La meta de `/rooms` annonce « jusqu'à 20 joueurs », même souci que `/vs/blinest`.

## Écarts décidés pendant le code

- **`/soiree` suit le thème** (pas « toujours de nuit ») : la barre du site suit déjà le thème, une page forcée en nuit sous une barre claire faisait deux univers mal recollés. Les répliques d'écrans (TV, manche) restent noires, comme une vraie TV.
- **`/salon` garde son bloc SEO pour l'instant** : la FAQ de `/soiree` est différente (pas de contenu dupliqué) ; le déplacement de `SalonSeo` et le titre d'outil de `/salon` attendent que `/soiree` soit indexée, comme `/pro` réduit aux tarifs.
- **Champ code en haut, à droite du titre** (pas à cheval sur la couture) : visible sans défilement en desktop comme en mobile, et toujours avant les portes.
- **Ombre de la mini-TV neutre** sur `/` : le bouton « Rejoindre » reste le seul magenta.
- **Code tapé** : on interroge `/api/rooms/{code}` (rooms éphémères et enregistrées), pas seulement `/custom`.
- **Comparatifs `/vs/*`** : le bouton final mène à `/soiree`, sauf `/vs/blindtest-io` (jeu en ligne) qui mène à `/jouer`.
