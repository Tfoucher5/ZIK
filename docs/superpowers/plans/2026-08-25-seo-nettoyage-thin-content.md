# Nettoyage SEO du contenu à faible valeur — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer de l'index les pages ZIK sans contenu propre et différencier les pages de room par de la donnée réelle, en réponse au refus AdSense « contenu à faible valeur informative ».

**Architecture:** Trois interventions indépendantes. Le sitemap cesse de publier les archives Zikle et les rooms non officielles. Les pages concernées passent en `noindex`. Les pages de room perdent leur bloc de texte dupliqué au profit de quatre blocs dérivés de la base : règles du mode de jeu, fiche technique, artistes de la playlist, classement hebdomadaire. La logique d'agrégation est isolée dans un module pur testable ; le reste est du chargement Supabase et du rendu Svelte.

**Tech Stack:** SvelteKit 5 (runes), Supabase (supabase-js), Vitest, ESLint + Prettier.

**Spec :** `docs/superpowers/specs/2026-08-25-adsense-nettoyage-thin-content-design.md`

## Global Constraints

- Version cible **3.4.0** (depuis 3.3.2). Ne jamais modifier `"node-fetch": "^3.3.2"` dans `package.json`.
- **Ne jamais afficher un titre de morceau** sur une page publique de room : c'est la réponse du blind test. Seuls les noms d'artistes sont exposés.
- Aucun emplacement publicitaire n'est ajouté, déplacé ni supprimé.
- Aucun contenu rédigé à la main : tout contenu nouveau dérive de la base.
- Svelte 5 runes uniquement (`$props`, `$state`, `$derived`) — pas de stores Svelte 4.
- `npm run lint` doit passer avant tout commit.
- Répondre en français dans l'UI ; pas de commentaire superflu dans le code.

---

### Task 1: Filtrer le sitemap

**Files:**
- Modify: `src/routes/sitemap.xml/+server.js`

**Interfaces:**
- Consumes: rien
- Produces: rien (aucun autre fichier ne dépend de ce module)

- [ ] **Step 1: Retirer le bloc des archives Zikle**

Supprimer entièrement le bloc `try { ... } catch` qui interroge `daily_songs` (lignes ~49-72), commentaire compris.

- [ ] **Step 2: Nettoyer les imports devenus inutiles**

La première ligne devient :

```js
import { supabase } from "$lib/server/config.js";
```

Supprimer la ligne `import { todayParis } from "$lib/zikle/shared.js";`. `getAdminClient` et `todayParis` ne servaient qu'au bloc supprimé.

- [ ] **Step 3: Restreindre les rooms aux officielles**

```js
  const { data: rooms } = await supabase
    .from("rooms")
    .select("code, updated_at")
    .eq("is_public", true)
    .eq("is_official", true)
    .order("last_active_at", { ascending: false })
    .limit(200);
```

- [ ] **Step 4: Vérifier le résultat**

Lancer `npm run dev`, puis :

```bash
curl -s localhost:5173/sitemap.xml > /tmp/sm.xml
grep -c "<url>" /tmp/sm.xml          # attendu : 32
grep -c "zikle/archives/2" /tmp/sm.xml   # attendu : 0
grep -c "/room/" /tmp/sm.xml         # attendu : 17
```

`grep -c` renvoie 0 et un code de sortie 1 quand rien ne correspond : pour la deuxième commande, c'est le résultat voulu.

- [ ] **Step 5: Lint et commit**

```bash
npm run lint
git add src/routes/sitemap.xml/+server.js
git commit -m "fix(seo): sitemap limité aux pages à contenu propre"
```

---

### Task 2: Passer en noindex les pages sans contenu propre

**Files:**
- Modify: `src/routes/(site)/zikle/archives/[date]/+page.svelte:16`
- Modify: `src/routes/(site)/room/[code]/+page.svelte:71`

**Interfaces:**
- Consumes: `data.room.is_official`, déjà fourni par `room/[code]/+page.server.js`
- Produces: rien

- [ ] **Step 1: noindex sur les archives Zikle**

Dans `zikle/archives/[date]/+page.svelte`, remplacer :

```svelte
  <meta name="robots" content="index, follow" />
```

par :

```svelte
  <meta name="robots" content="noindex, follow" />
```

La page est un mur de login pour un visiteur non connecté. `follow` est conservé pour que le lien vers `/zikle` reste suivi.

- [ ] **Step 2: robots conditionnel sur les pages de room**

Dans `room/[code]/+page.svelte`, remplacer :

