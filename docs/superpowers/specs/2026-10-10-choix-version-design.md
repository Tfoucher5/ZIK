# Choix de la version d'un titre (playlists joueurs) - design

Date : 2026-10-10 - Branche : `feat/choix-version` - Version cible : v3.16.0
Origine : GitHub Issue #214 (Ludhiel) « Suggestion amélioration youtube search ».

## Intention

**Ce que demande l'issue** : pouvoir préciser l'URL ou l'ID YouTube d'un titre ajouté à la main, parce que la recherche automatique « artiste - titre » tombe parfois sur une cover, un repost ou un remix, ou ne trouve rien sur un titre peu connu. Bonus cité : permettre des blind tests spéciaux (8-bit, remix...).

**Ce que veut Theo** : un ajout de titre plus simple, où le joueur choisit exactement la version jouée et peut l'écouter avant de valider pour vérifier que le moteur a trouvé la bonne.

**Critère de réussite** : un créateur de playlist entend, avant ou après l'ajout, la vidéo qui sera jouée en partie, et peut en choisir une autre ou coller un lien si elle est mauvaise.

## Décisions prises

| Sujet | Décision |
|---|---|
| Stockage du choix | Catalogue partagé `tracks.youtube_id` (pas de colonne par playlist) |
| Écrasement | Un joueur ne fixe une vidéo que si `tracks.youtube_id` est vide. Sinon : écoute + signalement via le report audio existant |
| Parcours | Choix à l'ajout (panneau « Choisis la version »), aussi ouvrable depuis une ligne existante |
| Écoute | Lecteur YouTube intégré (`youtube-nocookie`), pas le proxy yt-dlp |
| Versions spéciales | Titre distinct (ex. « One More Time (8-bit) ») = ligne de catalogue distincte = vidéo propre |

## État actuel (rappel)

- La recherche Deezer/Spotify (`TrackSearch.svelte`) ne fournit que les métadonnées. La vidéo est trouvée **au moment de jouer** par `ytsSearch` (`src/lib/server/socket/game/audio.js`) : `ytsearch5`, chaîne « - Topic » prioritaire, sinon premier résultat.
- `resolveVideo` donne déjà la priorité à `track.youtube_id` quand il est renseigné (fixé aujourd'hui par l'admin via `/api/admin/track-audio-fix`).
- L'ajout passe par `/api/tracks/resolve` (RPC `resolve_tracks`, upsert sur `norm_key`), puis par une insertion dans `custom_playlist_tracks`.

## Parcours joueur

1. **Recherche** inchangée. Le bouton d'ajout d'un résultat devient « Choisir ».
2. **Panneau « Choisis la version »** (`VersionPicker`) :
   - **Titre sans vidéo fixée** : liste des 5 candidats YouTube (vignette, titre, chaîne, durée). Le candidat que le moteur aurait choisi est pré-sélectionné et marqué « Choix auto ». Chaque ligne a un bouton ▶. Sous la liste : un champ « ou colle un lien YouTube ». Boutons : « Annuler » / « Ajouter ».
   - **Titre ayant déjà une vidéo fixée** : seule cette vidéo est affichée (▶), avec la mention « Version vérifiée ». Boutons : « Ajouter » et « Ce n'est pas la bonne version », qui ouvre le report audio existant (`ReportModal`).
   - Cas « on garde le choix auto sans y toucher » : « Ajouter » suffit, soit un clic de plus qu'aujourd'hui.
3. **Lignes existantes** (imports Deezer/Spotify compris) : bouton « Vérifier le son » sur chaque `TrackRow`, qui ouvre le même panneau en mode « vérifier » (bouton « Enregistrer » au lieu de « Ajouter »).
4. **Onglet « Ajouter manuellement »** : artiste + titre, puis « Choisir la version », qui ouvre le même panneau. Le champ « URL preview » est supprimé.

## Serveur

