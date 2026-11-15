---
version: 2.0-brouillon
name: ZIK
description: Le blind test qui fait la soirée. ZIK Soirée (TV, téléphones, régie) et Jouer en ligne, une seule identité noir + magenta.
reference: maquette validée par Théo le 15/11/2026 (zik-soiree.html + bar.html)
colors:
  bg: "#050507" # NOUVEAU (v1 : #080808)
  surface: "#0F0F17" # NOUVEAU (v1 : #14141F)
  surface-alt: "#0A0A0F" # sections calmes : offres, FAQ, final, pied de page
  line: "rgba(255,255,255,.08)"
  line-2: "rgba(255,255,255,.16)"
  text: "#FAFAFA"
  muted: "#A3A6BA" # NOUVEAU, plus clair que #8896AA : lisibilité
  soft-text: "#D6D7E4" # texte secondaire posé sur image ou vidéo
  accent: "#FF00FF"
  accent-soft: "rgba(255,0,255,.14)"
  accent-tint: "#FF9CF7" # texte magenta sur fond accent-soft (étiquette ZIK Pro)
  violet: "#7B5CFF" # NOUVEAU, seulement en départ de dégradé vers accent
  bleu: "#2FB8FF" # NOUVEAU, matériel/régie, info
  ok: "#3DDC84" # bonne réponse, connecté
  warn: "#FFB347" # décroché, réseau perdu
  danger: "#F87171"
  gold: "#F4C542"
  silver: "#B4B4C4"
  bronze: "#C87A40"
  answer-1: "#FF4F9A" # QCM : triangle
  answer-2: "#5BC0EB" # losange
  answer-3: "#F4E04D" # rond
  answer-4: "#3DDC84" # carré
  team-1..8: "#FF4F9A #5BC0EB #F4E04D #3DDC84 #8C7BFF #FF8C42 #2EC4B6 #F2EDE3" # inchangé
typography:
  titre: "Barlow Condensed 800/900, MAJUSCULES, line-height .84 à .95, text-wrap: balance"
  corps: "Barlow 400/500/600, 17px, line-height 1.6, text-wrap: pretty"
  mono: "JetBrains Mono 500/700, labels MAJUSCULES letter-spacing .14em, chiffres tabulaires"
  h1-hero: "clamp(3rem, 14vw, 8.6rem) mobile ; clamp(3rem, 7vw, 7rem) dès 900px ; letter-spacing -.015em"
  h2-section: "clamp(2.5rem, 11vw, 5.4rem), 900"
  h2-epingle: "clamp(2.1rem, 9.4vw, 4.8rem) ; clamp(2.6rem, 3.9vw, 4rem) dès 900px"
  h2-final: "clamp(3rem, 13vw, 7.4rem)"
  h3-carte: "1.35 à 1.7rem, 800"
  lead: "1.08rem (1.2rem dès 900px), couleur muted, max-width 30 à 34em"
  label: "mono 12px, .14em, muted"
  petit: "15px (listes, cartes) ; 13-14px (notes, pied de page) ; jamais moins de 13px hors mockup"
rounded:
  pill: 999px # boutons, nav, segments, chips, étiquettes   CHANGE (v1 : 5px)
  card: 18px # cartes matériel, tablette
  card-lg: 22px # offres, visuels
  panel: 32px # haut d'une section qui monte (40px dès 900px)
  tv: 12px
  icon-box: 12px
spacing:
  gutter: "max(20px, env(safe-area-inset-*))" # 16px dans les sections épinglées
  content-max: 1200px
  section-y: "88px mobile, 130px dès 900px"
  head-gap: "14px ; marge sous l'en-tête 36px puis 56px"
  breakpoint: 900px # CHANGE : un seul seuil mobile → grand écran (v1 : 768/1100)
  tap-min: 44px # 52px pour les boutons principaux
shadow:
  device: "0 40px 90px -30px #000" # TV, téléphone, tablette posés
  panel-up: "0 -40px 80px -20px rgba(0,0,0,.8)"
  cta-hover: "0 10px 40px -8px rgba(255,0,255,.7)" # le seul halo magenta
motion:
  ease-out: "cubic-bezier(.2,.8,.2,1)" # défaut : apparitions, transitions de vue, details
  ease-pop: "cubic-bezier(.3,1.6,.5,1)" # petit rebond : badge « a trouvé »
  ease-podium: "cubic-bezier(.2,1.3,.4,1)"
  gsap-entree: "expo.out, 0.9 à 1.1 s, stagger .07 à .12 s"
  micro: ".12s (appui) ; .25-.35s (état) ; .45-.5s (layout, view transition)"
  scrub: "ScrollTrigger scrub .5, ease none"
