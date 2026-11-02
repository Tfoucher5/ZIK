---
version: alpha
name: ZIK
description: Blind test musical multijoueur. Site de jeu en ligne et ZIK Soirée, l'outil des organisateurs de soirées (écran TV, régie, téléphones des joueurs).
colors:
  primary: "#C026D3"
  primary-strong: "#A21CAF"
  primary-soft: "#D946EF"
  on-primary: "#FFFFFF"
  background: "#F7F5FA"
  background-alt: "#ECE8F2"
  surface: "#FFFFFF"
  text: "#0F172A"
  text-muted: "#475569"
  text-faint: "#64748B"
  border: "rgba(0, 0, 0, 0.12)"
  border-strong: "rgba(0, 0, 0, 0.2)"
  focus: "#C026D3"
  success: "#16A34A"
  warning: "#D97706"
  danger: "#DC2626"
  info: "#2563EB"
  night-primary: "#FF00FF"
  night-primary-strong: "#CC00CC"
  night-on-primary: "#000000"
  night-background: "#080808"
  night-background-alt: "#0F0F0F"
  night-surface: "#14141F"
  night-text: "#FAFAFA"
  night-text-muted: "#8896AA"
  night-text-faint: "#6B7686"
  night-border: "rgba(255, 255, 255, 0.1)"
  night-border-strong: "rgba(255, 255, 255, 0.18)"
  night-focus: "#FF33FF"
  overlay: "rgba(15, 23, 42, 0.45)"
  night-overlay: "rgba(0, 0, 0, 0.55)"
  night-success: "#4ADE80"
  night-warning: "#FBBF24"
  night-danger: "#F87171"
  gold: "#FBBF24"
  silver: "#94A3B8"
  bronze: "#D97706"
  team-1: "#FF4F9A"
  team-2: "#5BC0EB"
  team-3: "#F4E04D"
  team-4: "#3DDC84"
  team-5: "#8C7BFF"
  team-6: "#FF8C42"
  team-7: "#2EC4B6"
  team-8: "#F2EDE3"
typography:
  display-tv:
    fontFamily: Barlow Condensed
    fontSize: 96px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: 0.01em
  headline-tv:
    fontFamily: Barlow Condensed
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.05
  label-tv:
    fontFamily: Barlow Condensed
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0.2em
  score-tv:
    fontFamily: JetBrains Mono
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1
  headline-lg:
    fontFamily: Barlow Condensed
    fontSize: 2.5rem
    fontWeight: 800
    lineHeight: 1.05
  headline-md:
    fontFamily: Barlow Condensed
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.15
  title-sm:
    fontFamily: Barlow Condensed
    fontSize: 1.05rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.04em
  body-md:
    fontFamily: Barlow
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Barlow
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45
  label-sm:
    fontFamily: Barlow Condensed
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.12em
  mono-md:
    fontFamily: JetBrains Mono
    fontSize: 0.9rem
    fontWeight: 600
    lineHeight: 1.3
    fontFeature: '"tnum"'
rounded:
  xs: 2px
  sm: 3px
  md: 5px
  lg: 10px
  xl: 14px
  full: 999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  tv-safe: 64px
  content-max: 1200px
  phone-max: 480px
  breakpoint-tablet: 768px
  breakpoint-desktop: 1100px
  tap-min: 44px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 44px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 44px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 12px
    height: 44px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  badge-pro:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 2px 8px
  status-ok:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  status-degraded:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  status-down:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  tv-stage:
    backgroundColor: "{colors.night-background}"
    textColor: "{colors.night-text}"
    padding: "{spacing.tv-safe}"
  tv-scoreboard-row:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-text}"
    typography: "{typography.label-tv}"
    rounded: "{rounded.md}"
    padding: 12px 24px
    height: 72px
  tv-timer:
    textColor: "{colors.night-primary}"
    typography: "{typography.score-tv}"
  regie-panel:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  regie-button:
    backgroundColor: "{colors.night-primary}"
    textColor: "{colors.night-on-primary}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 48px
  phone-answer-option:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-text}"
    typography: "{typography.headline-md}"
    rounded: "{rounded.lg}"
    padding: 16px
    height: 72px
  phone-buzzer:
    backgroundColor: "{colors.night-primary}"
    textColor: "{colors.night-on-primary}"
    typography: "{typography.headline-lg}"
    rounded: "{rounded.full}"
    size: 220px
  team-chip:
    backgroundColor: "{colors.team-1}"
    textColor: "{colors.night-on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 4px 10px
