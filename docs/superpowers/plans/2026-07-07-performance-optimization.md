# Optimisation Performance ZIK — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site rapide partout — chargement première visite allégé (CSS minifié + brotli + fonts locales + cache long), démarrage du son en jeu quasi instantané, Salon sans latence de recherche YouTube, fluidité runtime préservée.

**Architecture:** Optimisations par couches sans aucun changement visuel ni fonctionnel : (1) précompression build + cache headers dans `server.js`, (2) fonts self-hostées, (3) minification post-build des CSS de `static/css/`, (4) `player_ready` émis au vrai buffering audio, (5) prefetch de la recherche YouTube du round suivant en mode Salon, (6) lazy-loading images + `content-visibility` sur les listes.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, adapter-node, Socket.io, esbuild (minif CSS), node:zlib (recompression).

## Global Constraints

- **RENDU VISUEL IDENTIQUE AU PIXEL PRÈS — on ne TOUCHE PAS au visuel, aucune dégradation, aucune simplification d'effet.**
- Pas de refactoring non lié à la performance (règle CLAUDE.md).
- **Demander confirmation à l'utilisateur avant chaque `git commit`** (règle CLAUDE.md).
- **PAS de bump de version dans ce plan** : cette branche deviendra la v3.0.0 (bump géré au merge). Les nouveaux `?v=` introduits utilisent `3.0.0`.
- `npm run lint` doit passer avant toute PR.
- Spec de référence : `docs/superpowers/specs/2026-07-07-performance-optimization-design.md`.

---

### Task 0: Mesure de référence

**Files:**

- Create: `docs/superpowers/plans/2026-07-07-perf-baseline.md`

**Interfaces:**

- Produces: chiffres de départ (poids CSS/JS, présence compression) utilisés par Task 7 pour prouver les gains.

- [ ] **Step 1: Build prod et relevé des tailles**

Run:

```bash
npm run build
du -sb build/client/css/*.css | sort -rn
find build/client/_app/immutable -name "*.js" -exec du -b {} + | sort -rn | head -15
ls build/client/css/ | head
```

Expected: tailles brutes des CSS (~21 Ko base, ~58 Ko game, ~72 Ko salon), pas de fichiers `.br`/`.gz` (précompression pas encore activée).

- [ ] **Step 2: Noter la référence**

Écrire dans `docs/superpowers/plans/2026-07-07-perf-baseline.md` :

```markdown
# Baseline perf — avant optimisation (2026-07-07)

## CSS (build/client/css, non minifiés, servis sans cache long)

- base.css : <taille> o
- game.css : <taille> o
- salon.css : <taille> o
- theme.css : <taille> o
- animations.css : <taille> o

## JS (top chunks immutable)

- <liste des 15 plus gros>

## Compression

- Précompression build : absente (gzip à la volée uniquement via `compression`)

## Fonts

- Google Fonts externes (2 connexions : fonts.googleapis.com + fonts.gstatic.com)

## Audio jeu

- player_ready émis avant buffering ; Salon : recherche YouTube synchrone à chaque round
```

Remplacer les `<taille>` par les valeurs relevées.

- [ ] **Step 3: Commit (après confirmation utilisateur)**

```bash
git add docs/superpowers/plans/2026-07-07-perf-baseline.md docs/superpowers/specs/2026-07-07-performance-optimization-design.md docs/superpowers/plans/2026-07-07-performance-optimization.md
git commit -m "docs: spec + plan + baseline optimisation performance"
```

---

### Task 1: Précompression build + cache headers immutable

**Files:**

- Modify: `svelte.config.js`
- Modify: `server.js:78-81`

**Interfaces:**

- Consumes: rien.
- Produces: fichiers `.br`/`.gz` dans `build/client/` (Task 3 devra les régénérer pour les CSS minifiés) ; headers `Cache-Control` immutable sur `/css/*`, `/fonts/*`, `/favicon/*` (Task 2 dépend de `/fonts/*`).

- [ ] **Step 1: Activer precompress dans svelte.config.js**

Remplacer le contenu de `svelte.config.js` :

```js
import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({ out: "build", precompress: true }),
  },
};

export default config;
```

- [ ] **Step 2: Cache headers dans server.js**

Dans `server.js`, remplacer :

```js
const compress = compression({ threshold: 1024 });
const server = createServer((req, res) =>
  compress(req, res, () => handler(req, res)),
);
```

par :