---

## Ce qui change par rapport à la v1

| Sujet             | v1                                            | v2                                                                                                                                                                                                            |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambition          | outil de scène plat, sans ombre               | moderne façon Apple + Vercel + Stripe : sobre, très animé, qui **explique**                                                                                                                                   |
| Fond              | `#080808`, clair par défaut côté jeu en ligne | `#050507`, noir partout sur les pages refaites                                                                                                                                                                |
| Boutons           | rectangles 5px                                | pilules 999px, `main` blanc sur noir                                                                                                                                                                          |
| Ombres            | interdites                                    | autorisées pour poser les **objets** (TV, téléphone, tablette)                                                                                                                                                |
| Texte secondaire  | `#8896AA`                                     | `#A3A6BA` (contraste meilleur)                                                                                                                                                                                |
| Points de rupture | 768 / 1100                                    | mobile first 390px, un seuil à 900px, container queries dans les mockups                                                                                                                                      |
| Ton organisateur  | vouvoiement                                   | **mixte** : tu pour les joueurs, l'accueil, la création et la régie ; vous sur /pro et /soiree (organisateurs qui découvrent) ; vous pluriel sur la TV (« Sortez vos téléphones »), décision de Théo du 15/11 |
| Badge Pro         | rectangle magenta plein                       | étiquette pilule « ZIK Pro » en `accent-soft`                                                                                                                                                                 |

Ce qui reste vrai : deux univers (Jouer en ligne, ZIK Soirée), les trois écrans TV / régie / téléphone et leurs règles (plus bas), un seul magenta fort par écran, couleur jamais seule, pas d'emoji sur la TV, jamais la réponse sur le téléphone, états à prévoir.

Univers ZIK Soirée : toujours sombre (pages, TV, régie, téléphone), décision de Théo du 15/11. Jeu en ligne : thème clair ou sombre au choix, inchangé.

## Principes

1. **Expliquer, pas décorer.** Chaque animation montre un vrai écran de ZIK en train de servir : la TV qui affiche le chrono, le téléphone qui reçoit le QR, la régie qui révèle. Pas de décor abstrait.
2. **Lisibilité avant tout.** Contraste AA minimum, 7:1 sur la TV. Texte posé sur vidéo = voile (`scrim`) dessous. Phrases courtes.
3. **Mobile first 390px.** On écrit la base pour le téléphone ; `@media (min-width: 900px)` ajoute les grilles et les scènes épinglées. Pas de défilement horizontal (`overflow-x: clip` sur les sections larges).
4. **Réalisme.** Des objets vrais : TV 16:9 avec cadre, téléphone 9:19.5 avec encoche, tablette, bar en 3D. Contenu réel du produit dedans (vrais libellés, vrais écrans).
5. **Vrai ou rien.** Aucune fausse affirmation (« Le plus choisi », « 10 000 bars »), aucun chiffre, avis ou logo inventé. Un chiffre affiché est mesuré (ex. « testé à 2 000 joueurs simulés »).
6. **ZIK Pro étiqueté.** Toute fonction payante porte l'étiquette `ZIK Pro` là où elle est montrée (titre, label ou ligne).

## Couleurs, usage

- **Accent `#FF00FF`** : une action ou une info forte à la fois (CTA de la TV ou du téléphone, chrono en alerte, point du label, élément actif). Jamais en texte courant.
- **Dégradé `violet → accent`** (90deg ou 180deg) : uniquement les barres de progression (scroll, chrono, volume, frise). Pas en fond de section.
- **Texte titre en dégradé** `.grad` (blanc 40 % → `#A8AAC0`, 180deg) : titres de section. `.mag` (magenta animé) : un seul mot par page, dans le h1.
- `ok`, `warn`, `danger` : états seulement, toujours avec un mot. `gold/silver/bronze` : podium seulement.
- Couleurs de réponse QCM : toujours avec leur forme (triangle, losange, rond, carré) et le texte.
- Surfaces translucides `rgba(255,255,255,.035 à .09)` sur `bg` pour les sous-zones.

Dans le code : les jetons vivent dans `static/css/theme.css`. À la refonte, renommer vers ces valeurs sans dupliquer (`--mid` devient la valeur de `muted`, `--border` celle de `line`…). Pas de valeur en dur dans les composants.

## Typographie

