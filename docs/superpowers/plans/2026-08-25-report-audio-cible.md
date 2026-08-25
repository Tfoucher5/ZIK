# Report audio ciblé et lecteur de diagnostic — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un joueur de désigner le titre dont il n'entend pas la musique, et donner à l'administration un lecteur qui rejoue la chaîne audio d'un titre pour la diagnostiquer et la réparer.

**Architecture:** L'identifiant du catalogue, aujourd'hui perdu à la construction de l'objet de jeu, est rétabli puis propagé jusqu'au client via l'historique des manches et `start_round`. Le formulaire de report gagne un motif ; le motif audio déplie la liste des manches et transporte les titres cochés dans la colonne `metadata` existante. Côté administration, deux endpoints — un qui teste, un qui écrit — alimentent un composant unique monté dans les reports et dans le catalogue.

**Tech Stack:** SvelteKit 5 (runes), Socket.io, Supabase, Vitest.

**Spec :** `docs/superpowers/specs/2026-08-25-report-audio-cible-design.md`

## Global Constraints

- Version cible **3.6.0** (depuis 3.5.0). Ne jamais modifier `"node-fetch": "^3.3.2"` dans `package.json`.
- **Anti-spoiler, règle absolue :** rien de ce qui identifie l'artiste ou le titre de la **manche en cours** ne doit atteindre le client. Seul `trackId` est transmis. Un manquement ici donne la réponse au joueur en pleine partie.
- Svelte 5 runes uniquement (`$state`, `$derived`, `$props`, `$bindable`).
- `npm run lint` échoue sur ce poste pour une raison d'environnement (CRLF). Vérifier avec `npx eslint .` (0 error attendu, 47 warnings préexistants) et `npx prettier --check --end-of-line auto .`.
- Les endpoints admin portent chacun leur vérification : reprendre le `checkAdmin` de `src/routes/(site)/api/admin/errors/+server.js`.
- Répondre en français dans l'UI, pas de commentaire superflu.

---

### Task 1: Conserver l'identifiant du catalogue

**Files:**

- Modify: `src/lib/server/services/playlist.js:86-119` (`buildTrack`), `:126-141` (`buildTrackFromRow`)
- Test: `src/lib/server/services/__tests__/playlist.test.js` (créer)

**Interfaces:**

- Consumes: rien
- Produces: l'objet retourné par `buildTrack` porte désormais `id: string | undefined` et `external_id: string | undefined`. `buildTrackFromRow` les alimente depuis `row.tracks`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/server/services/__tests__/playlist.test.js` :

```js
import { describe, it, expect } from "vitest";
import { buildTrack, buildTrackFromRow } from "../playlist.js";

describe("buildTrack — identifiants du catalogue", () => {
  it("conserve id et external_id", () => {
    const t = buildTrack({
      artist: "PLK",
      title: "Pas de son",
      id: "uuid-1",
      external_id: "dz-42",
    });
    expect(t.id).toBe("uuid-1");
    expect(t.external_id).toBe("dz-42");
  });

  it("laisse les identifiants indéfinis quand ils ne sont pas fournis", () => {
    const t = buildTrack({ artist: "PLK", title: "Pas de son" });
    expect(t.id).toBeUndefined();
    expect(t.external_id).toBeUndefined();
  });

  it("n'altère pas les champs de jeu existants", () => {
    const t = buildTrack({
      artist: "Gazo feat. Tiakola",
      title: "Mopa",
      id: "uuid-2",
    });
    expect(t.mainArtist).toBe("Gazo");
    expect(t.featArtists).toEqual(["Tiakola"]);
    expect(t.title).toBe("Mopa");
  });
});

describe("buildTrackFromRow", () => {
  const row = {
    custom_artist: null,
    custom_title: null,
    custom_feats: null,
    track_answers: [],
    tracks: {
      id: "uuid-3",
      artist: "Ninho",
      title: "Vérité",
      cover_url: "http://x/c.jpg",
      preview_url: "http://x/p.mp3",
      external_id: "dz-77",
    },
  };

  it("reprend les identifiants du catalogue joint", () => {
    const t = buildTrackFromRow(row);
    expect(t.id).toBe("uuid-3");
    expect(t.external_id).toBe("dz-77");
  });

  it("laisse custom_artist primer sans perdre l'identifiant", () => {
    const t = buildTrackFromRow({ ...row, custom_artist: "Ninho & Niska" });
    expect(t.artist).toBe("Ninho & Niska");
    expect(t.id).toBe("uuid-3");
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/lib/server/services/__tests__/playlist.test.js`
Expected: FAIL — `expected undefined to be 'uuid-1'`

