# Mode Salon — régie et page de préparation

- **Date :** 2026-10-03
- **Branche :** `feat/theme-clair-accueil`
- **Périmètre :** `/salon/regie` (600 lignes), `/salon` (664 lignes), `src/lib/server/socket/salon.js` (émission ciblée)
- **Hors périmètre :** `/salon/host` (écran TV) et `/salon/play` (téléphone joueur)

## Intention

Mode Salon est l'offre commercialisée auprès des bars, campings et
événements. Ces deux pages sont ce qu'un client voit et manipule : elles
doivent tenir un niveau de finition supérieur au reste du site.

Les deux pages n'ont pas le même utilisateur :

- `/salon` sert **deux publics** : le particulier qui organise une soirée,
  et le professionnel qu'on cherche à convertir.
- `/salon/regie` n'en a **qu'un** : l'exploitant, en direct, pendant que la
  soirée tourne.

**Critère de réussite.** Pendant une manche, sur n'importe quel écran,
l'exploitant voit sans défiler le temps restant, qui a répondu et si la TV
est branchée, et atteint Pause ou Révéler en un geste.

## Contraintes fixées

1. La régie doit fonctionner du **téléphone au second écran**, la tablette
   étant le support le plus courant.
2. On modifie `salon.js`, mais **les tests s'écrivent avant**.
3. ZIK Pro reçoit un bloc assumé sur `/salon`.
4. Les réglages (manches, durée, équipes) se configurent en amont sur
   `/salon` ; la régie sert à piloter, pas à configurer.

## Constats

Relevés sur un salon réel : code créé par le parcours normal, deux joueurs
connectés, partie lancée.

### Régie

| #   | Constat                                                                                                                                                                                                                                                                                                                                            | Gravité    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| R1  | **Aucun indicateur d'écran TV.** Le serveur connaît le nombre d'écrans connectés — il compte `salon:screens:<code>` pour décider quand fermer le salon — mais ne le transmet jamais à la régie. Pendant la session de test, la régie affichait « Manche en cours · 1 / 10 » sans qu'aucun écran TV ne soit branché : pas de musique, pas d'alerte. | **Élevée** |
| R2  | La page avertit « Garde un seul écran TV ouvert, sinon la musique joue deux fois » — un risque qu'elle pourrait détecter et qu'elle se contente d'énoncer.                                                                                                                                                                                         | **Élevée** |
| R3  | **Les actions défilent hors de l'écran.** Sous 1100px, les trois colonnes s'empilent en un long défilement ; pendant une manche, le minuteur et Pause / Révéler passent au-dessus du panneau de réglages. C'est le cas d'usage principal (tablette, téléphone).                                                                                    | **Élevée** |
| R4  | **45 % de l'écran vide** à 1440×900 : les colonnes s'arrêtent à 480 / 190 / 580 px.                                                                                                                                                                                                                                                                | Moyenne    |
| R5  | **Hiérarchie des actions plate.** Pause, Révéler, Recommencer et Terminer la partie ont un poids visuel voisin. En direct, un clic de travers sur « Terminer » coupe la soirée d'un client.                                                                                                                                                        | Moyenne    |
| R6  | **« A répondu » quasi invisible.** L'information existe et est affichée — `answeredThisRound` / `foundThisRound` par joueur, classe `done` sur la ligne — mais par un fond vert à 8 % d'opacité, imperceptible sur fond clair.                                                                                                                     | Moyenne    |
| R7  | **État d'erreur pauvre.** Sans code de salon : une phrase rouge centrée dans une page vide, avec les boutons « Copier le lien TV » et « Copier le lien régie » toujours proposés alors qu'ils ne peuvent rien copier.                                                                                                                              | Faible     |
| R8  | Marqueurs Pro incohérents : des étiquettes `Pro` par endroits, un point magenta ailleurs, sans légende.                                                                                                                                                                                                                                            | Faible     |

### Page de préparation

`/salon` est globalement bien construite : hero clair, pavés de playlists
lisibles, réglages en contrôles segmentés, barre récapitulative collante.
Trois faiblesses, toutes commerciales.