### `GET /api/tracks/versions?artist=&title=`
- Authentifié (`requireAuth`), limité par utilisateur (`checkRateLimit`, ex. 20 req/min), car chaque appel lance yt-dlp.
- Si le titre existe déjà au catalogue avec `youtube_id` : renvoie `{ locked: true, video }` (infos via `ytVideoInfo`) sans lancer de recherche.
- Sinon : `{ locked: false, candidates: [{ id, title, channel, duration }], autoId }`.
- Cache mémoire 10 min par `artist|title` normalisé.
- La logique de recherche est extraite dans `ytsCandidates(artist, title)` (renvoie la liste + l'index choisi). `ytsSearch` est réécrit par-dessus : **une seule heuristique de choix**.

### `/api/tracks/resolve` (étendu)
- Accepte un `youtube_id` optionnel par titre (ID déjà extrait côté client, revalidé côté serveur par regex `^[\w-]{11}$`).
- La vidéo est vérifiée par `ytVideoInfo` (elle existe et est lisible). En cas d'échec, l'ajout est refusé avec un message clair.
- L'écriture se fait uniquement si `tracks.youtube_id IS NULL` (update conditionnel après le RPC). Le choix d'un joueur n'écrase jamais un choix existant.

### Mode « vérifier » sur une ligne existante
- `POST /api/tracks/[id]/video` `{ youtube_id }` : authentifié, rate limité, vérifie la vidéo par `ytVideoInfo`. Il applique la même règle que `/api/tracks/resolve` (update `WHERE youtube_id IS NULL`) et la même vérification, via une fonction de service commune dans `src/lib/server/services/trackVideo.js`. Si le titre est verrouillé, le panneau est en lecture + signalement, aucune écriture possible.

### Extraction d'ID (utilitaire partagé client/serveur, `src/lib/youtube.js`)
- Formes acceptées : `youtube.com/watch?v=`, `m.youtube.com`, `music.youtube.com`, `youtu.be/`, `shorts/`, `embed/`, ID brut de 11 caractères. Toute autre forme est refusée.

## Écoute

- Un seul lecteur `iframe` `youtube-nocookie.com/embed/<id>?autoplay=1`, créé au clic sur ▶ (jamais au chargement) et détruit à la fermeture du panneau ou au changement de ligne.
- Vidéo non intégrable : message « Écoute impossible ici » + lien « Ouvrir sur YouTube » (nouvel onglet).

## Composants et découpage

- `src/lib/components/playlist/VersionPicker.svelte` : la modale (s'appuie sur `Modal.svelte`).
- `src/lib/components/playlist/VersionRow.svelte` : une ligne candidate (radio + ▶ + infos).
- `src/lib/components/playlist/versionPicker.svelte.js` : état (chargement, candidats, sélection, lien collé, erreur).
- `TrackSearch.svelte` et `TrackRow.svelte` : ouvrent le panneau, sans ajouter de logique.
- `+page.svelte` (1548 lignes) : on n'y ajoute **rien** de plus que le branchement. Pas d'autre refactoring dans ce chantier.

## Responsive

- Desktop : modale centrée, ~560 px de large.
- Mobile (≤ 600 px) : feuille plein écran (bottom sheet), en-tête et barre de boutons fixes, liste qui défile entre les deux.
- Lecteur en 16:9 au-dessus de la liste, sur toute la largeur. Cibles tactiles ≥ 44 px. Pas d'action qui dépende du survol.
- Titres et chaînes longs : coupés avec ellipse sur une ligne, titre complet en `title`.
- Contrôle visuel obligatoire en desktop et en 390 px.

## SXO

La page `/playlists` est indexée (`index, follow`) : elle doit refléter la nouveauté.
- Meta `description` et texte d'intro visible : mentionner « écoute chaque titre avant de l'ajouter » et « choisis la version exacte (original, live, remix) ».
- `/docs` : section playlists mise à jour.
- Performance : aucun iframe YouTube au chargement de la page, donc pas d'impact sur le LCP ni sur les cookies tiers.
- Accessibilité : focus piégé dans la modale, retour du focus au déclencheur, `Esc` pour fermer, candidats en `radiogroup` navigable au clavier, boutons ▶ avec `aria-label` « Écouter <titre> », états de chargement annoncés (`aria-live`).

## Erreurs

- yt-dlp KO ou aucun résultat : le panneau affiche « Aucune version trouvée automatiquement » et met en avant le champ lien. L'ajout reste possible sans vidéo (comportement actuel : recherche au moment de jouer).
- Rate limit atteint : message « Trop de recherches, réessaie dans un instant ».
- Lien invalide ou vidéo indisponible : erreur sous le champ, bouton « Ajouter » désactivé.

## Tests

- `src/lib/youtube.js` : extraction d'ID sur toutes les formes, cas invalides.
- `ytsCandidates` : choix de « - Topic », sinon le premier ; `ytsSearch` inchangé fonctionnellement.
- Règle « seulement si vide » : pas d'écrasement quand `youtube_id` est déjà renseigné.
- `npx eslint .`, `npx vitest run`, `npx svelte-check`, contrôle visuel desktop + 390 px.
- Aucune donnée de test en BDD de prod. Si un essai réel est nécessaire, on retire ensuite le titre de la playlist de test et on remet `youtube_id` à NULL.

## Hors périmètre

- Choix du point de départ de l'extrait (reste aléatoire pour les joueurs).
- Mode Salon.
- Historique et retour arrière des changements de vidéo.
- Choix de version pendant un import en masse (on corrige ensuite ligne par ligne).
