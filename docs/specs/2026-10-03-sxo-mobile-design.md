# Chantier SXO + mobile - v3.13.0

- **Date :** 2026-10-03
- **Branche :** `feat/theme-clair-accueil` - le volet mobile/SXO est ajouté à la même branche
  et à la même PR que la refonte desktop v3.12.0.
- **Périmètre :** 35 pages du groupe `(site)` + CSS global
- **Complète :** `docs/audit-ergonomique-accueil-2026-10-02.md`, qui portait sur `/` en
  desktop et indiquait explicitement « Affichage mobile non testé ».

## Objectif

Le volet desktop de la refonte est livré (v3.12.0). Ce chantier traite le volet mobile,
jamais audité, et les défauts SEO techniques relevés sur l'ensemble des pages.
Un seul lot, une seule PR.

---

## A. Socle mobile et layout

### A1. Clearance de la barre fixe du bas

Constat : à 768px et moins, `.site-footer` a `padding-bottom: 68px` en dur. Il faut
58px (hauteur de barre) + `env(safe-area-inset-bottom)` (~34px sur iPhone à encoche)
soit ~92px. Le bas du pied de page est masqué sur ces appareils. `#bottom-nav` n'a
lui-même aucun `padding-bottom: env(...)` : les icônes touchent le home indicator.

Correctifs dans `static/css/base.css` :

- `#bottom-nav` : `height: calc(58px + env(safe-area-inset-bottom, 0px))` et
  `padding-bottom: env(safe-area-inset-bottom, 0px)`. Les items gardent 58px utiles.
- `.site-footer` dans le `@media (max-width: 768px)` :
  `padding-bottom: calc(58px + env(safe-area-inset-bottom, 0px) + 16px)` en
  remplacement du `68px`. Le pied de page étant toujours le dernier élément du layout,
  cette seule règle suffit à dégager toutes les pages.

### A2. Suppression de la règle de padding incohérente

Constat : `main, .page-content { padding-bottom: calc(58px + env(...)) }` s'**ajoute**
aux 68px du pied de page sur les pages qui ont un `<main>`, et ne s'applique **pas** aux
6 pages qui n'ont ni `<main>` ni `.page-content` : `/`, `/rooms`, `/playlists`,
`/salon`, `/profile`, `/user/[username]` - soit les plus consultées.

Correctif : supprimer la règle. A1 la rend inutile.

Hors périmètre, à noter : `/classements` porte des `padding-bottom` de 150/170/210px en
dur, contournement manuel du même problème. On ne touche pas aux autres pages dans cette
PR ; à reprendre plus tard si besoin.

### A3. Hauteur du bandeau haut en mobile

Constat : `--nav-h: 68px` n'est jamais réduit. 68 en haut + 58 en bas = 126px de chrome,
soit ~19 % d'un écran de 667px. Rejoint le constat 3 de l'audit du 2026-10-02
(« contenu visible derrière l'en-tête »).

Correctif : `@media (max-width: 768px) { :root { --nav-h: 56px } }` dans `base.css`. La
variable est consommée via `calc()` par une vingtaine de pages, la correction se propage
seule.

### A4. Barre du bas à 5 entrées

Constat : 6 entrées forcent les libellés à `0.5rem` sous 420px.

Correctif dans `Nav.svelte` et `base.css` :

- retirer l'entrée **Profil** (l'avatar du bandeau haut y mène déjà ; invité vers Connexion)
- `grid-template-columns: repeat(5, 1fr)`
- supprimer le `@media (max-width: 420px)` qui rabaissait la police, devenu inutile

Entrées finales : Rooms, Playlists, Accueil (bouton central), Zikle, Salon.

### A5. Pages sans aucune media query

`/vs/kahoot`, `/vs/blinest`, `/vs/blindtest-io` (3 pages **indexées**, avec tableau
comparatif en `overflow-x: auto`), `/results/[id]`, `/user/[username]`, `/pro/merci`.

Correctif : ajouter un bloc `@media (max-width: 768px)` à chacune. Pour les tableaux des
pages `/vs/*`, passage en cartes empilées sous 640px plutôt qu'un scroll horizontal, que
Google pénalise en ergonomie mobile.

---

## B. Accès au thème et menu du profil

### B1. Le thème est inatteignable sans compte

Constat : le thème est du `localStorage` pur, aucun compte requis, et `/settings`
fonctionne déjà pour un invité (les sections Visuel et Jeu sont hors du `{#if user}`).
Mais la nav ne lie `/settings` que depuis le menu déroulant du profil, lui-même réservé
aux connectés. Seul accès pour un invité : le pied de page.

Correctifs :

