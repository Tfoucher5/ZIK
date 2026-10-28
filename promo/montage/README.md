# Vidéos promo ZIK (TikTok, Reels, Shorts)

Montage en code avec [Remotion](https://www.remotion.dev) (gratuit pour ZIK, équipe de 3 personnes ou moins). Vidéos verticales 1080×1920 : vrais éléments de ZIK animés sur le rythme d'un son tendance, sans musique incrustée (le son s'ajoute dans TikTok).

```bash
npm i
npx remotion studio                                  # prévisualiser
node scripts/sheet.mjs <id> 30,95,140                # planche de contrôle (zone sûre TikTok en vert)
timeout 420 npx remotion render <id> out/zik-<id>.mp4 --codec=h264 --crf=18
node scripts/apercu.mjs <id> <son>                   # aperçu privé avec l'extrait du son (jamais posté)
```

- `src/videos/` : une vidéo par fichier, listée dans `src/Root.tsx`.
- `src/zik/` : briques communes (titres façon site, vrais éléments découpés, mouvements, outro-couverture).
- `scripts/` : prise de vue (`capture.mjs`, `partie.mjs`, `zikle.mjs` derrière `gateway.mjs` en lecture seule + `dev-promo.sh`), tempo (`beats.mjs`), contrôle (`sheet.mjs`), aperçu (`apercu.mjs`).
- Non versionnés : `public/rec/` (captures), `public/ref/` (extraits Deezer), `public/pochettes/`, `out/`.

La méthode complète (direction artistique, musiques validées, catalogue des formats déjà faits) est dans le skill Claude `zik-montage`.