- Polices self-hostées (`static/css/fonts.css`), jamais Google Fonts en prod. Graisses utiles : Barlow Condensed 600-900, Barlow 400-600, JetBrains Mono 500/700.
- Titres en majuscules, `line-height` serré (.84 hero, .92 sections). Libellés majuscules : 3 mots au plus.
- Scores, chronos, codes de salon, prix au détail : mono ou `font-variant-numeric: tabular-nums`. Un chiffre ne saute pas.
- Interdits : serif, italique décoratif, « kicker » générique au-dessus de chaque titre (le label à point sert de repère, pas de slogan).

## Composants récurrents

**Nav pilule** (vitrines) : fixe, `top: calc(10px + env(safe-area-inset-top))`, hauteur 54px, `max-width: 1160px`, rayon pill, fond `rgba(15,15,23,.6)` + `backdrop-filter: blur(16px) saturate(1.6)`, bordure `line-2`. Logo « ZIK » 900 + suffixe magenta (`SOIRÉE`, 15px, .1em). Liens visibles dès 900px, lien actif = `text`, autres = `muted`. Un seul bouton `main` à droite (42px). Barre de progression de lecture de 2px au-dessus (`animation-timeline: scroll(root)`). Sur les écrans de jeu, la nav du site reste celle de l'univers (barre basse sur téléphone).

**Label à point** : `mono 12px .14em muted` + pastille 8px `accent` (`box-shadow: 0 0 10px accent`, le seul glow toléré hors CTA). Au-dessus d'un titre de section, une fois par section.

**Boutons** : `inline-flex`, hauteur 52px, padding 0 26px, pill, Barlow Condensed 800 18px majuscules .05em.

- `btn-main` : fond `text`, texte noir ; hover `translateY(-2px)` + `cta-hover`. Un seul par écran visible.
- `btn-line` (ghost) : bordure `line-2`, fond `rgba(255,255,255,.05)`, blur 10px.
- Dans un écran du produit (téléphone, régie), l'action principale est **magenta** (`pbtn`, `rb.m`) : c'est l'action de jeu, pas le CTA de vitrine.
- Libellé = verbe court (« Créer une soirée », « Révéler », « Manche suivante »).

**Segment** (filtre) : pilule `surface` + bordure, boutons 40px, actif = fond `text` texte noir, `aria-pressed`. Changement animé par `document.startViewTransition` (`view-transition-name` par carte).

**Carte** : rayon 18-22px, padding 18-24px, fond `surface` (ou `rgba(15,15,23,.6)`), bordure 1px `line` ou bordure dégradée (`padding-box` / `border-box`, 170deg blanc .16 → .03). Titre h3, une phrase `muted`, une action. Icône au trait 1.6px dans une boîte 44px rayon 12px. Variante `key` (info essentielle) : bordure et teinte `bleu`.

**Carte d'offre mise en avant** : une seule par page, bordure `conic-gradient` animée par `@property --ang` (6s linéaire) + ombre magenta. Son badge dit un fait (« Pour les bars »), jamais un classement inventé.

**Étiquette ZIK Pro** (`.pro`) : mono 700 10.5px .06em majuscules, padding 4px 8px, pill, fond `accent-soft`, bordure `rgba(255,0,255,.45)`, texte `accent-tint`. Collée au titre ou au label (`margin-left: 6px`). Une fonction Pro verrouillée reste visible avec l'étiquette et une phrase qui dit ce qu'elle apporte.

**FAQ** : `<details>/<summary>` natifs, ligne de séparation `line`, summary 64px min, Barlow Condensed 700 21px majuscules, bouton « + » rond 34px qui tourne de 45deg et passe en blanc à l'ouverture. Ouverture animée sans JS : `interpolate-size: allow-keywords` sur `:root` + `::details-content { block-size: 0 → auto; transition .45s ease-out, content-visibility allow-discrete }`.

**Section qui monte** (offres) : rayon `panel` en haut, fond `surface-alt`, bordure haute `line-2`, ombre `panel-up`. Sert à marquer le passage « on raconte » → « on lit les prix ».

**Titre final** `.fill` : texte qui se remplit de blanc au scroll (`@property --g` + `animation-timeline: view()`).

### Mockups des vrais écrans

Tous en `container-type: inline-size`, tailles internes en `cqw` / `em` : le mockup garde ses proportions à toutes les largeurs.