- `src/lib/theme.js` **(nouveau)** - source unique : `THEMES`, `getTheme()`, `setTheme()`.
  Évite de dupliquer la liste des 6 thèmes et la logique `data-theme` + `meta[theme-color]`.
- `src/lib/components/ThemeMenu.svelte` **(nouveau)** - bouton icône dans `.nav-right`,
  avant la cloche, **toujours visible** (invité ou connecté, desktop et mobile). Ouvre un
  popover avec les 6 pastilles, même rendu que `/settings`.
- `src/routes/(site)/settings/+page.svelte` - consomme `theme.js`, supprime ses `THEMES`
  et `setTheme()` locaux.

### B2. Menu du profil rangé, sans doublon

Constat : le menu contient 5 liens `nav-dd-mobile-only` (Rooms, Zikle, Playlists,
Classements, Salon) dont 4 sont déjà dans la barre du bas.

Structure retenue :

- en-tête : avatar, pseudo, ELO
- groupe « MON COMPTE » : Mon profil, Paramètres
- groupe « NAVIGUER », mobile uniquement : Classements, Aide et règles, Soutenir ZIK
- Admin, si `role === 'super_admin'`
- Déconnexion

Seul Classements survit du lot mobile-only ; Aide et Soutenir n'étaient accessibles
nulle part en mobile.

---

## C. SEO technique

| #   | Page / fichier           | Correctif                                                                                                                                                                                                                                                    |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `/zikle`                 | **Aucun `<h1>`** : le premier titre est un `h2` dans `ZikleGame`. Page à priorité 0.9 du sitemap. Ajouter un `h1` visible. `ZikleGame` sert aussi `/zikle/archives/[date]` : le `h1` va dans les pages, pas dans le composant.                               |
| C2  | `/classements`           | Ni `canonical`, ni `robots`, ni OG/Twitter. Page indexée, priorité 0.7. Compléter le `svelte:head`.                                                                                                                                                          |
| C3  | `sitemap.xml/+server.js` | `lastmod` = date du jour pour **toutes** les pages statiques, `/cgu` et `/mentions-legales` comprises. Un `lastmod` qui bouge chaque jour sans changement réel décrédibilise le signal. Passer à une date figée par page. Ajouter `/soutenir`, absent.       |
| C4  | 7 pages                  | Breadcrumbs JSON-LD présents sur 9 pages sur 35. Ajouter sur `/rooms`, `/playlists`, `/classements`, `/blind-test`, `/zikle/archives`, `/nouveautes`, `/soutenir`.                                                                                           |
| C5  | tous les `<title>`       | Cadratins mélangés aux tirets simples selon les pages. Uniformiser en tiret simple.                                                                                                                                                                          |
| C6  | `/results/[id]`          | Aucun titre, de quelque niveau que ce soit. Ajouter un `h1`. En `noindex`, donc pas de perte SEO, mais structure pauvre.                                                                                                                                     |
| C7  | `static/robots.txt`      | `Disallow` **et** `noindex` sur les mêmes URLs (`/game`, `/settings`, `/profile`, `/salon/play`) : le `Disallow` empêche Google de lire le `noindex`, l'URL peut donc apparaître en SERP sans description. Retirer ces `Disallow`, garder `Disallow: /api/`. |

---

## D. Images - CLS et LCP