```svelte
  <meta name="robots" content="index, follow">
```

par :

```svelte
  <meta name="robots" content={room.is_official ? 'index, follow' : 'noindex, follow'}>
```

Ne pas toucher au `<link rel="canonical">` : il reste utile même sur une page non indexée.

- [ ] **Step 3: Vérifier**

Avec `npm run dev` lancé :

```bash
curl -s localhost:5173/room/KDP2G9 | grep 'name="robots"'   # attendu : index, follow
curl -s localhost:5173/zikle/archives/2026-08-20 | grep 'name="robots"'  # attendu : noindex, follow
```

Pour une room non officielle, prendre n'importe quel code hors des 17 officielles et vérifier `noindex, follow`.

- [ ] **Step 4: Lint et commit**

```bash
npm run lint
git add "src/routes/(site)/zikle/archives/[date]/+page.svelte" "src/routes/(site)/room/[code]/+page.svelte"
git commit -m "fix(seo): noindex sur les archives Zikle et les rooms non officielles"
```

---

### Task 3: Module de contenu des rooms (TDD)

**Files:**
- Create: `src/lib/rooms/room-content.js`
- Test: `src/lib/rooms/__tests__/room-content.test.js`

**Interfaces:**
- Consumes: rien
- Produces:
  - `topArtists(tracks, limit = 10) -> Array<{ artist: string, count: number }>`
    où `tracks` est un `Array<{ artist: string | null }>`
  - `modeRules(gameMode: string) -> { label: string, intro: string, rules: string[] }`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/rooms/__tests__/room-content.test.js` :

```js
import { describe, it, expect } from "vitest";
import { topArtists, modeRules } from "../room-content.js";

describe("topArtists", () => {
  it("compte les titres par artiste et trie par fréquence", () => {
    const tracks = [
      { artist: "Booba" },
      { artist: "Nekfeu" },
      { artist: "Booba" },
      { artist: "Booba" },
      { artist: "Nekfeu" },
      { artist: "Orelsan" },
    ];
    expect(topArtists(tracks)).toEqual([
      { artist: "Booba", count: 3 },
      { artist: "Nekfeu", count: 2 },
      { artist: "Orelsan", count: 1 },
    ]);
  });

  it("départage les ex aequo par ordre alphabétique", () => {
    const tracks = [{ artist: "Zaho" }, { artist: "Alpha Wann" }];
    expect(topArtists(tracks).map((a) => a.artist)).toEqual(["Alpha Wann", "Zaho"]);
  });

  it("ignore les artistes vides ou nuls", () => {
    const tracks = [{ artist: "IAM" }, { artist: "" }, { artist: null }, { artist: "   " }];
    expect(topArtists(tracks)).toEqual([{ artist: "IAM", count: 1 }]);
  });

  it("normalise les espaces autour du nom", () => {
    const tracks = [{ artist: "NTM" }, { artist: " NTM " }];
    expect(topArtists(tracks)).toEqual([{ artist: "NTM", count: 2 }]);
  });

  it("limite le nombre de résultats", () => {
    const tracks = Array.from({ length: 20 }, (_, i) => ({ artist: `A${i}` }));
    expect(topArtists(tracks, 3)).toHaveLength(3);
  });

  it("renvoie un tableau vide si aucune donnée", () => {
    expect(topArtists([])).toEqual([]);
  });
});

