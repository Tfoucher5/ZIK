# Atelier de playlists et choix de la version (design)

Date : 2026-10-10, révisé le 2026-10-11. Branche : `feat/choix-version`. Version cible : v3.16.0.
Origine : GitHub Issue #214 (Ludhiel), « Suggestion amélioration youtube search ».

## Intention

- **Issue #214** : pouvoir imposer la vidéo YouTube d'un titre (cover, remix ou repost trouvé à tort, titre peu connu, blind tests spéciaux 8-bit/remix).
- **Theo (révision du 11/10)** : la première version imposait une modale de choix de vidéo à chaque ajout, ce qui était trop lourd. Ce qu'il veut, c'est **remplir une playlist à la main vite**, avec des outils avancés et une interface moins chargée. Il a validé la refonte complète de `/playlists`.
- **Critère de réussite** : on ajoute un titre en un geste (taper, puis Entrée). On ajoute 30 titres en collant une liste. On écoute la version jouée et on la corrige sans quitter la liste.

## Décisions

| Sujet                | Décision                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Périmètre            | Toute la page `/playlists`                                                                                                                                                                                                                     |
| Ajout                | Immédiat, en version auto. Le choix de version est **optionnel** et se fait après coup, dans la ligne                                                                                                                                          |
| Outils V1            | Recherche pendant la frappe, collage de liste, explorateur artiste/album, suggestions                                                                                                                                                          |
| Disposition          | Liste des playlists toujours visible (colonne à gauche ≥ 1100 px, bandeau défilant en dessous), puis « studio » 2 colonnes : titres et atelier d'ajout. Sur mobile (≤ 900 px), l'atelier s'ouvre en feuille plein écran via un bouton flottant |
| Stockage de la vidéo | Catalogue partagé `tracks.youtube_id`, écrit seulement s'il est vide (inchangé)                                                                                                                                                                |
| Spotify              | Recherche (sélecteur Deezer / Spotify) et import de playlist réservés à l'admin                                                                                                                                                                |

## Page

- **Navigation** : `PlaylistNav`, liste des playlists (nom, nombre de titres, privée) et « + Nouvelle ».
- **En-tête** : nom, nombre de titres et visibilité, ⚙ (renommer, visibilité, supprimer), `Lancer une room` (désactivé sous 3 titres). La dernière playlist ouverte est rouverte (`localStorage`).
- **Liste des titres** : filtre au-delà de 6 titres, lignes `n° · pochette · titre/artiste (✓ si version vérifiée) · ▶ · ✎ · ✕`. ▶ déplie le panneau de version dans la ligne.
- **Atelier d'ajout** : une barre unique, qui détecte ce qu'on y met :
  - texte : recherche Deezer pendant la frappe (200 ms), `↑ ↓ Entrée`, `Échap` pour vider, puces « Tout <artiste> ». Le surlignage part du premier résultat absent de la playlist. Entrée tapée avant l'arrivée des résultats est rejouée à leur arrivée, et après un ajout le surlignage passe au suivant ;
  - plusieurs lignes collées : collage de liste ;
  - lien Deezer playlist/album/artiste : import ou explorateur ;
  - lien Spotify playlist : import (admin) ;
  - lien YouTube : ajout avec cette vidéo (artiste et titre devinés, modifiables).
  - Barre vide : suggestions puis astuces.
- **Suggestions** : graines = un titre Deezer par artiste (les 8 plus présents), radios Deezer, classement par nombre de radios puis popularité, 2 titres max par artiste (`src/lib/playlist/suggest.js`). Liste figée tant qu'on reste sur la playlist (`suggestions.svelte.js`).
- Chaque résultat a ▶ (extrait Deezer de 30 s) et un bouton `+`/`✓` qui ajoute ou retire le titre.

## Panneau de version (dans la ligne)

- Titre verrouillé (`youtube_id` présent) : lecteur, badge « Version vérifiée », « Pas la bonne version ? » qui ouvre le signalement (`VersionReport`).
- Sinon : la version auto se joue. « Changer de version » montre les 5 candidats et un champ de lien, puis « Garder celle-ci » appelle `POST /api/tracks/:id/video`.
- Un seul son à la fois sur la page (`previewPlayer.svelte.js`) : extrait Deezer ou iframe `youtube-nocookie`, créée seulement au clic.

## Serveur

- `services/deezerCatalog.js` : `searchTracks`, `artistPage`, `albumPage`, `suggestions` (radio Deezer des artistes des 5 derniers titres), `matchLines` (4 en parallèle). Cache mémoire d'une heure.
- Routes : `GET /api/deezer/search` (90/min), `GET /api/deezer/artist/:id`, `GET /api/deezer/album/:id` (30/min), `GET /api/deezer/suggest?ids=` (20/min), `POST /api/deezer/match` (6/min, 100 lignes max), `GET /api/tracks/youtube?id=` (authentifié, 20/min).
- `/api/tracks/resolve` renvoie `pinned: false` quand la vidéo collée est ignorée parce que le titre a déjà une version vérifiée.
- Logique pure partagée : `src/lib/playlist/input.js` (`detectInput`, `parseLine`, `parseList`, `matchScore`, `guessFromVideo`, `coverThumb`), testée dans `playlistInput.test.js`.

## Composants (`src/lib/components/playlist/`)

`playlistStore.svelte.js` (état), `PlaylistNav`, `PlaylistHeader`, `PlaylistTracks`, `PlaylistTrackRow`, `VersionPanel` (+ `versionPicker.svelte.js`, `VersionRow`, `VersionReport`), `AddPanel`, `SearchResults`, `TrackResult`, `CatalogExplorer`, `PasteImport`, `LinkImport` (+ `spotify.js`), `YoutubeAdd`, `Suggestions`, et les modales sorties telles quelles : `PlaylistFormModal`, `RoomLaunchModal`, `AnswersModal`.

## Hors périmètre

Réordonner les titres, choix du point de départ de l'extrait, Mode Salon, historique des changements de vidéo.