**Correction par rapport à l'audit initial.** L'audit annonçait « 24 images sans
width/height, risque CLS ». Vérification faite classe par classe, c'est faux :
presque toutes ces images sont dans un conteneur déjà dimensionné par le CSS
(`aspect-ratio: 1`, ou `width`/`height` fixes) avec l'image en `width: 100%;
height: 100%`. Le box est donc réservé avant le chargement et **il n'y a pas de
CLS**. Compter les `<img>` dépourvus d'attribut `width=` n'est pas une mesure du
CLS. Ajouter ces attributs n'aurait fait que dupliquer le CSS sans rien gagner.

Ce qui a réellement été fait : `loading="lazy" decoding="async"` sur les seules
images masquées jusqu'à une interaction, où le gain de bande passante est réel et
le risque nul :

- `NotificationsMenu` (panneau fermé par défaut)
- l'avatar de l'en-tête du menu profil (`Nav.svelte`)
- les 2 aperçus d'import de `TrackSearch`
- l'aperçu d'avatar de `/profile` (modale d'édition)
- l'avatar « ma position » de `/classements`
- l'avatar Discord de `/settings`

**Volontairement laissées en chargement immédiat :** les révélations de pochette
de `/game`, `/salon/host`, `/salon/play`, `/salon/regie` et `ZikleGame`. Elles
deviennent visibles au moment précis où elles sont insérées ; un `loading="lazy"`
y provoquerait un retard d'affichage au pire moment. Ce serait une régression
d'expérience, pas une optimisation.

**Réserve sur le LCP :** il n'y a pas d'`<img>` de hero. `HeroSection.svelte`
affiche son mur de pochettes en `background-image` CSS, qui ne peut porter ni
`loading="eager"` ni `fetchpriority="high"`. Le preload des premières pochettes
n'a pas été fait : les URL sont construites côté client à partir des données de
la page, il n'y a pas d'URL stable à mettre dans un `<link rel="preload">` du
`<head>`. À reprendre si les Core Web Vitals le justifient, une fois qu'on aura
des chiffres Search Console.

## Version et cache

- `package.json` : 3.12.0 vers 3.13.0
- `(site)/+layout.svelte` : libellé `v3.13.0` du pied de page, et `base.css?v=3.13.0`
  (base.css est modifié et le cache est immutable - cf. piège connu)
- **Non touché :** les 11 `og.png?v=3.12.0`, ni `theme.css?v=`, `game.css?v=`,
  `salon.css?v=`. Ces fichiers ne changent pas, bumper leur `?v=` serait du bruit.

## Tests

1. `npx eslint .` puis `npx prettier --end-of-line auto --check .`
   (`npm run lint` échoue toujours en local à cause de autocrlf - piège connu)
2. Vérification visuelle en dev à 375x667, 390x844 (encoche), 768 et 1440, sur
   `/`, `/rooms`, `/playlists`, `/classements`, `/zikle`, `/salon`, `/vs/kahoot`, `/profile`
3. Les 6 thèmes depuis la nav, en invité **et** en connecté
4. `curl localhost:5173/sitemap.xml`, et relevé du `<head>` de chaque page modifiée

## Risques

- **Suppression de `main, .page-content { padding-bottom }`** : `/game` n'a ni pied de
  page ni barre du bas, `/salon/*` passe par un layout reset `@` et ne charge même pas
  `base.css`. Sans objet pour les deux.
- **`--nav-h` à 56px en mobile** : une vingtaine de pages en dépendent via `calc()`.
  Vérifier `scroll-margin-top` et les en-têtes de `/defi` qui utilisent `var(--nav-h)` nu.
- **Deux popovers** (thème et profil) pour un seul `svelte:window onclick` dans
  `Nav.svelte` : s'assurer que l'ouverture de l'un ferme l'autre.

---

## Vérification effectuée le 2026-10-03

ESLint : 0 erreur (33 avertissements, tous préexistants, aucun dans les fichiers
touchés). Prettier : conforme, sauf `src/app.html` et
`docs/audit-ergonomique-accueil-2026-10-02.md`, non conformes **avant** ce
chantier et volontairement laissés tels quels.

Rendu contrôlé en Chrome headless piloté en CDP, avec émulation mobile réelle.
À noter : le flag `--screenshot` de Chrome ne règle pas le viewport de layout et
produisait des captures trompeuses (contenu rogné à droite, y compris sur des
pages déjà correctes en production) - il faut passer par
`Emulation.setDeviceMetricsOverride`.

| Contrôle                         | Résultat                                             |
| -------------------------------- | ---------------------------------------------------- |
| Débordement horizontal           | 0 px à 320, 375, 390 et 768                          |
| `--nav-h`                        | 56px en mobile, 68px à 1440                          |
| Barre du bas                     | 5 colonnes de 78px, 5 entrées, masquée en desktop    |
| Pied de page / barre du bas      | chevauchement de 0 px en bas de `/rooms`             |
| Popover de thème, invité         | s'ouvre, reste dans l'écran (12 → 226 px)            |
| Choix d'un thème depuis la nav   | `data-theme`, `localStorage` et `theme-color` à jour |
| Tableau `/vs/*` à 390px          | empilé, `scrollWidth` 358 < 390, plus de scroll      |
| `/vs/*` sous la navbar           | corrigé, « Retour à ZIK » de nouveau visible         |
| `h1` sur `/zikle`                | présent en SSR                                       |
| `canonical` + `robots` `/class.` | présents en SSR                                      |
| Breadcrumbs                      | 1 `BreadcrumbList` sur les 7 pages visées            |
| Sitemap                          | 54 URL, `/soutenir` présent, `lastmod` figés         |

**Non vérifié visuellement :** le menu déroulant du profil connecté (en-tête
avatar/pseudo/ELO, groupes, Admin). Il demande une session authentifiée, que ce
poste n'a pas. Le markup compile et passe le lint, mais le rendu reste à
confirmer par un passage manuel en étant connecté.