- [ ] **Step 3: Ajouter les deux champs**

Dans `buildTrack`, ajouter `id` et `external_id` à la signature déstructurée :

```js
export function buildTrack({
  artist,
  title,
  cover,
  preview_url,
  custom_artist,
  custom_title,
  custom_feats,
  extraAnswers,
  id,
  external_id,
}) {
```

et à l'objet retourné, après `preview_url` :

```js
    preview_url: preview_url || null,
    id,
    external_id,
    extraAnswers: extras,
```

Dans `buildTrackFromRow`, transmettre depuis `meta` :

```js
    extraAnswers: (row.track_answers || []).map((a) => ({
      label: a.answer_types?.name || "",
      value: a.value,
    })),
    id: meta.id,
    external_id: meta.external_id,
  });
```

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run` — Expected: PASS, 5 nouveaux tests, aucun test existant cassé.

- [ ] **Step 5: Vérifier que l'autre appelant n'est pas cassé**

`src/routes/(site)/api/rooms/custom/+server.js:45` appelle `buildTrack` sans identifiants : les champs valent `undefined`, ce qui est le comportement attendu et couvert par le deuxième test. Lire ce fichier pour confirmer qu'il ne fait aucun `Object.keys` ni comparaison stricte sur l'objet track.

- [ ] **Step 6: Lint et commit**

```bash
npx eslint src/lib/server/services/playlist.js src/lib/server/services/__tests__/playlist.test.js
npx prettier --check --end-of-line auto .
git add src/lib/server/services/playlist.js src/lib/server/services/__tests__/playlist.test.js
git commit -m "feat(tracks): buildTrack conserve l'identifiant du catalogue"
```

---

### Task 2: Propager les identifiants jusqu'au client

**Files:**

- Modify: `src/lib/server/socket/game/core.js` (~187, objet `summary`) et l'émission de `start_round`

**Interfaces:**

- Consumes: `track.id` (Task 1)
- Produces: chaque entrée de `game.history` porte `trackId` et `videoId` ; le payload `start_round` porte `trackId`.

- [ ] **Step 1: Ajouter les identifiants au résumé de manche**

Dans `core.js`, l'objet `summary` (~ligne 187) devient :

```js
const summary = {
  answer: `${displayString(track.mainArtist || track.artist)} - ${displayString(track.title)}`,
  cover: track.cover,
  reason,
  firstFinder: game.firstFullFinder,
  totalFound: game.totalFullFound,
  trackId: track.id ?? null,
  videoId: game.lastRoundData?.videoId ?? null,
  featArtists: (track.featArtists || []).map(displayString),
  extraAnswers: (track.extraAnswers || []).map((e) => ({
    label: e.label,
    value: e.value,
  })),
};
```

- [ ] **Step 2: Ajouter trackId à start_round**

Dans la construction de `game.lastRoundData` (~ligne 372), ajouter `trackId` :

```js
    game.lastRoundData = {
      videoId,
      startSeconds,
      trackId: track.id ?? null,
      round: game.currentRound,
```

**Ne rien ajouter d'autre.** `lastRoundData` part au client pendant la manche : y placer l'artiste ou le titre révélerait la réponse.

- [ ] **Step 3: Vérifier l'absence de fuite**

Lancer `npm run dev`, rejoindre une room, et pendant une manche active :

```bash
curl -s "localhost:5173/game?roomId=KDP2G9&username=Test&userId=t1&isGuest=1&gameMode=classic" | grep -ci "trackId"
```

Puis, dans la console du navigateur pendant une manche, vérifier que le payload reçu ne contient ni artiste ni titre :

```js
// à coller dans la console, avant le début d'une manche
window.__zikDebug = [];
```

Contrôle manuel suffisant : afficher l'objet reçu par `socket.on('start_round')` via un `console.log` temporaire et confirmer qu'il ne comporte que `videoId`, `startSeconds`, `trackId`, `round`, `total`, `featCount`, `extraLabels`, `audioUrl`. Retirer le `console.log` avant de commiter.

- [ ] **Step 4: Lint et commit**

```bash
npx eslint src/lib/server/socket/game/core.js
git add src/lib/server/socket/game/core.js
git commit -m "feat(game): transporte l'identifiant du titre vers le client"
```

---

### Task 3: Motifs et sélecteur de titres dans le report

**Files:**

- Create: `src/lib/reports/bug-report.js`
- Test: `src/lib/reports/__tests__/bug-report.test.js`
- Modify: `src/lib/components/ReportModal.svelte`, `src/routes/(site)/game/+page.svelte:1318-1326`, `src/routes/(site)/api/reports/+server.js`

**Interfaces:**

- Consumes: `history` (entrées portant `round`, `answer`, `trackId`, `videoId`) et les identifiants de la manche en cours (Task 2)
- Produces:
  - `BUG_MOTIFS: Array<{ value: string, label: string }>`
  - `buildTrackChoices({ history, current }) -> Array<{ key, round, label, locked, trackId, videoId, answer }>`
  - `sanitizeReportTracks(value) -> Array | null`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/reports/__tests__/bug-report.test.js` :

```js
import { describe, it, expect } from "vitest";
import {
  BUG_MOTIFS,
  buildTrackChoices,
  sanitizeReportTracks,
} from "../bug-report.js";

describe("BUG_MOTIFS", () => {
  it("propose le motif audio en premier", () => {
    expect(BUG_MOTIFS[0].value).toBe("audio");
  });
  it("contient les quatre motifs attendus", () => {
    expect(BUG_MOTIFS.map((m) => m.value)).toEqual([
      "audio",
      "mauvaise-reponse",
      "affichage",
      "autre",
    ]);
  });
});

describe("buildTrackChoices", () => {
  const history = [
    { round: 4, answer: "PLK - Pas de son", trackId: "t4", videoId: "v4" },
    { round: 3, answer: "Gazo - Drill FR", trackId: "t3", videoId: "v3" },
  ];

  it("place la manche en cours en tête, verrouillée et sans titre", () => {
    const c = buildTrackChoices({
      history,
      current: { round: 5, trackId: "t5", videoId: "v5" },
    });
    expect(c[0].locked).toBe(true);
    expect(c[0].round).toBe(5);
    expect(c[0].label).toBe("Manche 5 — en cours");
    expect(c[0].answer).toBe(null);
  });

  it("liste les manches terminées avec leur titre", () => {
    const c = buildTrackChoices({ history, current: null });
    expect(c).toHaveLength(2);
    expect(c[0].label).toBe("M4 · PLK - Pas de son");
    expect(c[0].locked).toBe(false);
    expect(c[0].trackId).toBe("t4");
  });

  it("renvoie une liste vide sans historique ni manche en cours", () => {
    expect(buildTrackChoices({ history: [], current: null })).toEqual([]);
  });

  it("donne une clé unique à chaque entrée", () => {
    const c = buildTrackChoices({
      history,
      current: { round: 5, trackId: "t5", videoId: "v5" },
    });
    expect(new Set(c.map((x) => x.key)).size).toBe(3);
  });
});

describe("sanitizeReportTracks", () => {
  it("garde une liste valide", () => {
    const v = [{ trackId: "t1", videoId: "v1", round: 2, answer: "A - B" }];
    expect(sanitizeReportTracks(v)).toEqual(v);
  });

  it("rejette ce qui n'est pas un tableau", () => {
    expect(sanitizeReportTracks("nope")).toBe(null);
    expect(sanitizeReportTracks({ a: 1 })).toBe(null);
    expect(sanitizeReportTracks(undefined)).toBe(null);
  });

  it("rejette au-delà de 50 entrées", () => {
    const gros = Array.from({ length: 51 }, () => ({ trackId: "t" }));
    expect(sanitizeReportTracks(gros)).toBe(null);
  });

  it("ne conserve que les champs attendus", () => {
    const v = [{ trackId: "t1", vole: "secret", round: 1 }];
    expect(sanitizeReportTracks(v)).toEqual([
      { trackId: "t1", videoId: null, round: 1, answer: null },
    ]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/lib/reports/__tests__/bug-report.test.js`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Écrire le module**

Créer `src/lib/reports/bug-report.js` :

```js
export const BUG_MOTIFS = [
  { value: "audio", label: "Je n'entends pas la musique" },
  { value: "mauvaise-reponse", label: "Un titre a une mauvaise réponse" },
  { value: "affichage", label: "Problème d'affichage" },
  { value: "autre", label: "Autre" },
];

// La manche en cours est proposée sans son titre : l'afficher donnerait la réponse.
export function buildTrackChoices({ history = [], current = null }) {
  const choices = [];
  if (current?.round) {
    choices.push({
      key: `cur-${current.round}`,
      round: current.round,
      label: `Manche ${current.round} — en cours`,
      locked: true,
      trackId: current.trackId ?? null,
      videoId: current.videoId ?? null,
      answer: null,
    });
  }
  for (const h of history) {
    choices.push({
      key: `h-${h.round}-${h.trackId ?? "x"}`,
      round: h.round,
      label: `M${h.round} · ${h.answer}`,
      locked: false,
      trackId: h.trackId ?? null,
      videoId: h.videoId ?? null,
      answer: h.answer ?? null,
    });
  }
  return choices;
}

export function sanitizeReportTracks(value) {
  if (!Array.isArray(value) || value.length > 50) return null;
  return value.map((t) => ({
    trackId: t?.trackId ?? null,
    videoId: t?.videoId ?? null,
    round: typeof t?.round === "number" ? t.round : null,
    answer: typeof t?.answer === "string" ? t.answer : null,
  }));
}
```

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run src/lib/reports/__tests__/bug-report.test.js` — Expected: PASS, 11 tests.

- [ ] **Step 5: Brancher le formulaire**

Dans `ReportModal.svelte`, ajouter deux props :

```js
    history         = [],
    currentRound    = null,
```

et l'état du motif et des cases cochées :

```js
import { BUG_MOTIFS, buildTrackChoices } from "$lib/reports/bug-report.js";

let bugMotif = $state("audio");
let checked = $state({});
const choices = $derived(buildTrackChoices({ history, current: currentRound }));
```

Pré-cocher la manche en cours à l'ouverture :

```js
$effect(() => {
  if (
    open &&
    choices.length &&
    choices[0].locked &&
    checked[choices[0].key] === undefined
  ) {
    checked = { ...checked, [choices[0].key]: true };
  }
});
```

Dans le markup, pour `type === 'bug'` : la liste de motifs en boutons radio, puis, si `bugMotif === 'audio'`, la liste `choices` en cases à cocher — l'étiquette affiche `choice.label` et rien d'autre. Si `choices.length === 0`, afficher « Aucun titre joué pour l'instant ».

Le corps envoyé devient, pour `type === 'bug'` :

```js
          {
            type: 'bug',
            reporter_id: reporterId || null,
            reporter_name: reporterName || null,
            room_id: roomId || null,
            subject: bugMotif,
            message: message.trim(),
            metadata: bugMotif === 'audio'
              ? { tracks: choices.filter((c) => checked[c.key]).map((c) => ({
                  trackId: c.trackId, videoId: c.videoId, round: c.round, answer: c.answer,
                })) }
              : {},
          }
```

Règle de validation à appliquer dans `submit()`, en remplacement du test actuel sur `message` :

```js
const selection =
  bugMotif === "audio" ? choices.filter((c) => checked[c.key]) : [];
const messageRequis =
  type !== "bug" || bugMotif !== "audio" || selection.length === 0;
if (messageRequis && !message.trim()) {
  error = "Décris le problème.";
  return;
}
```

- [ ] **Step 6: Passer l'historique depuis le jeu**

Dans `src/routes/(site)/game/+page.svelte`, le composant (ligne ~1318) reçoit deux props de plus :

```svelte
<ReportModal
  bind:open={reportOpen}
  type={reportType}
  reportedUsername={reportUsername}
  reportedUserId={reportUserId}
  roomId={ROOM_ID}
  reporterId={USER_ID}
  reporterName={USERNAME}
  {history}
  currentRound={currentRoundInfo}
/>
```

`currentRoundInfo` est un nouvel état alimenté dans `socket.on('start_round')` (~ligne 644) et remis à `null` dans `socket.on('round_end')` :

```js
let currentRoundInfo = $state(null);
```

```js
currentRoundInfo = {
  round: data.round,
  trackId: data.trackId ?? null,
  videoId: data.videoId ?? null,
};
```

et dans le gestionnaire de `round_end`, après `history = [data, ...history];` :

```js
currentRoundInfo = null;
```

- [ ] **Step 7: Valider `metadata` côté serveur**

Dans `src/routes/(site)/api/reports/+server.js`, importer le module et assainir avant l'insertion :

```js
import { sanitizeReportTracks } from "$lib/reports/bug-report.js";
```

puis, juste avant l'`insert` :

```js
const safeTracks = metadata?.tracks
  ? sanitizeReportTracks(metadata.tracks)
  : null;
const safeMetadata = safeTracks ? { ...metadata, tracks: safeTracks } : {};
```

et remplacer `metadata: metadata || {}` par `metadata: safeMetadata`.

- [ ] **Step 8: Vérifier de bout en bout**

Avec `npm run dev`, lancer une partie, ouvrir le report bug pendant une manche :

- le motif `audio` est sélectionné et la manche en cours est cochée, **sans artiste ni titre affiché**
- envoyer sans message : le report part
- choisir « Problème d'affichage » : le sélecteur disparaît, le message redevient obligatoire

Contrôler en base :

```sql
select subject, metadata from reports order by created_at desc limit 1;
```

`subject` vaut `audio` et `metadata.tracks` contient l'entrée cochée.

- [ ] **Step 9: Lint et commit**

```bash
npx eslint src/lib/reports/ src/lib/components/ReportModal.svelte "src/routes/(site)/game/+page.svelte" "src/routes/(site)/api/reports/+server.js"
npx prettier --check --end-of-line auto .
git add src/lib/reports/ src/lib/components/ReportModal.svelte "src/routes/(site)/game/+page.svelte" "src/routes/(site)/api/reports/+server.js"
git commit -m "feat(reports): un report audio désigne les titres concernés"
```

---

### Task 4: Endpoints de diagnostic et de correction

**Files:**

- Create: `src/routes/(site)/api/admin/track-audio-debug/+server.js`
- Create: `src/routes/(site)/api/admin/track-audio-fix/+server.js`

**Interfaces:**

- Consumes: `validPreviewUrl`, `getDeezerPreview`, `getItunesPreview` de `$lib/server/socket/game/audio.js` ; `getYtAudioUrl` et `YTDLP_BIN` de `$lib/server/ytdlAudio.js`
- Produces: `POST /api/admin/track-audio-debug?token=…` renvoie
  `{ steps: { catalogue, ytdlp, proxy, deezer, itunes } }`, chaque étape valant
  `{ ok: boolean, detail: string, error: string | null }`.
  `POST /api/admin/track-audio-fix?token=…` renvoie `{ ok: true }`.

- [ ] **Step 1: Écrire l'endpoint de diagnostic**

Créer `src/routes/(site)/api/admin/track-audio-debug/+server.js` :

```js
import { error, json } from "@sveltejs/kit";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { YTDLP_BIN, getYtAudioUrl } from "$lib/server/ytdlAudio.js";
import {
  validPreviewUrl,
  getDeezerPreview,
  getItunesPreview,
  ytsSearch,
} from "$lib/server/socket/game/audio.js";

const execFileAsync = promisify(execFile);

async function checkAdmin(token) {
  if (!token) throw error(403, "Token manquant");
  const user = await verifyToken(token);
  if (!user) throw error(403, "Token invalide");
  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") throw error(403, "Accès refusé");
}

const step = (ok, detail, err = null) => ({ ok, detail, error: err });

export async function POST({ url, request }) {
  await checkAdmin(url.searchParams.get("token"));
  const { trackId, overrideExternalId, overridePreviewUrl } =
    await request.json();
  if (!trackId) return json({ error: "trackId requis" }, { status: 400 });

  const { data: track } = await getAdminClient()
    .from("tracks")
    .select(
      "id, artist, title, preview_url, preview_expires_at, external_id, source",
    )
    .eq("id", trackId)
    .single();
  if (!track) return json({ error: "Titre introuvable" }, { status: 404 });

  const previewUrl = overridePreviewUrl || track.preview_url;
  const externalId = overrideExternalId || track.external_id;

  const steps = {};

  const stillValid = validPreviewUrl(previewUrl);
  steps.catalogue = step(
    Boolean(stillValid),
    previewUrl
      ? `preview_url présente, expire_at=${track.preview_expires_at ?? "—"}, external_id=${externalId ?? "—"}, source=${track.source ?? "—"}`
      : `aucune preview_url, external_id=${externalId ?? "—"}, source=${track.source ?? "—"}`,
    previewUrl && !stillValid ? "preview_url expirée" : null,
  );

  let version = "inconnue";
  try {
    const { stdout } = await execFileAsync(YTDLP_BIN, ["--version"]);
    version = stdout.trim();
  } catch (e) {
    version = `indisponible (${e.message})`;
  }

  // `getYtAudioUrl` attend un identifiant de vidéo, pas une requête : le jeu
  // passe d'abord par `ytsSearch`, on reproduit exactement la même séquence.
  const video = await ytsSearch(track.artist, track.title).catch(() => null);
  steps.recherche = step(
    Boolean(video?.id),
    video?.id ? `vidéo ${video.id}` : "aucune vidéo trouvée",
    video?.id ? null : "ytsSearch ne renvoie rien",
  );

  if (!video?.id) {
    steps.ytdlp = step(false, `yt-dlp ${version}`, "aucune vidéo à extraire");
    steps.proxy = step(false, "non testé", "étape précédente KO");
  } else {
    try {
      const entry = await getYtAudioUrl(video.id);
      const client = new URL(entry.url).searchParams.get("c") ?? "—";
      steps.ytdlp = step(
        true,
        `yt-dlp ${version}, client ${client}, url ${entry.url.slice(0, 60)}…`,
      );
      const head = await fetch(entry.url, {
        headers: { Range: "bytes=0-1000" },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      steps.proxy = step(
        Boolean(head && head.status < 400),
        `statut upstream ${head?.status ?? "injoignable"}`,
        head && head.status >= 400 ? `HTTP ${head.status}` : null,
      );
    } catch (e) {
      steps.ytdlp = step(false, `yt-dlp ${version}`, e.message);
      steps.proxy = step(
        false,
        "non testé — yt-dlp a échoué",
        "étape précédente KO",
      );
    }
  }

  const dz = await getDeezerPreview(track.artist, track.title).catch(
    () => null,
  );
  steps.deezer = step(
    Boolean(dz),
    dz ? `${dz.slice(0, 60)}…` : "aucun résultat",
    dz ? null : "Deezer ne renvoie rien",
  );

  const it = await getItunesPreview(track.artist, track.title).catch(
    () => null,
  );
  steps.itunes = step(
    Boolean(it),
    it ? `${it.slice(0, 60)}…` : "aucun résultat",
    it ? null : "iTunes ne renvoie rien",
  );

  return json({
    track: { id: track.id, artist: track.artist, title: track.title },
    steps,
    playable: overridePreviewUrl || stillValid || dz || it || null,
  });
}
```

**Cet endpoint n'écrit jamais en base.**

- [ ] **Step 2: Écrire l'endpoint de correction**

Créer `src/routes/(site)/api/admin/track-audio-fix/+server.js`, avec le même `checkAdmin` recopié (les deux fichiers sont indépendants) :

```js
export async function POST({ url, request }) {
  await checkAdmin(url.searchParams.get("token"));
  const { trackId, previewUrl, externalId } = await request.json();
  if (!trackId) return json({ error: "trackId requis" }, { status: 400 });

  const patch = {};
  if (previewUrl) {
    patch.preview_url = previewUrl;
    const exp = /hdnea=exp=(\d+)/.exec(previewUrl);
    patch.preview_expires_at = exp
      ? new Date(Number(exp[1]) * 1000).toISOString()
      : null;
  }
  if (externalId) patch.external_id = externalId;
  if (!Object.keys(patch).length) {
    return json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  const { error: dbError } = await getAdminClient()
    .from("tracks")
    .update(patch)
    .eq("id", trackId);
  if (dbError) return json({ error: dbError.message }, { status: 500 });
  return json({ ok: true });
}
```

Reprendre au-dessus les mêmes imports que l'endpoint précédent, en ne gardant que `error`, `json`, `verifyToken` et `getAdminClient`.

- [ ] **Step 3: Vérifier la protection**

Avec `npm run dev` :

```bash
curl -s -X POST localhost:5173/api/admin/track-audio-debug \
  -H 'Content-Type: application/json' -d '{"trackId":"x"}' -o /dev/null -w "%{http_code}\n"
```

Expected: `403` — aucun token fourni.

- [ ] **Step 4: Vérifier le diagnostic sur un vrai titre**

Récupérer un `trackId` réel et un jeton `super_admin` depuis la session du navigateur (onglet Application → Local Storage → `sb-*-auth-token`, champ `access_token`), puis :

```bash
curl -s -X POST "localhost:5173/api/admin/track-audio-debug?token=$TOKEN" \
  -H 'Content-Type: application/json' -d "{\"trackId\":\"$TRACK_ID\"}" | head -40
```

Expected: un objet `steps` avec les six étapes renseignées, et la version de `yt-dlp` visible dans `steps.ytdlp.detail`.

- [ ] **Step 5: Lint et commit**

```bash
npx eslint "src/routes/(site)/api/admin/track-audio-debug/+server.js" "src/routes/(site)/api/admin/track-audio-fix/+server.js"
npx prettier --check --end-of-line auto .
git add "src/routes/(site)/api/admin/track-audio-debug/+server.js" "src/routes/(site)/api/admin/track-audio-fix/+server.js"
git commit -m "feat(admin): endpoints de diagnostic et correction audio"
```

---

### Task 5: Le lecteur de diagnostic

**Files:**

- Create: `src/lib/components/admin/TrackAudioDebugger.svelte`
- Modify: `src/routes/(admin)/admin/reports/+page.svelte:82-83`, `src/routes/(admin)/admin/tracks/+page.svelte`

**Interfaces:**

- Consumes: les deux endpoints de la Task 4 ; `metadata.tracks` des reports (Task 3)
- Produces: composant `<TrackAudioDebugger trackId={…} token={…} />`

- [ ] **Step 1: Écrire le composant**

Créer `src/lib/components/admin/TrackAudioDebugger.svelte`. Il prend `trackId` et `token`, appelle le diagnostic à la demande, et affiche les six étapes :

```svelte
<script>
  let { trackId, token } = $props();

  let report   = $state(null);
  let loading  = $state(false);
  let erreur   = $state('');
  let extId    = $state('');
  let prevUrl  = $state('');
  let saving   = $state(false);
  let saved    = $state(false);

  const ORDRE = [
    ['catalogue', 'Catalogue'],
    ['recherche', 'Recherche YouTube'],
    ['ytdlp', 'yt-dlp'],
    ['proxy', 'Proxy audio'],
    ['deezer', 'Deezer'],
    ['itunes', 'iTunes'],
  ];

  const testOk = $derived(Boolean(report?.playable));

  async function tester() {
    loading = true; erreur = ''; saved = false;
    try {
      const res = await fetch(`/api/admin/track-audio-debug?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          overrideExternalId: extId.trim() || undefined,
          overridePreviewUrl: prevUrl.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) erreur = d.error || 'Erreur';
      else report = d;
    } catch { erreur = 'Erreur réseau.'; }
    finally { loading = false; }
  }

  async function enregistrer() {
    saving = true;
    try {
      const res = await fetch(`/api/admin/track-audio-fix?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          previewUrl: prevUrl.trim() || report?.playable || undefined,
          externalId: extId.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) erreur = d.error || 'Erreur';
      else saved = true;
    } catch { erreur = 'Erreur réseau.'; }
    finally { saving = false; }
  }
</script>

<div class="tad">
  <button class="tad-run" onclick={tester} disabled={loading}>
    {loading ? 'Test en cours…' : 'Diagnostiquer'}
  </button>

  {#if erreur}<p class="tad-err">{erreur}</p>{/if}

  {#if report}
    <p class="tad-title">{report.track.artist} — {report.track.title}</p>
    <ul class="tad-steps">
      {#each ORDRE as [cle, libelle] (cle)}
        {@const s = report.steps[cle]}
        {#if s}
          <li class:ok={s.ok}>
            <span class="tad-dot">{s.ok ? '✓' : '✕'}</span>
            <span class="tad-lbl">{libelle}</span>
            <span class="tad-detail">{s.detail}</span>
            {#if s.error}<span class="tad-why">{s.error}</span>{/if}
          </li>
        {/if}
      {/each}
    </ul>

    {#if report.playable}
      <audio controls src={report.playable}></audio>
    {/if}

    <div class="tad-fix">
      <input bind:value={extId} placeholder="Forcer un external_id Deezer" />
      <input bind:value={prevUrl} placeholder="Forcer une URL de preview" />
      <button onclick={tester} disabled={loading}>Retester</button>
      <button onclick={enregistrer} disabled={!testOk || saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
    {#if !testOk}<p class="tad-hint">Aucune source jouable : l'enregistrement reste bloqué.</p>{/if}
    {#if saved}<p class="tad-ok">Enregistré.</p>{/if}
  {/if}
</div>

<style>
  .tad { border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-top: 10px; }
  .tad-run { padding: 7px 14px; cursor: pointer; }
  .tad-title { font-weight: 700; margin: 12px 0 8px; color: var(--text); }
  .tad-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .tad-steps li { display: grid; grid-template-columns: 18px 90px 1fr; gap: 8px; font-size: 0.82rem; color: var(--mid); }
  .tad-dot { color: var(--danger); }
  .tad-steps li.ok .tad-dot { color: #4ade80; }
  .tad-lbl { color: var(--text); }
  .tad-detail { word-break: break-all; }
  .tad-why { grid-column: 3; color: var(--danger); font-size: 0.78rem; }
  .tad-fix { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .tad-fix input { flex: 1 1 220px; padding: 6px 10px; }
  .tad-err { color: var(--danger); font-size: 0.82rem; }
  .tad-hint { color: var(--dim); font-size: 0.78rem; margin-top: 8px; }
  .tad-ok { color: #4ade80; font-size: 0.82rem; margin-top: 8px; }
  audio { width: 100%; margin-top: 12px; }
</style>
```

- [ ] **Step 2: Monter le composant dans les reports**

Dans `src/routes/(admin)/admin/reports/+page.svelte`, le bloc `metadata` (lignes 82-83) affiche aujourd'hui le JSON brut. Le conserver, et ajouter au-dessus, quand des titres sont signalés :

```svelte
{#if r.subject === 'audio' && r.metadata?.tracks?.length}
  {#each r.metadata.tracks as t (t.trackId ?? t.round)}
    {#if t.trackId}
      <div class="field-label">
        Manche {t.round}{t.answer ? ` · ${t.answer}` : ''}
      </div>
      <TrackAudioDebugger trackId={t.trackId} {token} />
    {/if}
  {/each}
{/if}
```

`token` est le jeton d'accès déjà utilisé par la page pour ses autres appels admin ; reprendre la variable existante. Importer le composant en tête du `<script>`.

- [ ] **Step 3: Monter le composant dans le catalogue**

Dans `src/routes/(admin)/admin/tracks/+page.svelte`, ajouter sur chaque ligne de titre un bouton « Diagnostiquer l'audio » qui bascule l'affichage du composant pour ce titre :

```svelte
<button onclick={() => (debugId = debugId === t.id ? null : t.id)}>
  Diagnostiquer l'audio
</button>
{#if debugId === t.id}
  <TrackAudioDebugger trackId={t.id} {token} />
{/if}
```

avec `let debugId = $state(null);` dans le `<script>`. Reprendre la variable de jeton déjà présente dans cette page.

- [ ] **Step 4: Vérifier**

Avec `npm run dev`, connecté en `super_admin` :

- sur `/admin/reports`, un report audio affiche un bloc par titre signalé ; « Diagnostiquer » remplit les six étapes
- « Enregistrer » est **désactivé** tant qu'aucune source jouable n'a été trouvée
- sur `/admin/tracks`, le bouton ouvre le même lecteur pour un titre quelconque

- [ ] **Step 5: Lint et commit**

```bash
npx eslint src/lib/components/admin/ "src/routes/(admin)/admin/reports/+page.svelte" "src/routes/(admin)/admin/tracks/+page.svelte"
npx prettier --check --end-of-line auto .
git add src/lib/components/admin/ "src/routes/(admin)/admin/reports/+page.svelte" "src/routes/(admin)/admin/tracks/+page.svelte"
git commit -m "feat(admin): lecteur de diagnostic audio"
```

---

### Task 6: Version 3.6.0

**Files:**

- Modify: `package.json:3`, `src/routes/(site)/+layout.svelte` (ligne du `footer-version-tag`), `src/lib/news.js`

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: package.json**

Ligne 3 : `"version": "3.5.0",` devient `"version": "3.6.0",`.

**Ne pas toucher à `"node-fetch": "^3.3.2"`.** Ne pas faire de rechercher-remplacer global sur un numéro de version.

- [ ] **Step 2: Pied de page**

Dans `src/routes/(site)/+layout.svelte`, `v3.5.0` devient `v3.6.0`.

- [ ] **Step 3: Entrée de nouveautés**

En tête du tableau `NEWS` de `src/lib/news.js`, dans la forme des entrées existantes (clés dans l'ordre `date`, `version`, `tag`, `title`, `items`) :

```js
  {
    date: "2026-08-25",
    version: "3.6.0",
    tag: "Amélioration",
    title: "Signaler un titre muet en deux clics",
    items: [
      "Quand tu n'entends pas la musique, le signalement te laisse désigner le ou les titres concernés, y compris celui de la manche en cours — sans en dévoiler la réponse.",
      "Les autres bugs se signalent toujours librement, avec un motif pour les orienter plus vite.",
    ],
  },
```

- [ ] **Step 4: Vérifier**

```bash
grep -n '"version"' package.json   # 3.6.0
grep -n 'node-fetch' package.json  # ^3.3.2, inchangé
npx vitest run
npx eslint .
```

- [ ] **Step 5: Commit**

```bash
git add package.json "src/routes/(site)/+layout.svelte" src/lib/news.js
git commit -m "chore(release): v3.6.0"
```

---

## Vérification finale

- [ ] `npx vitest run` passe, 16 nouveaux tests
- [ ] `npx eslint .` : 0 error
- [ ] `npx prettier --check --end-of-line auto .` : propre
- [ ] **Pendant une manche active, le payload `start_round` ne contient ni artiste ni titre** — c'est la garantie anti-spoiler
- [ ] Le sélecteur affiche « Manche N — en cours » sans aucun indice sur le morceau
- [ ] Un report audio arrive en base avec `subject='audio'` et `metadata.tracks` rempli
- [ ] Un report d'un autre motif exige un message et n'affiche aucun sélecteur
- [ ] Les deux endpoints admin renvoient 403 sans jeton valide
- [ ] « Enregistrer » reste désactivé tant qu'aucune source jouable n'a été trouvée