- **TV** `.tv2` : 16:9 (4:3 en solo mobile), rayon 12px, cadre `box-shadow: 0 0 0 5px #121219, 0 0 0 6px rgba(255,255,255,.13)` + `device`. Écran `.scr` : fond `radial-gradient(90% 80% at 30% 0%, #1B0A20, #060608 70%)`, scène à gauche + classement à droite (36 %, 30 % dès 900px).
- **Téléphone** `.ph` : 9:19.5, rayon `15% / 7%`, coque métal en `linear-gradient(145deg …)`, écran `.phs` avec encoche, police 7-8cqw. États superposés en `grid-area: 1/1` (`.lay` / `.lay.on`).
- **Tablette (régie)** `.tab` : rayon 18px, padding 9px, fond `#17171F`, deux colonnes via `@container (min-width: 520px)`.
- Contenu : vrais libellés de ZIK, faux pseudos neutres, jamais de vraie réponse sur le téléphone avant la TV (même dans une démo).

## Mouvement

**Ordre de choix des technos** (natif d'abord, ça vieillit bien) :

1. CSS scroll-driven (`animation-timeline: view()` / `scroll()`) pour apparitions, rideaux de titres (`mask-image` + `@property --m`), barres de progression. Toujours dans `@supports (animation-timeline: view())`, avec repli lisible.
2. `@property` pour animer angles, pourcentages de dégradé.
3. View Transitions pour les changements d'état d'une page (filtre, onglet).
4. `interpolate-size` / `::details-content` pour les hauteurs auto.
5. Container queries pour les mockups.
6. **GSAP + ScrollTrigger** seulement pour les sections épinglées et les entrées du hero (licence GSAP libre depuis 2024, vérifier à l'ajout).

**Section épinglée** (`.pin`) : hauteur `100svh`, grille titre + objet (`4fr / 7fr` dès 900px), longueur de scroll `data-len` × hauteur d'écran (1.1 à 1.7). Chaque section expose `render(p)` qui dessine un état pour une progression 0 → 1, branché par `gsap.to(o, { p: 1, ease: 'none', scrollTrigger: { pin: true, scrub: .5, anticipatePin: 1, invalidateOnRefresh: true } })`. Les phrases (`.beat`) se remplacent sur place. `ScrollTrigger.config({ ignoreMobileResize: true })`. Mobile : épinglage gardé si l'objet tient dans `100svh - 300px`, sinon déroulé simple.

**Apparition standard** `.rv` : `opacity 0 → 1`, `translateY(32px) → 0`, `animation-range: entry 0% entry 45%`.

**Entrée du hero** : lignes du h1 en `yPercent: 110 → 0` (masquées par `overflow: hidden`), `expo.out` 1.1s, stagger .12s ; puis lead, CTA, faits, 0.9s, stagger .07s.

**Boucles dans les mockups** (frappe d'un pseudo, appui du doigt, chips qui se remplissent) : démarrent quand l'objet est visible (`IntersectionObserver`, seuil .35), s'arrêtent hors écran et quand l'onglet est caché.

**Vidéo scrubbée** : H.264 MP4 (WebM VP9 en plus si dispo), GOP court (une image clé toutes les 5-10 images) sinon le seek saccade ; 16:9 et 9:16 selon l'orientation ; poster ; `muted playsinline` ; lissage `1 - exp(-dt*8)` et pas de nouveau seek tant que `seeked` n'est pas reçu ; si les métadonnées ne viennent pas en 4s, lecture en boucle. Composant `ui/ScrubVideo.svelte` (logique dans `ui/scrub.js`).

Fichiers dans le dépôt sous `static/media/<page>/`, version dans le nom (`porte-portrait-v1.mp4`) : `server.js` les sert en cache immuable, un changement = un nouveau nom. Viser 3 Mo au plus en portrait mobile. Encodage (ffmpeg du PC : `ZIK-memes/promo/montage/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe`) :

```sh
# vidéo : H.264, image clé toutes les 6 images, sans B-frames, sans son, faststart
ffmpeg -i source.mov -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
  -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -vf "scale=720:-2" -movflags +faststart porte-portrait-v1.mp4
# poster : première image en WebP
ffmpeg -i porte-portrait-v1.mp4 -frames:v 1 -c:v libwebp -quality 80 porte-portrait-v1.webp
```

Monter `-crf` (28, 30) si le fichier dépasse 3 Mo ; paysage en `scale=1280:-2`.

**3D** : réservée aux pages vitrine (visite du bar). Vrai site : Threlte (Svelte) + modèles glTF compressés (Draco ou Meshopt, textures KTX2), chargés à la demande, jamais sur TV/régie/téléphone. Une image fixe remplace la 3D si WebGL manque.

**Fond d'ambiance WebGL** (maquette) : un seul canvas fixe, couleurs qui suivent la section, 30 images/s max, coupé hors onglet et pendant la vidéo, bouton « Mettre le fond en pause », repli en dégradé CSS. Vitrine seulement ; à valider en perf avant de le garder.

**Réduction des mouvements** : `prefers-reduced-motion: reduce` = **état final lisible**, pas un écran vide. Classe `.rm` sur `<html>` : sections épinglées dépliées (`height: auto`), toutes les phrases visibles, frises remplies, vidéo remplacée par son poster dans le flux, boucles arrêtées, view transitions coupées.

**Budget perf** :

- Pendant le scroll, on n'anime que `transform` et `opacity` (et des `@property` peints). Jamais `top/height/width/margin`. Les classements de la TV bougent en `translateY(calc(var(--y) * 117%))`.
- Mesures (`getBoundingClientRect`) une fois par image, dans le rAF, pas dans un listener de scroll.
- `will-change` seulement sur les cartes animées en cours.
- `backdrop-filter` fixe toléré sur la nav et les boutons ghost ; jamais animé.
- LCP : le h1 est du texte, pas une image ; vidéo et 3D en `preload` différé après le premier rendu.

## À bannir

- Look « IA générique » : grilles bento, glow partout, meteors, aurora, particules, étoiles, serif italique, kicker générique, emoji décoratif.
- Lenis et `scroll-behavior: smooth` (lag, combat le scroll natif). Ancres : `scroll-margin-top: 84px`.
- Filtres `blur()` animés (pertes d'images sur mobile).
- Gadgets qui n'expliquent rien (buzzer cliquable pour le plaisir, curseur custom, son au survol).
- Fausses affirmations, faux avis, faux logos clients.
- Dépendances AGPL (ou licence inconnue). Licence vérifiée avant tout ajout.

## Les trois écrans de ZIK Soirée (inchangé sur le fond)

- **Aucune navigation du site** sur TV, régie, téléphone : plein écran, seulement ce qui sert.
- **TV** : 1920×1080 vu à 5 m, rien d'utile sous 28px, marge de sécurité 64px, une info forte à la fois (chrono, révélation, classement). Pochette + artiste + titre à la révélation. Chrono en Barlow Condensed 900 tabulaire, magenta en fin de manche (classe `warn`). Classement en lignes : rang mono, nom, bande de couleur d'équipe à gauche, score mono, « +N » qui apparaît en vert. Pas de mention technique.
- **Régie** : actions de la manche (Révéler, Pause, Manche suivante, Terminer) visibles sans défilement, même en 1024px, utilisable d'une main. Une seule action magenta. Action destructive = confirmation. Statut des joueurs en mots (« connecté », « a décroché »).
- **Téléphone** : 390px, une colonne, actions dans la moitié basse, zones 44px min, aucun défilement pendant une manche. Retour immédiat (vibration + couleur). Jamais la réponse ni le média avant la révélation. Reconnexion toujours dite.
- **Messages système** : bandeau calme en haut, ton rassurant, jamais d'erreur brute devant la salle.

## Jouer en ligne

Mêmes jetons, mêmes composants. Navigation : barre en haut sur ordinateur, barre d'onglets en bas sur téléphone, distincte de celle de ZIK Soirée. Pas de nouveau chantier visuel avant mai 2027 hors refonte progressive décidée par Théo (vision.md).

## Textes

- Français, phrases courtes, ton **mixte** : tu pour les joueurs, l'accueil, la création et la régie ; vous sur /pro et /soiree (organisateurs qui découvrent) ; vous pluriel sur la TV (« Sortez vos téléphones »), décision de Théo du 15/11.
- Deux voix : festive et taquine sur TV et téléphones ; sobre et rassurante sur création, régie, offres, aide.
- Neutre en genre : « à la 1re place », jamais « premier/première ».
- Aucun mot technique côté joueur (« socket », « token », « salon »).

## Accessibilité

- `:focus-visible` : contour 2px `accent`, décalage 2px, jamais supprimé.
- Mockups décoratifs du point de vue lecteur d'écran : `aria-hidden` sur l'objet, le sens est porté par le titre et les phrases à côté. Sections avec `aria-labelledby`.
- Toute info portée par la couleur a un mot ou une forme.
- Contraste vérifié sur le fond réel (vidéo comprise, avec son voile).

## Vérifier avant de livrer

- 390px et 1440px (TV 1920×1080, régie 1024px) ; aucun défilement horizontal.
- Avec `prefers-reduced-motion` : tout le contenu se lit.
- Performance : profil de scroll sans « Layout » rouge, 60 images/s sur un téléphone moyen.
- Compter les magentas forts à l'écran : un seul.
- Relire chaque texte : français, ton (tu ou vous selon l'écran), vrai, sans jargon.