```js
const compress = compression({ threshold: 1024 });
const IMMUTABLE_RE = /^\/(css|fonts|favicon)\//;
const server = createServer((req, res) => {
  if (IMMUTABLE_RE.test(req.url)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
  compress(req, res, () => handler(req, res));
});
```

Sans risque : ces chemins sont déjà versionnés par `?v=` (un bump d'URL invalide le cache).

- [ ] **Step 3: Vérifier build + headers**

Run:

```bash
npm run build && ls build/client/css/
```

Expected: chaque `.css` accompagné de `.css.br` et `.css.gz`.

Run (serveur prod local) :

```bash
node server.js &
sleep 3
curl -sI "http://localhost:3000/css/base.css?v=test" | grep -iE "cache-control|content-type"
curl -sI -H "Accept-Encoding: br" "http://localhost:3000/css/base.css?v=test" | grep -iE "content-encoding"
kill %1
```

Expected: `Cache-Control: public, max-age=31536000, immutable` et `Content-Encoding: br`.

- [ ] **Step 4: Vérifier que le dev fonctionne toujours**

Run: `npm run dev` puis ouvrir http://localhost:5173 — la home s'affiche normalement. Arrêter le serveur.

- [ ] **Step 5: Commit (après confirmation utilisateur)**

```bash
git add svelte.config.js server.js
git commit -m "perf: precompression brotli/gzip au build + cache immutable css/fonts/favicon"
```

---

### Task 2: Self-host des fonts (suppression Google Fonts)

**Files:**

- Create: `scripts/fetch-fonts.mjs`
- Create: `static/fonts/*.woff2` (générés par le script)
- Create: `static/css/fonts.css` (généré par le script)
- Modify: `src/app.html:38-54`

**Interfaces:**

- Consumes: cache headers `/fonts/*` de Task 1.
- Produces: `/css/fonts.css` + `/fonts/*.woff2` locaux référencés par `app.html`.

- [ ] **Step 1: Écrire le script de téléchargement**

Créer `scripts/fetch-fonts.mjs` :

```js
// Télécharge les woff2 Google Fonts (latin + latin-ext) vers static/fonts/
// et génère static/css/fonts.css avec des URLs locales. À lancer une fois :
//   node scripts/fetch-fonts.mjs
import { writeFileSync, mkdirSync } from "fs";

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const KEEP = new Set(["latin", "latin-ext"]);

const css = await (
  await fetch(CSS_URL, { headers: { "User-Agent": UA } })
).text();

mkdirSync("static/fonts", { recursive: true });

const blocks = [
  ...css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face\s*\{[^}]*\})/g),
];
if (!blocks.length)
  throw new Error("Aucun bloc @font-face trouvé — UA refusée ?");

let out = "/* Fonts self-hostées — générées par scripts/fetch-fonts.mjs */\n";
for (const [, subset, block] of blocks) {
  if (!KEEP.has(subset)) continue;
  const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!url) continue;
  const family = block.match(/font-family:\s*'([^']+)'/)[1];
  const weight = block.match(/font-weight:\s*(\d+)/)[1];
  const style = block.match(/font-style:\s*(\w+)/)[1];
  const fname = `${family.toLowerCase().replace(/ /g, "-")}-${weight}${style === "italic" ? "i" : ""}-${subset}.woff2`;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(`static/fonts/${fname}`, buf);
  out += `/* ${subset} */\n${block.replace(url, `/fonts/${fname}`)}\n`;
  console.log(`${fname} : ${buf.length} o`);
}
writeFileSync("static/css/fonts.css", out);
console.log("static/css/fonts.css généré");
```

- [ ] **Step 2: Lancer le script**

Run: `node scripts/fetch-fonts.mjs`
Expected: ~20 fichiers `.woff2` listés avec leurs tailles + « static/css/fonts.css généré ». Vérifier que chaque bloc de `static/css/fonts.css` contient `font-display: swap` et une URL `/fonts/...`.

- [ ] **Step 3: Brancher app.html sur les fonts locales**

Dans `src/app.html`, remplacer :

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preconnect" href="https://e-cdns-images.dzcdn.net" crossorigin />
<link rel="dns-prefetch" href="https://api.deezer.com" />
<!-- Fonts async (non-render-blocking) — display=swap évite le FOIT -->
<link
  href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
  rel="stylesheet"
  media="print"
  onload="this.media = 'all'"
/>
<noscript>
  <link
    href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
    rel="stylesheet"
  />
</noscript>
```

par :

```html
<link rel="preconnect" href="https://e-cdns-images.dzcdn.net" crossorigin />
<link rel="dns-prefetch" href="https://api.deezer.com" />
<link
  rel="preload"
  as="font"
  type="font/woff2"
  href="/fonts/barlow-400-latin.woff2"
  crossorigin
/>
<link
  rel="preload"
  as="font"
  type="font/woff2"
  href="/fonts/barlow-condensed-800-latin.woff2"
  crossorigin
/>
<link rel="stylesheet" href="/css/fonts.css?v=3.0.0" />
```

(Si les noms exacts des deux fichiers préchargés diffèrent de ceux générés au Step 2, utiliser les noms réels.)

- [ ] **Step 4: Vérifier visuellement**

Run: `npm run dev`, ouvrir la home, l'onglet Réseau ne montre **aucune** requête vers `fonts.googleapis.com`/`fonts.gstatic.com`, les fonts Barlow/Barlow Condensed/JetBrains Mono s'affichent comme avant (comparer titres condensés + code mono sur /docs).

- [ ] **Step 5: Commit (après confirmation utilisateur)**

```bash
git add scripts/fetch-fonts.mjs static/fonts static/css/fonts.css src/app.html
git commit -m "perf: fonts self-hostées (woff2 locaux, suppression Google Fonts)"
```

---

### Task 3: Minification post-build des CSS statiques

**Files:**

- Create: `scripts/minify-css.mjs`
- Modify: `package.json:8` (script `build`) + devDependency `esbuild`

**Interfaces:**

- Consumes: `.br`/`.gz` générés par la précompression de Task 1 (ils sont régénérés ici pour les CSS minifiés).
- Produces: `build/client/css/*.css` minifiés + `.br`/`.gz` cohérents. Le dev et les URLs ne changent pas.

- [ ] **Step 1: Installer esbuild explicitement**

Run: `npm install -D esbuild`
Expected: ajouté à `devDependencies` (déjà présent transitif via Vite, on le rend explicite).

- [ ] **Step 2: Écrire le script**

Créer `scripts/minify-css.mjs` :

```js
// Minifie les CSS copiés depuis static/css vers build/client/css après le build,
// et régénère leurs .br/.gz (la précompression adapter a tourné avant, sur les non-minifiés).
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { transform } from "esbuild";
import { gzipSync, brotliCompressSync, constants } from "zlib";

const dir = "build/client/css";
if (!existsSync(dir)) {
  console.error("build/client/css introuvable — lancer après vite build");
  process.exit(1);
}

for (const f of readdirSync(dir).filter((n) => n.endsWith(".css"))) {
  const p = join(dir, f);
  const src = readFileSync(p, "utf8");
  const { code } = await transform(src, { loader: "css", minify: true });
  writeFileSync(p, code);
  const buf = Buffer.from(code);
  writeFileSync(`${p}.gz`, gzipSync(buf, { level: 9 }));
  writeFileSync(
    `${p}.br`,
    brotliCompressSync(buf, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }),
  );
  console.log(
    `${f}: ${src.length} → ${code.length} o (br: ${brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length} o)`,
  );
}
```

- [ ] **Step 3: Brancher dans le build**

Dans `package.json`, remplacer :

```json
    "build": "node scripts/ensure-ytdlp.mjs && vite build",
```

par :

```json
    "build": "node scripts/ensure-ytdlp.mjs && vite build && node scripts/minify-css.mjs",
```

- [ ] **Step 4: Vérifier**

Run: `npm run build`
Expected: log de minification par fichier (game.css ~58 Ko → ~45 Ko et br nettement plus petit), et :

```bash
head -c 200 build/client/css/game.css
```

Expected: CSS minifié (une seule ligne). Vérifier que `static/css/game.css` (source) est **inchangé** (`git status` propre côté `static/`).

- [ ] **Step 5: Commit (après confirmation utilisateur)**

```bash
git add scripts/minify-css.mjs package.json package-lock.json
git commit -m "perf: minification post-build des CSS statiques + recompression br/gz"
```

---

### Task 4: `player_ready` émis au vrai buffering audio (jeu classique)

**Files:**

- Modify: `src/routes/(site)/game/+page.svelte:307-339` (fonction `loadAudio` + `stopVideo`)
- Modify: `src/routes/(site)/game/+page.svelte:531-538` (handler `start_round`)

**Interfaces:**

- Consumes: mécanisme serveur existant `player_ready` → `round_start_sync` (75 % de prêts ou 6 s, `core.js:1151-1176`) — inchangé.
- Produces: `loadAudio(audioUrl, startSeconds, onReady)` — `onReady` appelé une seule fois quand l'audio est bufferisé (`canplaythrough`) ou après 4 s de fallback.

Contexte : aujourd'hui le client émet `player_ready` immédiatement après avoir _lancé_ le chargement (`+page.svelte:534`), donc la fenêtre de sync ne couvre pas le téléchargement — des joueurs entendent le son en retard. En émettant à `canplaythrough`, le round démarre quand l'audio est réellement prêt chez 75 % des joueurs.

- [ ] **Step 1: Modifier `loadAudio`**

Dans `src/routes/(site)/game/+page.svelte`, remplacer :

```js
  function loadAudio(audioUrl, startSeconds) {
    const audio = document.getElementById('previewAudio');
    if (!audio) return;
    if (ytPlayer?.stopVideo) ytPlayer.stopVideo();
    audio.pause();
    audio.onloadedmetadata = null;
    audio.onended = null;
    startMediaGuard();
    audio.src = audioUrl;
    audio.volume = savedVol() / 100;
```

par :

```js
  function loadAudio(audioUrl, startSeconds, onReady) {
    const audio = document.getElementById('previewAudio');
    if (!audio) return;
    if (ytPlayer?.stopVideo) ytPlayer.stopVideo();
    audio.pause();
    audio.onloadedmetadata = null;
    audio.onended = null;
    audio.oncanplaythrough = null;
    startMediaGuard();
    audio.src = audioUrl;
    audio.volume = savedVol() / 100;
    if (onReady) {
      let readySent = false;
      const markReady = () => {
        if (readySent) return;
        readySent = true;
        clearTimeout(readyFallback);
        onReady();
      };
      const readyFallback = setTimeout(markReady, 4000);
      audio.oncanplaythrough = markReady;
    }
```

- [ ] **Step 2: Nettoyer le handler dans `stopVideo`**

Dans la même page, remplacer :

```js
if (audio) {
  audio.onended = null;
  audio.pause();
  audio.src = "";
}
```

par :

```js
if (audio) {
  audio.onended = null;
  audio.oncanplaythrough = null;
  audio.pause();
  audio.src = "";
}
```

- [ ] **Step 3: Émettre `player_ready` via le callback**

Remplacer :

```js
      if (data.audioUrl) {
        _usingIframe = false;
        loadAudio(data.audioUrl, data.startSeconds);
        if (socket) socket.emit('player_ready');
      } else {
```

par :

```js
      if (data.audioUrl) {
        _usingIframe = false;
        loadAudio(data.audioUrl, data.startSeconds, () => socket?.emit('player_ready'));
      } else {
```

- [ ] **Step 4: Vérifier en jouant**

Run: `npm run dev`, lancer une partie solo dans une room custom. Expected : la manche démarre normalement, la musique joue dès l'ouverture du round, l'écran « synchronisation » ne reste pas bloqué (fallback 4 s + timer serveur 6 s couvrent les cas lents). Vérifier aussi 2 onglets joueurs simultanés.

- [ ] **Step 5: Lancer les tests existants**

Run: `npm test`
Expected: PASS (aucun test ne couvre ce chemin client, non-régression générale).

- [ ] **Step 6: Commit (après confirmation utilisateur)**

```bash
git add "src/routes/(site)/game/+page.svelte"
git commit -m "perf: player_ready emis au vrai buffering audio (canplaythrough + fallback 4s)"
```

---

### Task 5: Salon — prefetch de la recherche YouTube du round suivant

**Files:**

- Modify: `src/lib/server/socket/salon.js:400-491` (fonction `startNextRound` + helper)

**Interfaces:**

- Consumes: `YouTube.search` (déjà importé dans `salon.js`), `game.sessionPlaylist` (pile, `pop()` à chaque round).
- Produces: `searchTrackVideo(track, roundDuration)` → `{ video, safeStart }` ; `game.prefetchedRound = { track, video, safeStart }` et `game._prefetchPromise` (mêmes noms que le pattern de `core.js`).

Contexte : le Salon fait `YouTube.search()` en début de **chaque** round (latence de 1 à 3 s par manche, visible sur l'écran TV). Le jeu classique prefetch déjà la manche suivante — on applique le même pattern.

- [ ] **Step 1: Extraire le helper de recherche**

Dans `src/lib/server/socket/salon.js`, ajouter juste **avant** `async function startNextRound(code, io) {` :

```js
async function searchTrackVideo(track, roundDuration) {
  const artist = track.mainArtist || track.artist;
  const results = await YouTube.search(`${artist} - ${track.title}`, {
    type: "video",
    limit: 5,
  });
  if (!results.length) throw new Error("No video");
  const video =
    results.find((v) => v.channel?.name?.endsWith("- Topic")) || results[0];
  const durationSec = Math.round((video.duration || 0) / 1000);
  const safeStart = Math.max(
    0,
    Math.floor(Math.random() * Math.max(1, durationSec - roundDuration - 10)),
  );
  return { video, safeStart };
}
```

- [ ] **Step 2: Consommer le prefetch dans `startNextRound`**

Remplacer (dans le `try` de `startNextRound`) :

```js
  try {
    const artist = track.mainArtist || track.artist;
    const results = await YouTube.search(`${artist} - ${track.title}`, {
      type: "video",
      limit: 5,
    });
    if (!results.length) throw new Error("No video");

    const video =
      results.find((v) => v.channel?.name?.endsWith("- Topic")) || results[0];
    const duration = salon.settings.roundDuration;
    const durationSec = Math.round((video.duration || 0) / 1000);
    const safeStart = Math.max(
      0,
      Math.floor(Math.random() * Math.max(1, durationSec - duration - 10)),
    );
```

par :

```js
  try {
    let video, safeStart;
    if (game.prefetchedRound?.track === track) {
      ({ video, safeStart } = game.prefetchedRound);
      game.prefetchedRound = null;
    }
    if (!video && game._prefetchPromise) {
      await game._prefetchPromise.catch(() => {});
      game._prefetchPromise = null;
      if (game.prefetchedRound?.track === track) {
        ({ video, safeStart } = game.prefetchedRound);
        game.prefetchedRound = null;
      }
    }
    if (!video) {
      ({ video, safeStart } = await searchTrackVideo(
        track,
        salon.settings.roundDuration,
      ));
    }
```

Attention : la variable locale `duration` disparaît — vérifier qu'elle n'était utilisée que pour `safeStart` (c'est le cas dans le code actuel, `salon.js:437-442`).

- [ ] **Step 3: Lancer le prefetch du round suivant**

Toujours dans `startNextRound`, remplacer :

```js
// Wait for host to signal music is playing (max 5s fallback)
game.musicReadyTimer = setTimeout(() => startTimer(code, io), 5000);
```

par :

```js
// Wait for host to signal music is playing (max 5s fallback)
game.musicReadyTimer = setTimeout(() => startTimer(code, io), 5000);

// Précharger la recherche YouTube du round suivant pendant celui-ci
const nextTrack = game.sessionPlaylist[game.sessionPlaylist.length - 1];
if (nextTrack) {
  game._prefetchPromise = searchTrackVideo(
    nextTrack,
    salon.settings.roundDuration,
  )
    .then((r) => {
      game.prefetchedRound = { track: nextTrack, ...r };
    })
    .catch(() => {});
}
```

- [ ] **Step 4: Vérifier en jouant un salon**

Run: `npm run dev`, créer un salon (host TV + un téléphone/onglet joueur), jouer 3 manches. Expected : à partir de la manche 2, la transition entre manches est nettement plus rapide (plus de recherche YouTube bloquante) ; le passage manuel (`manualNext`) fonctionne aussi.

- [ ] **Step 5: Lancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit (après confirmation utilisateur)**

```bash
git add src/lib/server/socket/salon.js
git commit -m "perf(salon): prefetch de la recherche YouTube du round suivant"
```

---

### Task 6: Images lazy + content-visibility sur les listes

**Files:**

- Modify: `src/routes/(site)/game/+page.svelte:953`
- Modify: `src/routes/(site)/rooms/+page.svelte:507`
- Modify: `src/routes/(site)/playlists/TrackSearch.svelte:206`
- Modify: `src/routes/(site)/playlists/TrackRow.svelte:8`
- Modify: `src/lib/components/ProfileView.svelte:466,483`
- Modify: `src/routes/(site)/+page.svelte:375`
- Modify: `src/routes/(site)/classements/+page.svelte` (style scoped `.row`)
- Modify: `src/routes/(site)/playlists/TrackRow.svelte` (style scoped `.track-row-pl`)

**Interfaces:**

- Consumes: rien. Produces: rien (changements locaux de rendu, zéro changement visuel).

- [ ] **Step 1: Ajouter `loading="lazy" decoding="async"` aux images de listes**

Sur chaque `<img>` listé ci-dessous, ajouter les attributs manquants (ne pas toucher au reste de la balise) :

- `game/+page.svelte:953` : `<img src={item.cover} alt="" class="g-hitem-img" loading="lazy" decoding="async">`
- `rooms/+page.svelte:507` : ajouter `loading="lazy" decoding="async"` sur `.mine-cov`
- `playlists/TrackSearch.svelte:206` : ajouter `loading="lazy" decoding="async"` sur `.track-cover`
- `playlists/TrackRow.svelte:8` : ajouter `loading="lazy" decoding="async"` sur `.track-cover`
- `ProfileView.svelte:466` et `:483` : ajouter `loading="lazy" decoding="async"` sur les deux `<img>` d'avatars (34×34)
- `(site)/+page.svelte:375` : ajouter `loading="lazy" decoding="async"` sur `.chart-avatar`

Ne PAS lazy-loader les images visibles immédiatement au premier écran (covers de reveal, QR codes, avatar nav).

- [ ] **Step 2: `content-visibility` sur les longues listes**

Dans le `<style>` scoped de `src/routes/(site)/classements/+page.svelte`, ajouter à la règle `.row` existante :

```css
content-visibility: auto;
contain-intrinsic-size: auto 56px;
```

Dans le `<style>` scoped de `src/routes/(site)/playlists/TrackRow.svelte`, ajouter à `.track-row-pl` :

```css
content-visibility: auto;
contain-intrinsic-size: auto 46px;
```

Ajuster les valeurs `56px`/`46px` à la hauteur réelle d'une ligne (mesurer via devtools) pour éviter tout saut de scrollbar.

- [ ] **Step 3: Vérifier visuellement**

Run: `npm run dev` — parcourir classements (scroller la liste complète), playlists (playlist longue), rooms, profil. Expected : aucun changement visuel, pas de saut de scroll, images chargées à l'approche du viewport (onglet Réseau).

- [ ] **Step 4: Commit (après confirmation utilisateur)**

```bash
git add "src/routes/(site)/game/+page.svelte" "src/routes/(site)/rooms/+page.svelte" "src/routes/(site)/playlists/TrackSearch.svelte" "src/routes/(site)/playlists/TrackRow.svelte" src/lib/components/ProfileView.svelte "src/routes/(site)/+page.svelte" "src/routes/(site)/classements/+page.svelte"
git commit -m "perf: lazy-loading images de listes + content-visibility classements/playlists"
```

---

### Task 7: Mesure finale + lint (PAS de bump de version — branche v3.0.0)

**Files:**

- Modify: `docs/superpowers/plans/2026-07-07-perf-baseline.md` (section « Après »)

**Interfaces:**

- Consumes: baseline de Task 0.

- [ ] **Step 1: Re-mesure**

Run:

```bash
npm run build
du -sb build/client/css/*.css | sort -rn
ls -la build/client/css/ | grep -E "\.br"
```

Ajouter une section « ## Après optimisation » dans `2026-07-07-perf-baseline.md` avec les nouvelles tailles (CSS minifiés + tailles `.br`) et les changements qualitatifs (fonts locales, cache immutable, player_ready bufferisé, prefetch salon).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (sinon `npx prettier --write .` + corriger ESLint, re-vérifier).

- [ ] **Step 3: Tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit final (après confirmation utilisateur — PAS de bump de version)**

```bash
git add docs/superpowers/plans/2026-07-07-perf-baseline.md
git commit -m "docs: mesures apres passe optimisation performance"
```

---

## Self-Review (fait à l'écriture du plan)

- **Couverture spec** : Couche 0 → Task 0 ; Couche 1 → Tasks 1-2 ; Couche 2 → Task 3 (l'audit JS a montré que les manual chunks couvrent déjà supabase/socket.io — pas de code mort évident à purger sans lecture dédiée, hors périmètre) ; Couche 3 (corrigée) → Tasks 4-5 ; Couche 4 → Task 6 (les blobs aurora n'animent que `transform` avec un blur statique — déjà composités GPU, rien à changer ; `animations.css` est déjà transform/opacity only) ; critères de succès → Task 7.
- **Placeholders** : les `<taille>` de Task 0 et « noms réels » de Task 2 Step 3 sont des valeurs mesurées à l'exécution, pas des TBD de conception.
- **Cohérence des types** : `loadAudio(audioUrl, startSeconds, onReady)` (Task 4) ; `searchTrackVideo(track, roundDuration)` → `{ video, safeStart }` et `game.prefetchedRound = { track, video, safeStart }` (Task 5) — noms alignés sur le pattern existant de `core.js`.
