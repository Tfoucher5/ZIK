# Vidéos promo par fonctionnalité

Six vidéos verticales 1080x1920 de 15 à 20 s (TikTok, Reels, Shorts), montées à partir de vrais écrans du jeu : `videos/`. Chaque vidéo montre l'écran en entier et explique la fonctionnalité étape par étape (légendes, encadrés sur les éléments importants), puis finit sur zik-music.fr.

| Fichier                         | Fonctionnalité                                      |
| ------------------------------- | --------------------------------------------------- |
| `zik-1-blind-test-en-ligne.mp4` | Partie en ligne, saisie libre, classement en direct |
| `zik-2-mode-qcm.mp4`            | Mode QCM (4 choix)                                  |
| `zik-3-mode-salon.mp4`          | Mode Salon : TV + téléphones, équipes               |
| `zik-4-zikle.mp4`               | Zikle, la chanson du jour                           |
| `zik-5-classements-defi.mp4`    | Hit-parade et défi de la semaine                    |
| `zik-6-themes-rooms.mp4`        | Thèmes et rooms                                     |

Série interactive, à alterner avec la série explicative : le spectateur joue et répond en commentaire.

| Fichier                         | Format                                                  |
| ------------------------------- | ------------------------------------------------------- |
| `zik-i1-pochettes-floutees.mp4` | Devine l'artiste avec la pochette floutée (3 manches)   |
| `zik-i2-emojis.mp4`             | Trouve la chanson avec 3 emojis, réponses du mode QCM   |
| `zik-i3-pov-salon.mp4`          | POV soirée blind test en mode Salon, « tague ton pote » |
| `zik-i4-defi-zikle.mp4`         | Défi Zikle : « trouvée en 3 essais, et toi ? »          |

Piste audio muette : ajouter un son depuis l'appli du réseau social.

## Refaire les vidéos

1. **Base locale** (`base-locale/`) : Postgres + PostgREST avec le schéma de prod et des données fictives (joueurs, rooms officielles, titres Deezer). `fetch.py` récupère les titres de `songs.json`, `seed.py` génère `03_seed.sql`, `gw.mjs` sert PostgREST sous `/rest/v1` comme Supabase. Ne jamais pointer l'app sur la base de prod pour capturer.
2. **App** : `.env` vers la passerelle locale, puis `npx vite dev` en enregistrant la sortie dans `dev.log`. Les bots lisent la réponse de la manche dans les lignes `[PROMO]` du log : ajouter temporairement un `console.log("[PROMO] " + JSON.stringify(...))` après `game.currentTrack = game.sessionPlaylist.pop()` dans `game/core.js` et `salon.js`, sans le commiter.
3. **Capture** (`capture/`) : Chromium piloté par Playwright, enregistrement image par image via CDP dans `rec/<nom>/`. Ex. : `node capture/game_classic.mjs KM2H86 rec/classic3 3`, `THEME=dark node capture/game_qcm.mjs CQ8JHA rec/qcm2`, `node capture/salon.mjs rec/salon3`, `node capture/zikle.mjs rec/zik2` (lancer `fresh.sh` avant : les liens d'extraits Deezer expirent vite), `node capture/statics.mjs "st_themes|/blind-test"`.
4. **Montage** (`montage/`) : `node montage/compose.mjs montage/specs/1-en-ligne.mjs videos/zik-1-blind-test-en-ligne.mp4` Chaque spec décrit les plans (`shots` : enregistrement, instant, caméra `{t,s,x,y}`, ou plusieurs `panels` téléphone/TV), les légendes (`caps` : surtitre `k`, titre `t` avec mots entre `*…*` en rose et `|` pour aller à la ligne, sous-titre `s`), les effets (`fx` : `ring`, `stamp`, `count`, `confetti`, `veil` pour flouter une zone, `mask` pour la cacher) et la fin (`outro`). `specs/common.mjs` convertit les coordonnées d'un enregistrement en coordonnées vidéo. Ajouter `0.5,4,8` en 3e argument pour n'exporter que des images de contrôle.

Les enregistrements doivent avoir un `dim.json` (`{"w":1075,"h":2330}`) à côté de `index.json`.