describe("modeRules", () => {
  it("décrit le mode classique", () => {
    const r = modeRules("classic");
    expect(r.label).toBe("Mode Classique");
    expect(r.rules.length).toBeGreaterThan(0);
  });

  it("décrit le mode QCM", () => {
    const r = modeRules("qcm");
    expect(r.label).toBe("Mode QCM");
    expect(r.rules).not.toEqual(modeRules("classic").rules);
  });

  it("retombe sur le mode classique si le mode est inconnu ou absent", () => {
    expect(modeRules(undefined).label).toBe("Mode Classique");
    expect(modeRules("inexistant").label).toBe("Mode Classique");
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/lib/rooms/__tests__/room-content.test.js`
Expected: FAIL — « Failed to resolve import "../room-content.js" »

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `src/lib/rooms/room-content.js` :

```js
// Contenu affiché sur la fiche publique d'une room.
// On n'expose jamais les titres des morceaux : ce sont les réponses du blind test.

export function topArtists(tracks, limit = 10) {
  const counts = new Map();
  for (const track of tracks ?? []) {
    const name = (track.artist ?? "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count || a.artist.localeCompare(b.artist, "fr"))
    .slice(0, limit);
}

const MODES = {
  classic: {
    label: "Mode Classique",
    intro: "Tu tapes le titre et l'artiste au clavier, le plus vite possible.",
    rules: [
      "Saisie libre : tu écris toi-même le titre et l'artiste",
      "L'orthographe est tolérée, les fautes proches sont acceptées",
      "Plus tu réponds vite, plus tu marques de points",
      "La partie compte pour ton classement ELO",
    ],
  },
  qcm: {
    label: "Mode QCM",
    intro: "Quatre propositions par extrait, tu choisis la bonne.",
    rules: [
      "Quatre réponses proposées à chaque manche",
      "Aucune saisie au clavier : un seul appui suffit",
      "Pas besoin de connaître l'orthographe exacte",
      "Format plus accessible, idéal pour jouer à plusieurs niveaux",
    ],
  },
};

export function modeRules(gameMode) {
  return MODES[gameMode] ?? MODES.classic;
}
```

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run src/lib/rooms/__tests__/room-content.test.js`
Expected: PASS — 9 tests

- [ ] **Step 5: Lint et commit**

```bash
npm run lint
git add src/lib/rooms/room-content.js src/lib/rooms/__tests__/room-content.test.js
git commit -m "feat(rooms): module de contenu des fiches de room"
```

---

### Task 4: Charger la donnée dans le load de la room

**Files:**
- Modify: `src/routes/(site)/room/[code]/+page.server.js`

**Interfaces:**
- Consumes: `topArtists` de `$lib/rooms/room-content.js` (Task 3)
- Produces: le `load` retourne désormais
  `{ room, trackCount: number | null, artists: Array<{artist, count}>, leaderboard: Array<{username, avatar_url, weekly_score, games_count}> }`
  — `room` gagne les champs `max_rounds`, `round_duration`, `playlist_id`.

**Contexte vérifié en base le 2026-08-25 :** la RPC `weekly_leaderboard_by_room` prend le
paramètre `p_room_code` et renvoie les colonnes `username`, `avatar_url`, `weekly_score`,
`games_count` — il n'y a **pas** de colonne de rang, le rang est l'index de la ligne. La
lecture de `custom_playlist_tracks` passe avec le client anon (RLS non bloquante).

- [ ] **Step 1: Réécrire le fichier**

Remplacer intégralement `src/routes/(site)/room/[code]/+page.server.js` par :

```js
import { supabase } from "$lib/server/config.js";
import { error } from "@sveltejs/kit";
import { topArtists } from "$lib/rooms/room-content.js";

async function loadTrackCount(playlistId) {
  if (!playlistId) return null;
  const { data } = await supabase
    .from("custom_playlists")
    .select("track_count")
    .eq("id", playlistId)
    .single();
  return data?.track_count ?? null;
}

async function loadArtists(playlistId) {
  if (!playlistId) return [];
  const { data } = await supabase
    .from("custom_playlist_tracks")
    .select("artist")
    .eq("playlist_id", playlistId);
  return topArtists(data ?? []);
}

async function loadLeaderboard(code) {
  const { data } = await supabase.rpc("weekly_leaderboard_by_room", {
    p_room_code: code,
  });
  return data ?? [];
}

export async function load({ params, setHeaders }) {
  const code = params.code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select(
      "code, name, emoji, description, is_public, is_official, game_mode, max_rounds, round_duration, playlist_id, last_active_at, profiles!owner_id(username)",
    )
    .eq("code", code)
    .eq("is_public", true)
    .single();

  if (!room) throw error(404, "Room introuvable ou privée");

  const [trackCount, artists, leaderboard] = await Promise.all([
    loadTrackCount(room.playlist_id),
    loadArtists(room.playlist_id),
    loadLeaderboard(room.code),
  ]);

  setHeaders({ "cache-control": "public, max-age=600" });

  return { room, trackCount, artists, leaderboard };
}
```

Chaque helper renvoie une valeur neutre si Supabase échoue : un bloc manquant masque sa
section sans casser la page.

- [ ] **Step 2: Vérifier le chargement**

Avec `npm run dev` lancé, ouvrir `http://localhost:5173/room/KDP2G9` dans un navigateur.
La page doit s'afficher normalement (les nouveaux blocs n'existent pas encore, c'est la
Task 5 qui les ajoute). Vérifier l'absence d'erreur dans le terminal du serveur.

- [ ] **Step 3: Lint et commit**

```bash
npm run lint
git add "src/routes/(site)/room/[code]/+page.server.js"
git commit -m "feat(rooms): charge playlist, artistes et classement hebdo"
```

---

### Task 5: Remplacer le bloc dupliqué par les blocs différenciés

**Files:**
- Modify: `src/routes/(site)/room/[code]/+page.svelte`

**Interfaces:**
- Consumes: `{ room, trackCount, artists, leaderboard }` du `load` (Task 4) ; `modeRules` de `$lib/rooms/room-content.js` (Task 3)
- Produces: rien

- [ ] **Step 1: Importer modeRules et exposer les nouvelles données**

Le haut du `<script>` doit devenir :

```js
  import { onMount } from 'svelte';
  import { modeRules } from '$lib/rooms/room-content.js';

  let { data } = $props();
  const { room, trackCount, artists, leaderboard } = data;
  const mode = modeRules(room.game_mode);
```

L'import rejoint celui d'`onMount` en tête de bloc ; la déstructuration existante
`const { room } = data;` est étendue aux trois nouvelles clés. Le reste du `<script>`
est inchangé.

- [ ] **Step 2: Supprimer le bloc SEO dupliqué**

Supprimer intégralement la section suivante du markup (commentaire compris) :

```svelte
  <!-- SEO content block (visible and useful to users too) -->
  <section class="room-seo-block">
    ...
  </section>
```

- [ ] **Step 3: Ajouter les blocs différenciés**

À la place de la section supprimée, insérer :

```svelte
  <section class="room-info">
    <div class="room-info-card">
      <h2>{mode.label}</h2>
      <p class="room-info-intro">{mode.intro}</p>
      <ul class="room-rules">
        {#each mode.rules as rule (rule)}
          <li>{rule}</li>
        {/each}
      </ul>
    </div>

    <div class="room-info-card">
      <h2>La partie en bref</h2>
      <dl class="room-specs">
        <div><dt>Manches</dt><dd>{room.max_rounds}</dd></div>
        <div><dt>Par manche</dt><dd>{room.round_duration} s</dd></div>
        {#if trackCount}
          <div><dt>Titres en jeu</dt><dd>{trackCount}</dd></div>
        {/if}
      </dl>
      <p class="room-info-foot">
        <a href="/docs">Comment ça marche ?</a>
      </p>
    </div>

    {#if artists.length}
      <div class="room-info-card">
        <h2>Artistes les plus présents</h2>
        <ul class="room-artists">
          {#each artists as a (a.artist)}
            <li><span class="ra-name">{a.artist}</span><span class="ra-count">{a.count}</span></li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if leaderboard.length}
      <div class="room-info-card">
        <h2>Classement de la semaine</h2>
        <ol class="room-lb">
          {#each leaderboard as p, i (p.username)}
            <li>
              <span class="lb-rank">{i + 1}</span>
              <span class="lb-name">{p.username}</span>
              <span class="lb-score">{p.weekly_score}</span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}
  </section>
```

- [ ] **Step 4: Remplacer le CSS du bloc supprimé**

Supprimer les règles `.room-seo-block` et ses descendants (`.room-seo-block h2`, `ol`, `p`,
`a`, `a:hover`), puis ajouter à la fin du `<style>` :

```css
  /* ── Fiche d'information ── */
  .room-info {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 clamp(16px, 5vw, 80px) 80px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    align-items: start;
  }
  .room-info-card {
    background: var(--surface, rgb(var(--c-glass) / 0.04));
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 16px;
    padding: 22px;
  }
  .room-info-card h2 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 12px;
    color: var(--text, #f1f5f9);
  }
  .room-info-intro {
    font-size: 0.9rem;
    color: var(--mid, #94a3b8);
    line-height: 1.6;
    margin: 0 0 12px;
  }
  .room-rules {
    margin: 0;
    padding-left: 18px;
    color: var(--mid, #94a3b8);
    font-size: 0.88rem;
    line-height: 1.7;
  }
  .room-specs {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .room-specs > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    padding-bottom: 6px;
  }
  .room-specs dt {
    color: var(--dim, #64748b);
    font-size: 0.85rem;
  }
  .room-specs dd {
    margin: 0;
    color: var(--text, #f1f5f9);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .room-info-foot {
    margin: 14px 0 0;
    font-size: 0.82rem;
  }
  .room-info-foot a {
    color: var(--accent);
    text-decoration: none;
  }
  .room-info-foot a:hover { text-decoration: underline; }

  .room-artists {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .room-artists li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.88rem;
  }
  .ra-name { color: var(--text, #f1f5f9); }
  .ra-count { color: var(--dim, #64748b); }

  .room-lb {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    counter-reset: none;
  }
  .room-lb li {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 10px;
    font-size: 0.88rem;
  }
  .lb-rank {
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
  }
  .lb-name {
    color: var(--text, #f1f5f9);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lb-score { color: var(--mid, #94a3b8); font-weight: 600; }
```

- [ ] **Step 5: Vérifier la différenciation et l'absence de spoiler**

Avec `npm run dev` lancé :

```bash
curl -s localhost:5173/room/KDP2G9 > /tmp/classic.html   # Rap FR, classic
curl -s localhost:5173/room/U5N9N9 > /tmp/casual.html    # RAP FR - Casual, qcm

grep -c "Mode Classique" /tmp/classic.html   # attendu : au moins 1
grep -c "Mode QCM" /tmp/casual.html          # attendu : au moins 1
grep -c "Comment jouer au blind test" /tmp/classic.html  # attendu : 0
```

Vérifier ensuite dans un navigateur que `/room/KDP2G9` affiche : les règles du mode
classique, 10 manches, 30 s, 586 titres, une liste d'artistes, et le classement de la
semaine s'il existe des résultats.

**Contrôle anti-spoiler.** Prendre trois titres réels de la playlist depuis
`/admin/playlists`, et vérifier qu'aucun n'apparaît dans `/tmp/classic.html`. Aucun titre
de morceau ne doit être présent dans le HTML.

- [ ] **Step 6: Lint et commit**

```bash
npm run lint
git add "src/routes/(site)/room/[code]/+page.svelte"
git commit -m "feat(rooms): fiche de room différenciée (règles, specs, artistes, classement)"
```

---

### Task 6: Passer en version 3.4.0

**Files:**
- Modify: `package.json:3`
- Modify: `src/routes/(site)/+layout.svelte:227`
- Modify: `src/lib/news.js`

**Interfaces:**
- Consumes: rien
- Produces: rien

- [ ] **Step 1: package.json**

Ligne 3 uniquement : `"version": "3.3.2",` devient `"version": "3.4.0",`.

**Ne pas toucher à la ligne 20** (`"node-fetch": "^3.3.2"`). Ne pas faire de
rechercher-remplacer global sur `3.3.2`.

- [ ] **Step 2: Pied de page**

Dans `src/routes/(site)/+layout.svelte` ligne 227, `v3.3.2` devient `v3.4.0`.

- [ ] **Step 3: Entrée de nouveautés**

Dans `src/lib/news.js`, ajouter en tête du tableau `NEWS` (avant l'entrée 3.3.2), en
respectant la forme des entrées existantes :

```js
  {
    date: "2026-08-25",
    version: "3.4.0",
    tag: "Amélioration",
    title: "Fiches de room enrichies",
    items: [
      "Chaque room affiche désormais ses règles, son nombre de manches et les artistes les plus présents dans sa playlist",
      "Le classement de la semaine est visible directement sur la page de la room",
      "Nettoyage des pages sans contenu propre pour améliorer le référencement",
    ],
  },
```

La forme est celle des entrées existantes, vérifiée dans le fichier : les clés
apparaissent dans l'ordre `date`, `version`, `tag`, `title`, `items`, et la liste est
ordonnée de la plus récente à la plus ancienne.

- [ ] **Step 4: Vérifier**

```bash
grep -n '"version"' package.json          # attendu : 3.4.0
grep -n 'node-fetch' package.json         # attendu : ^3.3.2, inchangé
npm run lint
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add package.json "src/routes/(site)/+layout.svelte" src/lib/news.js
git commit -m "chore(release): v3.4.0"
```

---

## Vérification finale

Avant d'ouvrir la PR, dérouler la section « Vérification » de la spec :

- [ ] `npm run lint` passe
- [ ] `npx vitest run` passe
- [ ] `/sitemap.xml` : 32 URL, aucune `zikle/archives/<date>`, 17 rooms
- [ ] Room officielle : `index, follow` — room non officielle : `noindex, follow`
- [ ] `/zikle/archives/<date>` : `noindex, follow`
- [ ] Plus aucune occurrence de « Comment jouer au blind test » sur une page de room
- [ ] `KDP2G9` et `U5N9N9` affichent deux jeux de règles différents
- [ ] Une room officielle affiche titres, artistes et classement
- [ ] **Aucun titre de morceau dans le HTML d'une page de room**

Puis, après merge et déploiement : demander un nouvel examen dans le dashboard AdSense et
soumettre le sitemap dans la Search Console.