| #   | Constat                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | **ZIK Pro est une ligne de texte gris en bas de page**, sous les réglages. C'est l'offre vendue, et c'est l'élément le moins visible.      |
| S2  | Les options réservées au Pro (équipes 3/4/6/8) ne sont signalées que par un **point magenta sans légende**.                                |
| S3  | « En ouvrant le salon, **cet onglet devient l'écran TV** » est en corps de texte gris, alors que c'est précisément ce que les gens ratent. |

## Conception

### A. Structure de la régie

Même ossature à toutes les tailles — cohérence choisie contre une mise en
page qui change par rupture. Quatre bandes :

```
┌──────────────────────────────────────────────┐
│ ZIK RÉGIE  MH8666   ● TV   Manche 3/10  28 s │  état, fixe
├──────────────────────────────────────────────┤
│  [ Direct ]  [ Joueurs · 12 ]  [ Réglages ]  │  onglets
├──────────────────────────────────────────────┤
│                                              │
│   contenu de l'onglet (défile)               │  max 900px, centré
│                                              │
├──────────────────────────────────────────────┤
│         [ PAUSE ]   [ RÉVÉLER ]              │  actions, fixe
└──────────────────────────────────────────────┘
```

Sur un second écran, la zone de contenu est **centrée à 900 px** au lieu
d'être étirée : la console se lit comme volontairement compacte, et non
comme une page à moitié vide. C'est ce qui rend ce choix tenable en 1440 px.

**La barre d'actions reste hors des onglets.** Les onglets ne régissent que
la zone de contenu. Sans cela, un exploitant consultant l'onglet « Joueurs »
pendant une manche n'aurait plus Pause à l'écran — le défaut R3 reviendrait
par une autre porte.

Répartition des contenus :

- **Direct** — manche en cours : pochette et titre (visibles ici seulement),
  progression des réponses, volume TV. Les instructions de démarrage
  n'apparaissent **qu'en phase lobby**, où elles sont utiles.
- **Joueurs** — pseudo, état « a répondu », score avec ±, exclusion ;
  groupés par équipe le cas échéant.
- **Réglages** — secondaire, conformément à la contrainte 4 : ce qui est
  modifiable en direct, et ce qui ne l'est qu'entre deux parties (la
  distinction existe déjà et est conservée).

### B. Bandeau d'état et indicateur TV

Trois états, en permanence visibles :

| État                | Rendu                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Un écran connecté   | `● Écran TV connecté`, vert                                                                |
| Aucun écran         | `⚠ Aucun écran TV — la musique ne jouera pas`, rouge, avec le bouton **Ouvrir l'écran TV** |
| Deux écrans ou plus | `⚠ 2 écrans TV — le son va jouer deux fois`, orange                                        |

Le troisième état remplace l'avertissement statique de R2 par une détection
réelle.

Le bandeau porte aussi : code du salon, phase et numéro de manche, minuteur,
nombre de joueurs connectés et nombre de réponses reçues.

### C. Barre d'actions

Contenu selon la phase :

| Phase    | Actions          |
| -------- | ---------------- |
| lobby    | Lancer la partie |
| round    | Pause, Révéler   |
| summary  | Manche suivante  |
| gameover | Rejouer          |

**« Terminer la partie » sort de la barre principale** et passe derrière un
menu avec confirmation (R5). C'est la seule action irréversible de l'écran ;
elle ne doit pas être atteignable par un clic de travers pendant une
prestation payante.

### D. Diffusion du compte d'écrans — tests d'abord

L'ordre est imposé par la contrainte 2.

**1. Tests.** `src/lib/server/socket/__tests__/salonScreens.test.js`, sur le
modèle de `game/__tests__/core.test.js` : Supabase bouchonné, `io` factice.
Le harnais existant avale les émissions (`to: () => ({ emit: () => {} })`) ;
il faut un `io` qui **capture** les émissions par room et qui expose
`sockets.adapter.rooms` sous forme de `Map`, puisque le compte d'écrans en
provient.