---

## Overview

ZIK a deux faces qui partagent une seule identité :

- **Jouer en ligne** : le site grand public (rooms, Zikle, défis, cartes, profils). Thème clair par défaut, thème sombre au choix.
- **ZIK Soirée** : l'outil des organisateurs de soirées (bars, campings, entreprises, associations), vendu dans l'offre ZIK Pro. Toujours en sombre. Trois écrans : la **TV** (projetée devant la salle), la **régie** (l'ordinateur ou la tablette de l'animateur), le **téléphone** de chaque joueur (buzzer et réponses, sans inscription, rejoint par QR code).

L'identité : noir profond, un seul accent magenta, titres en Barlow Condensed majuscules, chiffres en JetBrains Mono. L'impression recherchée côté ZIK Soirée est celle d'un **outil professionnel de scène** : sobre, très lisible, sûr de lui, jamais « gadget ». Un client Pro l'utilise devant son public ; l'interface doit lui inspirer confiance et ne jamais le mettre en difficulté.

Principe directeur de la TV : **une seule information forte à l'écran à la fois**, lisible depuis le fond de la salle, aucun décor qui ne sert à rien.

## Colors

- **Primary (#C026D3)** sur le site clair, **Night primary (#FF00FF)** sur fond noir : la seule couleur d'action et d'emphase. Boutons principaux, chrono, élément en cours. Jamais pour du texte courant.
- **Background (#F7F5FA) / Surface (#FFFFFF)** pour le site clair ; **Night background (#080808) / Night surface (#14141F)** pour ZIK Soirée et le thème sombre.
- **Text, Text muted, Text faint** : trois niveaux de texte, pas davantage.
- **Border / Border strong** : bordures translucides de 1px (noir à 12 % et 20 % en clair, blanc à 10 % et 18 % en sombre). Les surfaces sombres secondaires sont du blanc à 4, 7 et 11 % d'opacité posé sur le fond.
- **Focus / Night focus** : anneau de focus de 2px, décalé de 2px, sur tout élément interactif au clavier. Jamais supprimé.
- **Success, Warning, Danger** : états uniquement (bonne réponse, attention, erreur, statut d'un service). Sur la page de statut : vert = opérationnel, orange = dégradé, rouge = panne.
- **Gold, Silver, Bronze** : podium uniquement.
- **Team 1 à 8** (et jusqu'à 16 dans le code) : couleurs d'équipes, toujours accompagnées du nom de l'équipe. Une équipe n'est jamais identifiée par sa couleur seule.
- Contraste : texte AA minimum (4,5:1) partout ; sur la TV, viser 7:1 car l'image projetée perd du contraste.

## Typography

- **Barlow Condensed** : titres, libellés, boutons, noms d'équipes et de joueurs. Souvent en majuscules avec un espacement large pour les libellés (`label-sm`, `label-tv`).
- **Barlow** : texte courant, descriptions, aide.
- **JetBrains Mono** avec chiffres tabulaires : scores, chrono, codes de salon, numéros de manche. Les chiffres ne doivent jamais « sauter » quand ils changent.
- Les tailles `-tv` sont des cibles pour un écran 1920×1080 vu à 5 mètres : rien d'utile sous 28px sur la TV. Sur téléphone, rien d'interactif sous 16px.
- Langue : français. Les libellés en majuscules restent courts (trois mots au plus).

## Layout

- Grille de 4px, espacements de la liste `spacing`.
- Points de rupture : téléphone jusqu'à 767px, tablette de 768 à 1099px, ordinateur à partir de 1100px. Toute zone tactile fait au moins 44×44px.
- **Site** : contenu centré, 1200px maximum, marges de 16px sur mobile.
- **TV** : plein écran 16:9, marge de sécurité de 64px sur les bords (les projecteurs rognent), contenu centré, une zone principale et au plus une zone secondaire (classement ou équipe).
- **Régie** : tableau de bord en colonnes sur ordinateur et tablette ; les actions de la manche en cours (révéler, valider un buzz, suivant, pause) toujours visibles sans défilement.
- **Téléphone** : une colonne de 480px maximum, actions dans la moitié basse de l'écran (utilisable au pouce), aucun défilement pendant une manche.

## Elevation & Depth

- Interface plate : profondeur par la couleur des surfaces et des bordures fines, pas par les ombres.
- Seules exceptions : les modales (voile sombre derrière) et le halo de la couleur primaire sur l'élément actif (chrono, buzz gagnant), utilisé avec parcimonie.
- Pas de dégradés décoratifs, pas de verre dépoli sur la TV.

## Shapes

- Angles discrets : 3 à 5px pour les boutons, champs et badges ; 10 à 14px pour les cartes et les grandes zones tactiles du téléphone.
- Formes pleinement arrondies réservées au buzzer, aux pastilles de statut et aux avatars.

## Components

- **Boutons** : un seul bouton primaire par écran. Hauteur minimale 44px (48px en régie). Libellé en verbe d'action court (« Lancer », « Révéler », « Manche suivante »).
- **Cartes** : regroupent une playlist, une offre, un lieu ou une soirée passée. Titre, une ligne d'information, une action.
- **Badge Pro** : signale une fonction ZIK Pro. Une fonction Pro verrouillée reste visible, avec le badge et une phrase qui dit ce qu'elle apporte.
- **Pastilles de statut** : page publique `/statut` et admin. Toujours avec un mot (« Opérationnel », « Dégradé », « Panne »), jamais la couleur seule.
- **TV** : scène (`tv-stage`), chrono, réponse révélée avec pochette, classement par lignes (`tv-scoreboard-row`) avec rang, nom, équipe et score, podium final.
- **Régie** : panneaux (`regie-panel`) pour la manche en cours, les joueurs, les équipes, les réglages. Chaque action dangereuse (terminer la partie, retirer un joueur) demande une confirmation.
- **Téléphone** : choix de réponse en gros blocs (`phone-answer-option`), buzzer rond plein écran (`phone-buzzer`), retour immédiat (vibration et couleur) après chaque action, état « reconnexion en cours » toujours explicite.
- **Messages système** (reconnexion, maintenance annoncée, musique indisponible) : bandeau calme en haut de l'écran, ton rassurant, jamais d'erreur technique brute devant la salle.

- **Icônes** : une seule famille, au trait (1,5 à 2px), coins arrondis, 20 ou 24px, couleur du texte voisin. Toujours accompagnées d'un libellé dans la navigation et dans la régie ; seules les actions universelles (fermer, menu, volume, plein écran) peuvent être une icône seule, avec un libellé accessible.
- **Navigation du site** : barre supérieure sur ordinateur, barre d'onglets en bas sur téléphone. L'univers ZIK Soirée a sa propre navigation, distincte de celle du jeu en ligne.

## Do's and Don'ts

- Do : écrire tous les textes en français, en phrases courtes, au tutoiement côté joueurs et au vouvoiement côté clients Pro et pages d'offres.
- Do : prévoir pour chaque écran les états vide, chargement, reconnexion, erreur et maintenance.
- Do : tester chaque écran TV en 1920×1080 et chaque écran téléphone en 390px de large.
- Do : garder le magenta pour une seule chose à la fois par écran.
- Don't : afficher sur le téléphone d'un joueur la réponse, le titre ou l'artiste avant la révélation.
- Don't : utiliser d'emoji dans l'interface de ZIK Soirée, ni d'illustrations décoratives sur la TV.
- Don't : identifier une équipe, un statut ou une bonne réponse par la couleur seule.
- Don't : utiliser de logos ou de visuels de marques tierces (artistes, labels, plateformes) en dehors des pochettes fournies par le catalogue.