Cas couverts :

- un écran rejoint → `salon_screens` diffusé sur `salon:ctrl:<code>` avec `count: 1`
- un second écran rejoint → `count: 2`
- un écran se déconnecte → `count` décrémenté
- le dernier écran part alors qu'une régie reste connectée → `count: 0`, et
  le salon n'est **pas** fermé (le comportement de fermeture existant ne doit
  pas changer)

**2. Émission.** Dans `salon.js`, diffuser `salon_screens` sur
`salon:ctrl:<code>` à chaque connexion et déconnexion d'un socket de rôle
`screen`. Le nom est libre : aucun des 22 événements `salon_*` existants ne
l'utilise.

**3. Affichage.** La régie écoute `salon_screens` et alimente le bandeau.

### E. Page de préparation

- **Bloc ZIK Pro après les réglages** (S1) : ce que Pro débloque, pour qui
  (bar, camping, événement), lien vers `/pro`.
- **Étiquettes « Pro » lisibles** à la place du point magenta (S2), alignées
  sur celles déjà utilisées en régie.
- **« Cet onglet devient l'écran TV »** remonté en élément visible (S3).

### F. Découpage

Les deux pages sont réécrites ; c'est le moment de les séparer, selon la
méthode déjà appliquée au profil.

Régie : `RegieHeader` (bandeau d'état), `RegieTabs`, `TabDirect`,
`TabJoueurs`, `TabReglages`, `RegieActions`.

Rappel du piège rencontré sur le profil : le CSS scopé de Svelte ne traverse
pas les frontières de composant. Les styles partagés par plusieurs enfants
devront être déclarés en `:global` restreint à la racine `.rg`.

## Vérification

- **Tests unitaires** sur la diffusion du compte d'écrans (section D).
- **Empreinte de rendu avant/après** à chaque extraction de composant, comme
  pour le profil : hauteur, débordement, texte, géométrie et couleurs. Le
  découpage ne doit rien changer à l'écran ; les changements voulus sont
  identifiés séparément.
- **Parcours réel** : création d'un salon, connexion de joueurs, lancement
  d'une partie, aux trois tailles — téléphone 390, tablette 820, second
  écran 1440.
- **Scénario de l'indicateur TV** : ouvrir l'écran TV, le fermer, en ouvrir
  deux, vérifier les trois états.
- `npx eslint .` et `npx prettier --end-of-line auto --check .` (le script
  `npm run lint` échoue en local à cause de autocrlf).

## Risques

- **`salon.js` est du temps réel.** Une régression n'y est pas visible en
  relecture. C'est la raison de l'ordre tests-puis-code, et du choix de ne
  toucher qu'à l'émission d'un nouvel événement sans modifier la logique de
  fermeture du salon.
- **La régie n'a aujourd'hui aucun test.** L'empreinte de rendu couvre
  l'apparence, pas le comportement. Les parcours de phase (lobby → manche →
  réponse → fin) devront être vérifiés à la main.
- **Le choix d'onglets partout** gâche de la largeur sur un second écran.
  Atténué par le centrage à 900 px, mais c'est un compromis assumé en faveur
  de la cohérence entre supports.

---

## Questions ouvertes

### Plafond de huit équipes

`MAX_TEAMS = 8` n'est pas arbitraire : il est adossé à huit couleurs
(`--q0` à `--q7` dans `salon.css`) et huit noms par défaut.

La limite réelle n'est pas technique. Au-delà de huit à dix couleurs, on ne
les distingue plus sur une télé à cinq mètres : un bar à quinze équipes
aurait deux verts que les joueurs confondraient. Monter à douze reste un
ajout de contenu ; viser vingt demande de changer d'identifiant principal —
numéro et nom en premier sur l'écran TV, couleur réduite à un liseré.

**Décision du 2026-10-03 :** on garde huit. Aucun client n'a encore demandé
plus, et dimensionner à l'aveugle coûterait une refonte de l'affichage TV
pour un besoin supposé. À rouvrir quand un retour terrain le justifie, avec
le nombre d'équipes réellement observé.
