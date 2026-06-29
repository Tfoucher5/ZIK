# Code Cleanup & Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraire des composants réutilisables, modulariser game.js, et nettoyer le code mort dans tous les fichiers — sans changer aucun comportement.

**Architecture:** Phase 1 crée les composants globaux manquants. Phase 2 découpe game.js en modules. Phase 3 applique les composants aux pages dans l'ordre décroissant de taille, en supprimant le code mort au passage.

**Tech Stack:** SvelteKit 5 (Svelte 5 runes), Node.js, Socket.io

## Global Constraints

- Aucun changement de comportement — refactoring pur
- Svelte 5 runes uniquement : `$state`, `$derived`, `$effect`, `$props` — pas de stores Svelte 4
- CSS scoped dans `<style>` du composant, jamais de styles inline sauf valeurs dynamiques
- `npm run lint && npm test` doit passer avant chaque commit
- Vérification visuelle dans le navigateur avant chaque commit
- Un commit par tâche terminée
- Branche de travail : `refactor/code-cleanup` — pas de merge sur master avant validation complète

---

## Fichiers créés / modifiés

**Créés :**

- `src/lib/toast.svelte.js` — état global du toast (Svelte 5 module-level state)
- `src/lib/components/Toast.svelte` — affichage du toast, placé dans le layout
- `src/lib/components/Modal.svelte` — wrapper générique overlay + backdrop
- `src/lib/components/TabBar.svelte` — barre d'onglets réutilisable
- `src/lib/components/Avatar.svelte` — avatar avec fallback dicebear
- `src/lib/components/LoadMore.svelte` — bouton "charger plus"
- `src/lib/components/EmptyState.svelte` — état vide générique
- `src/lib/server/socket/game/config.js` — constantes + feature flags
- `src/lib/server/socket/game/chat.js` — gestion historique chat
- `src/lib/server/socket/game/scoring.js` — calcul scores QCM et speed bonus
- `src/lib/server/socket/game/audio.js` — gestion ytdl, sélection pistes
- `src/lib/server/socket/game/core.js` — boucle de jeu, événements Socket.io, admin
- `src/lib/server/socket/game/index.js` — point d'entrée, ré-exporte `register`

**Modifiés :**

- `src/routes/(site)/+layout.svelte` — importe `Toast.svelte`
- `src/lib/components/AuthModal.svelte` — utilise `Modal.svelte`
- `src/lib/components/ContactModal.svelte` — utilise `Modal.svelte`
- `src/lib/components/ReportModal.svelte` — utilise `Modal.svelte`
- `src/routes/(site)/settings/+page.svelte` — utilise `toast` centralisé, supprime toast inline
- `src/routes/(site)/classements/+page.svelte` — utilise `TabBar`, `LoadMore`, `EmptyState`
- `src/routes/(site)/playlists/+page.svelte` — extraction composants + code mort
- `src/routes/(site)/+page.svelte` — extraction composants + code mort
- `src/routes/(site)/game/+page.svelte` — extraction composants + code mort
- Tous les autres fichiers de routes — suppression code mort, CSS orphelin

---

## Task 0 : Setup Vitest + workflow CI tests

**Files:**

- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/lib/server/socket/game/__tests__/scoring.test.js`
- Create: `src/lib/server/socket/game/__tests__/chat.test.js`
- Create: `.github/workflows/test.yml`

**Interfaces:**

- Produit: commande `npm test` opérationnelle
- Produit: workflow GitHub `test.yml` qui bloque le merge si les tests échouent

- [ ] **Installer Vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Créer `vitest.config.js`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.js"],
  },
});
```

- [ ] **Ajouter le script `test` dans `package.json`**

```json
"scripts": {
  "dev": "vite dev",
  "build": "node scripts/ensure-ytdlp.mjs && vite build",
  "start": "node server.js",
  "preview": "vite preview",
  "lint": "eslint . && prettier --check .",
  "test": "vitest run"
}
```

- [ ] **Créer `.github/workflows/test.yml`**

```yaml
name: Tests

on:
  push:
    branches: [main, master, refactor/code-cleanup]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

- [ ] **Créer `src/lib/__tests__/smoke.test.js`** (test de smoke qui passe immédiatement pour valider le setup)

```js
import { describe, it, expect } from "vitest";
import { esc, dicebear } from "../utils.js";

describe("utils", () => {
  it("esc échappe les caractères HTML", () => {
    expect(esc("<b>test</b>")).toBe("&lt;b&gt;test&lt;/b&gt;");
    expect(esc('"quoted"')).toBe("&quot;quoted&quot;");
    expect(esc("a & b")).toBe("a &amp; b");
  });

  it("dicebear retourne une URL avec le seed encodé", () => {
    const url = dicebear("Alice");
    expect(url).toContain("Alice");
    expect(url).toMatch(/^https:\/\/api\.dicebear\.com/);
  });
});
```

- [ ] **Vérifier que `npm test` passe**

```bash
npm test
```

Expected : `2 tests passed` — le setup Vitest fonctionne.

- [ ] **Commit**

```bash
git add vitest.config.js package.json package-lock.json .github/workflows/test.yml src/lib/__tests__/smoke.test.js
git commit -m "test: setup Vitest with smoke test, add CI test workflow"
```

---

## Task 1 : Toast centralisé

**Files:**

- Create: `src/lib/toast.svelte.js`
- Create: `src/lib/components/Toast.svelte`
- Modify: `src/routes/(site)/+layout.svelte`

**Interfaces:**

- Produit: `toast(msg: string, type?: string): void` — importable depuis n'importe quelle page
- Produit: `toastState: { msg: string, type: string }` — lu par `Toast.svelte`

- [ ] **Créer `src/lib/toast.svelte.js`**

```js
let _msg = $state("");
let _type = $state("");
let _timer = null;

export const toastState = {
  get msg() {
    return _msg;
  },
  get type() {
    return _type;
  },
};

export function toast(msg, type = "") {
  clearTimeout(_timer);
  _msg = msg;
  _type = type;
  _timer = setTimeout(() => {
    _msg = "";
  }, 3200);
}
```

- [ ] **Créer `src/lib/components/Toast.svelte`**

```svelte
<script>
  import { toastState } from '$lib/toast.svelte.js';
</script>

{#if toastState.msg}
  <div class="toast toast--{toastState.type}" role="status" aria-live="polite">
    {toastState.msg}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 30, 40, 0.95);
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.95rem;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.08);
    white-space: nowrap;
    animation: toast-in 0.2s ease;
  }
  .toast--success { border-color: rgba(62, 207, 255, 0.4); }
  .toast--error   { border-color: rgba(255, 80, 80, 0.4); }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
</style>
```

- [ ] **Ajouter `Toast.svelte` dans `src/routes/(site)/+layout.svelte`**

Ajouter l'import en haut du `<script>` :

```js
import Toast from "$lib/components/Toast.svelte";
```

Ajouter avant la fermeture du template (après `{@render children()}`) :

```svelte
<Toast />
```

- [ ] **Vérifier visuellement** : déclencher un toast depuis settings (lier Discord, etc.) — s'affiche correctement

- [ ] **Commit**

```bash
git add src/lib/toast.svelte.js src/lib/components/Toast.svelte src/routes/(site)/+layout.svelte
git commit -m "refactor: add centralized Toast component"
```

---

## Task 2 : Supprimer les toasts inline de `settings/+page.svelte`

**Files:**

- Modify: `src/routes/(site)/settings/+page.svelte`

**Interfaces:**

- Consomme: `toast(msg, type)` depuis `$lib/toast.svelte.js`

- [ ] **Remplacer le toast inline dans `settings/+page.svelte`**

En haut du `<script>`, ajouter :

```js
import { toast } from "$lib/toast.svelte.js";
```

Supprimer ces lignes :

```js
let toastMsg = $state("");
let toastType = $state("");
let _toastTimer = null;
// Et la fonction :
function toast(msg, type = "") {
  clearTimeout(_toastTimer);
  toastMsg = msg;
  toastType = type;
  _toastTimer = setTimeout(() => {
    toastMsg = "";
  }, 3200);
}
```

Supprimer dans `onDestroy` : `clearTimeout(_toastTimer)` (supprimer `onDestroy` si c'est le seul contenu, sinon juste supprimer cette ligne).

Supprimer dans le template le bloc HTML du toast (chercher `toastMsg` dans le template et supprimer le `{#if toastMsg}...{/if}`).

- [ ] **Lancer `npm run lint`** — 0 erreur

- [ ] **Vérifier visuellement** : lier/délier Discord → toast s'affiche toujours

- [ ] **Commit**

```bash
git add src/routes/(site)/settings/+page.svelte
git commit -m "refactor(settings): use centralized toast, remove inline toast"
```

---

## Task 3 : `Modal.svelte` générique

**Files:**

- Create: `src/lib/components/Modal.svelte`

**Interfaces:**

- Props: `open: boolean`, `onClose: () => void`, `maxWidth?: string` (défaut `'440px'`)
- Produit: slot `{@render children()}` pour le contenu interne

- [ ] **Créer `src/lib/components/Modal.svelte`**

```svelte
<script>
  let { open, onClose, maxWidth = '440px', children } = $props();
</script>

{#if open}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  onclick={e => { if (e.target === e.currentTarget) onClose(); }}
>
  <div class="modal-box" style="max-width: {maxWidth}">
    <button class="modal-close" onclick={onClose} aria-label="Fermer">✕</button>
    {@render children()}
  </div>
</div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  .modal-box {
    width: 100%;
    background: #1a1a2e;
    border-radius: 16px;
    padding: 32px;
    position: relative;
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: rgba(255,255,255,0.5);
    line-height: 1;
    padding: 4px;
    transition: color 0.15s;
  }
  .modal-close:hover { color: #fff; }
</style>
```

- [ ] **Lancer `npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/lib/components/Modal.svelte
git commit -m "refactor: add generic Modal component"
```

---

## Task 4 : Migrer `AuthModal.svelte` vers `Modal.svelte`

**Files:**

- Modify: `src/lib/components/AuthModal.svelte`

**Interfaces:**

- Consomme: `Modal.svelte` (open, onClose, maxWidth)
- Props inchangées : `sb`, `open`, `view`, `onClose`, `onSuccess`

- [ ] **Modifier `AuthModal.svelte`**

Ajouter l'import :

```js
import Modal from "$lib/components/Modal.svelte";
```

Remplacer le bloc `{#if open}...<div id="auth-modal" class="overlay"...>...<div class="modal"...>` par :

```svelte
<Modal {open} onClose={close} maxWidth="400px">
  <!-- contenu existant du modal (sans le div.overlay et div.modal) -->
  <button class="close-btn" ...> ← À SUPPRIMER (Modal.svelte fournit le bouton close)
  ...
</Modal>
```

Supprimer du `<style>` les règles `#auth-modal` (overlay) et `.modal` (box) et `.close-btn` — elles sont gérées par `Modal.svelte`. Garder tout le reste (`.btn-google`, `.field`, `.alert-err`, etc.).

- [ ] **Vérifier visuellement** : ouvrir le modal auth → s'affiche, fermeture au clic extérieur et bouton ✕ fonctionnels

- [ ] **Lancer `npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/lib/components/AuthModal.svelte
git commit -m "refactor(AuthModal): use Modal wrapper"
```

---

## Task 5 : Migrer `ContactModal.svelte` et `ReportModal.svelte`

**Files:**

- Modify: `src/lib/components/ContactModal.svelte`
- Modify: `src/lib/components/ReportModal.svelte`

- [ ] **Lire `ContactModal.svelte`** et identifier le chrome modal (overlay + box + close btn)

- [ ] **Remplacer le chrome** dans `ContactModal.svelte` par `<Modal {open} {onClose}>...</Modal>` (même pattern que Task 4). Supprimer les styles overlay/box/close devenus redondants.

- [ ] **Lire `ReportModal.svelte`** et appliquer le même remplacement

- [ ] **Vérifier visuellement** : ouvrir Contact et Report modals — fermeture au clic extérieur et bouton ✕ fonctionnels

- [ ] **Lancer `npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/lib/components/ContactModal.svelte src/lib/components/ReportModal.svelte
git commit -m "refactor: migrate ContactModal and ReportModal to Modal wrapper"
```

---

## Task 6 : `TabBar.svelte`, `Avatar.svelte`

**Files:**

- Create: `src/lib/components/TabBar.svelte`
- Create: `src/lib/components/Avatar.svelte`

- [ ] **Créer `src/lib/components/TabBar.svelte`**

```svelte
<script>
  let { tabs, active, onChange } = $props();
</script>

<div class="tab-bar" role="tablist">
  {#each tabs as tab (tab.id)}
    <button
      role="tab"
      class="tab"
      class:active={active === tab.id}
      aria-selected={active === tab.id}
      onclick={() => onChange(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tab-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tab {
    padding: 8px 18px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent;
    color: rgba(255,255,255,0.6);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .tab:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
  .tab.active {
    background: rgba(62, 207, 255, 0.15);
    border-color: rgba(62, 207, 255, 0.5);
    color: #3ecfff;
  }
</style>
```

- [ ] **Créer `src/lib/components/Avatar.svelte`**

```svelte
<script>
  import { dicebear } from '$lib/utils.js';
  let { url = null, username, size = 40 } = $props();
  const src = $derived(url || dicebear(username || '?'));
</script>

<img
  {src}
  alt={username}
  width={size}
  height={size}
  class="avatar"
  style="width:{size}px;height:{size}px"
/>

<style>
  .avatar {
    border-radius: 50%;
    object-fit: cover;
    display: block;
    flex-shrink: 0;
  }
</style>
```

- [ ] **Lancer `npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/lib/components/TabBar.svelte src/lib/components/Avatar.svelte
git commit -m "refactor: add TabBar and Avatar components"
```

---

## Task 7 : `LoadMore.svelte`, `EmptyState.svelte`

**Files:**

- Create: `src/lib/components/LoadMore.svelte`
- Create: `src/lib/components/EmptyState.svelte`

- [ ] **Créer `src/lib/components/LoadMore.svelte`**

```svelte
<script>
  let { loading = false, hasMore = false, onLoad } = $props();
</script>

{#if hasMore}
  <div class="load-more-wrap">
    <button class="load-more-btn" onclick={onLoad} disabled={loading}>
      {loading ? 'Chargement…' : 'Charger plus'}
    </button>
  </div>
{/if}

<style>
  .load-more-wrap {
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }
  .load-more-btn {
    padding: 10px 28px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.15);
    background: transparent;
    color: rgba(255,255,255,0.7);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .load-more-btn:hover:not(:disabled) {
    border-color: rgba(62,207,255,0.4);
    color: #3ecfff;
  }
  .load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Créer `src/lib/components/EmptyState.svelte`**

```svelte
<script>
  let { icon = '🎵', title, description = '' } = $props();
</script>

<div class="empty-state">
  <span class="empty-icon">{icon}</span>
  <p class="empty-title">{title}</p>
  {#if description}<p class="empty-desc">{description}</p>{/if}
</div>

<style>
  .empty-state {
    text-align: center;
    padding: 48px 20px;
    color: rgba(255,255,255,0.4);
  }
  .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 12px; }
  .empty-title { font-size: 1rem; font-weight: 600; color: rgba(255,255,255,0.6); margin: 0 0 6px; }
  .empty-desc { font-size: 0.875rem; margin: 0; }
</style>
```

- [ ] **Lancer `npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/lib/components/LoadMore.svelte src/lib/components/EmptyState.svelte
git commit -m "refactor: add LoadMore and EmptyState components"
```

---

## Task 8 : Modulariser `src/lib/server/socket/game.js`

**Files:**

- Create: `src/lib/server/socket/game/config.js`
- Create: `src/lib/server/socket/game/chat.js`
- Create: `src/lib/server/socket/game/scoring.js`
- Create: `src/lib/server/socket/game/audio.js`
- Create: `src/lib/server/socket/game/core.js`
- Create: `src/lib/server/socket/game/index.js`
- Supprimer (à la fin): `src/lib/server/socket/game.js`

**Interfaces:**

- `index.js` exporte: `register(io)`, `adminUnblockRoom`, `adminCloseRoom`, `adminGetChatHistory`, `adminSendChat`, `adminKickPlayer`
- Tout le reste (fichier game.js) est consommateur interne

### 8a — Tests TDD (écrire d'abord, avant d'implémenter)

- [ ] **Créer `src/lib/server/socket/game/__tests__/scoring.test.js`**

```js
import { describe, it, expect } from "vitest";
import { calcQcmPoints } from "../scoring.js";

describe("calcQcmPoints", () => {
  it("retourne le score max pour une réponse immédiate", () => {
    expect(calcQcmPoints(0, 30)).toBe(1000);
  });
  it("retourne le score min pour une réponse en fin de timer", () => {
    expect(calcQcmPoints(30, 30)).toBe(200);
  });
  it("retourne une valeur intermédiaire pour une réponse à mi-temps", () => {
    const pts = calcQcmPoints(15, 30);
    expect(pts).toBeGreaterThan(200);
    expect(pts).toBeLessThan(1000);
  });
  it("ne dépasse jamais 1000", () => {
    expect(calcQcmPoints(-5, 30)).toBe(1000);
  });
  it("ne descend jamais sous 200", () => {
    expect(calcQcmPoints(99, 30)).toBe(200);
  });
});
```

- [ ] **Créer `src/lib/server/socket/game/__tests__/chat.test.js`**

```js
import { describe, it, expect, beforeEach, vi } from "vitest";

const chatHistories = {};
vi.mock("../../state.js", () => ({ chatHistories }));

import { getChatHistory, addChatMessage } from "../chat.js";

describe("getChatHistory", () => {
  beforeEach(() => {
    Object.keys(chatHistories).forEach((k) => delete chatHistories[k]);
  });

  it("crée un historique vide pour une room inconnue", () => {
    const h = getChatHistory("room-1");
    expect(h.messages).toEqual([]);
  });
  it("retourne le même objet pour la même room", () => {
    expect(getChatHistory("room-1")).toBe(getChatHistory("room-1"));
  });
});

describe("addChatMessage", () => {
  beforeEach(() => {
    Object.keys(chatHistories).forEach((k) => delete chatHistories[k]);
  });

  it("ajoute un message à l'historique", () => {
    const msg = { name: "Alice", text: "Salut", ts: Date.now() };
    addChatMessage("room-1", msg);
    expect(getChatHistory("room-1").messages).toHaveLength(1);
    expect(getChatHistory("room-1").messages[0]).toBe(msg);
  });
  it("limite l'historique à 50 messages max", () => {
    for (let i = 0; i < 55; i++)
      addChatMessage("room-1", { name: "u", text: `msg${i}`, ts: i });
    expect(getChatHistory("room-1").messages.length).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Vérifier que les tests échouent** (red — modules pas encore créés)

```bash
npm test
```

Expected : tests scoring et chat échouent avec "Cannot find module '../scoring.js'" et "../chat.js". C'est le signal TDD correct.

### 8b — `config.js`

- [ ] **Créer `src/lib/server/socket/game/config.js`**

Déplacer depuis `game.js` :

```js
export const DEFAULT_ROUND_DURATION = 30;
export const DEFAULT_BREAK_DURATION = 7;
export const AUTO_START_DELAY = 5;
export const CHAT_MAX_MESSAGES = 50;
export const CHAT_CLEAR_DELAY = 30 * 60 * 1000;

export const GAME_FEATURES = {
  hints: true,
  extraAnswers: true,
  streakBonus: true,
  achievements: true,
  eloRanked: true,
};
```

### 8b — `chat.js`

- [ ] **Créer `src/lib/server/socket/game/chat.js`**

Déplacer depuis `game.js` les fonctions : `getChatHistory`, `scheduleChatClear`, `cancelChatClear`.
Déplacer la Map `autoStartCountdowns` ici aussi si elle sert au chat, sinon dans `core.js`.

```js
import { CHAT_MAX_MESSAGES, CHAT_CLEAR_DELAY } from './config.js';
import { chatHistories } from '../../state.js';

export function getChatHistory(roomId) { ... }
export function scheduleChatClear(roomId) { ... }
export function cancelChatClear(roomId) { ... }
export function addChatMessage(roomId, message) {
  const h = getChatHistory(roomId);
  h.messages.push(message);
  if (h.messages.length > CHAT_MAX_MESSAGES) h.messages.shift();
}
```

### 8c — `scoring.js`

- [ ] **Créer `src/lib/server/socket/game/scoring.js`**

Déplacer depuis `game.js` : `makeChoices`, `calcQcmPoints`.
Déplacer aussi `calcSpeedBonus` (importé depuis services/playlist.js — vérifier si c'est réexporté ou appelé ici).

```js
export function makeChoices(correct, allTracks) { ... }
export function calcQcmPoints(timeTaken, roundDuration) { ... }
```

### 8d — `audio.js`

- [ ] **Créer `src/lib/server/socket/game/audio.js`**

Isoler dans ce fichier toutes les fonctions liées à :

- La résolution des URLs audio (appels ytdl, cache `ytdlAudioCache`)
- La sélection et le shuffle des pistes pour une session
- Les fonctions `getYtAudioUrl`, `buildTrack` (si appelées depuis game.js)

```js
import { ytdlAudioCache } from '../../ytdlCache.js';
import { YTDLP_BIN, YTDL_TTL, getYtAudioUrl } from '../../ytdlAudio.js';
import { buildTrack } from '../services/playlist.js';

export async function resolveAudioUrl(track) { ... }
export function buildSessionPlaylist(tracks, maxRounds) { ... }
```

### 8e — `core.js`

- [ ] **Créer `src/lib/server/socket/game/core.js`**

Contient tout le reste de `game.js` : `getOrCreateRoom`, `register(io)`, tous les handlers Socket.io, les fonctions admin (`adminUnblockRoom`, `adminCloseRoom`, etc.), `sanitizePlayer`.

Imports depuis les modules locaux :

```js
import {
  DEFAULT_ROUND_DURATION,
  DEFAULT_BREAK_DURATION,
  AUTO_START_DELAY,
  GAME_FEATURES,
} from "./config.js";
import {
  getChatHistory,
  addChatMessage,
  scheduleChatClear,
  cancelChatClear,
} from "./chat.js";
import { makeChoices, calcQcmPoints } from "./scoring.js";
import { resolveAudioUrl, buildSessionPlaylist } from "./audio.js";
```

### 8f — `index.js`

- [ ] **Créer `src/lib/server/socket/game/index.js`**

```js
export {
  register,
  adminUnblockRoom,
  adminCloseRoom,
  adminGetChatHistory,
  adminSendChat,
  adminKickPlayer,
} from "./core.js";
```

### 8g — Mettre à jour les imports et supprimer l'ancien fichier

- [ ] **Chercher tous les fichiers qui importent `game.js`** :

```bash
grep -r "socket/game" src/ --include="*.js" -l
```

- [ ] **Mettre à jour chaque import** de `'../socket/game.js'` → `'../socket/game/index.js'` (ou `'../socket/game'`)

- [ ] **Tester le serveur** : `node server.js` — démarrage sans erreur

- [ ] **Tester une partie complète** : rejoindre une room, jouer 2 rounds, terminer — scores corrects

- [ ] **Supprimer `src/lib/server/socket/game.js`** (uniquement après test OK)

- [ ] **Commit**

```bash
git add src/lib/server/socket/game/ src/lib/server/socket/game.js
git commit -m "refactor(game): split game.js into modular files (config, chat, scoring, audio, core)"
```

---

## Task 9 : Refactoring `classements/+page.svelte`

**Files:**

- Modify: `src/routes/(site)/classements/+page.svelte`

Cible prioritaire car illustre bien les patterns des autres pages.

- [ ] **Lire le fichier complet**

- [ ] **Remplacer la barre d'onglets** ("ELO" / "Score") par `<TabBar>` :

```svelte
<script>
  import TabBar from '$lib/components/TabBar.svelte';
  // ...
  const TABS = [
    { id: 'elo', label: 'ELO' },
    { id: 'score', label: 'Score' },
  ];
</script>

<TabBar tabs={TABS} active={activeTab} onChange={id => { activeTab = id; }} />
```

Supprimer le HTML des onglets inline et les styles associés.

- [ ] **Remplacer les boutons "Charger plus"** (loadMoreElo / loadMoreScore) par `<LoadMore>` :

```svelte
import LoadMore from '$lib/components/LoadMore.svelte';

<LoadMore loading={eloLoading} hasMore={eloHasMore} onLoad={loadMoreElo} />
<LoadMore loading={scoreLoading} hasMore={scoreHasMore} onLoad={loadMoreScore} />
```

Supprimer les boutons inline et leurs styles.

- [ ] **Remplacer les états vides** ("Aucun résultat") par `<EmptyState>` :

```svelte
import EmptyState from '$lib/components/EmptyState.svelte';

{#if eloData.length === 0 && !eloLoading}
  <EmptyState icon="🏆" title="Aucun joueur pour l'instant" />
{/if}
```

- [ ] **Supprimer le code mort** : variables `$state` déclarées mais jamais lues dans le template, imports non utilisés, fonctions jamais appelées

- [ ] **Vérifier visuellement** : classements ELO et Score, pagination, onglets — comportement identique

- [ ] **`npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/routes/(site)/classements/+page.svelte
git commit -m "refactor(classements): use TabBar, LoadMore, EmptyState, remove dead code"
```

---

## Task 10 : Refactoring `settings/+page.svelte` — modal suppression compte

**Files:**

- Modify: `src/routes/(site)/settings/+page.svelte`

- [ ] **Lire le fichier complet**

- [ ] **Remplacer le modal de suppression de compte** par `<Modal>` :

```svelte
import Modal from '$lib/components/Modal.svelte';

<Modal open={deleteModalOpen} onClose={closeDeleteModal}>
  <!-- contenu du modal de suppression -->
</Modal>
```

Supprimer le chrome overlay/box du modal inline et ses styles associés.

- [ ] **Supprimer le code mort** : variables et fonctions non utilisées, CSS orphelin

- [ ] **Vérifier visuellement** : modal suppression de compte s'ouvre/ferme correctement, clic extérieur ferme

- [ ] **`npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/routes/(site)/settings/+page.svelte
git commit -m "refactor(settings): use Modal for delete account, remove dead code"
```

---

## Task 11 : Refactoring `playlists/+page.svelte` (1858L)

**Files:**

- Modify: `src/routes/(site)/playlists/+page.svelte`
- Create: `src/routes/(site)/playlists/TrackRow.svelte`
- Create: `src/routes/(site)/playlists/TrackSearch.svelte`

- [ ] **Lire le fichier complet** pour identifier les blocs extractibles

- [ ] **Extraire `TrackRow.svelte`** : la ligne d'un titre dans une playlist (titre, artiste, cover, boutons supprimer/réordonner). Props : `track`, `onRemove`, `onMoveUp`, `onMoveDown`

- [ ] **Extraire `TrackSearch.svelte`** : le formulaire de recherche (Deezer/Spotify/manuel) avec ses résultats. Props : `onAdd: (track) => void`

- [ ] **Remplacer les états vides** par `<EmptyState>`

- [ ] **Remplacer les toasts inline** par `toast()` centralisé (si pas encore fait)

- [ ] **Supprimer le code mort** : variables `$state` non lues, fonctions jamais appelées, imports fantômes, CSS orphelin

- [ ] **Vérifier visuellement** : créer une playlist, ajouter des titres, réordonner, supprimer — comportement identique

- [ ] **`npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/routes/(site)/playlists/
git commit -m "refactor(playlists): extract TrackRow and TrackSearch, remove dead code"
```

---

## Task 12 : Refactoring homepage `+page.svelte` (1847L)

**Files:**

- Modify: `src/routes/(site)/+page.svelte`

- [ ] **Lire le fichier complet**

- [ ] **Remplacer les états vides rooms** par `<EmptyState>`

- [ ] **Remplacer le modal guest** (si inline) par `<Modal>`

- [ ] **Appliquer `<Avatar>`** partout où un avatar est affiché inline

- [ ] **Supprimer le code mort** : variables jamais lues, fonctions jamais appelées, `$effect` redondants, CSS orphelin

- [ ] **Vérifier visuellement** : homepage complète — rooms, stats, leaderboard, modal invité

- [ ] **`npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/routes/(site)/+page.svelte
git commit -m "refactor(homepage): use shared components, remove dead code"
```

---

## Task 13 : Refactoring `game/+page.svelte` (1187L)

**Files:**

- Modify: `src/routes/(site)/game/+page.svelte`

- [ ] **Lire le fichier complet**

- [ ] **Identifier et supprimer le code mort** : les variables liées à des features désactivées, les handlers Socket.io jamais déclenchés, le CSS de sélecteurs inexistants

- [ ] **Appliquer `<Avatar>`** pour les avatars joueurs si présents

- [ ] **Appliquer `<EmptyState>`** si une liste vide est affichée

- [ ] **Vérifier visuellement** : rejoindre une room, jouer une partie complète — comportement identique

- [ ] **`npm run lint`** — 0 erreur

- [ ] **Commit**

```bash
git add src/routes/(site)/game/+page.svelte
git commit -m "refactor(game): remove dead code, apply shared components"
```

---

## Task 14 : Nettoyage des fichiers restants

**Files:**

- Tous les fichiers de routes non encore traités

- [ ] **Lire et nettoyer chaque fichier** par ordre décroissant de taille, en appliquant la checklist :
  - Supprimer variables `$state` jamais lues dans le template
  - Supprimer imports non utilisés
  - Supprimer fonctions jamais appelées
  - Supprimer CSS dont les sélecteurs n'ont aucun élément
  - Remplacer les toasts inline par `toast()` centralisé
  - Remplacer les avatars inline par `<Avatar>`
  - Remplacer les états vides par `<EmptyState>`

Fichiers à traiter (dans l'ordre) :

1. `src/routes/(site)/user/[username]/+page.svelte` — profil public
2. `src/routes/(site)/profile/+page.svelte`
3. `src/routes/(admin)/admin/dashboard/+page.svelte`
4. `src/routes/(admin)/admin/users/[id]/+page.svelte`
5. `src/routes/(admin)/admin/playlists/[id]/+page.svelte`
6. `src/routes/(site)/room/[code]/+page.svelte`
7. `src/routes/(site)/results/[id]/+page.svelte`
8. `src/routes/(site)/rooms/+page.svelte`
9. `src/routes/(site)/nouveautes/+page.svelte`
10. Fichiers restants `<400L`

- [ ] **Commit par fichier ou par groupe** si les changements sont mineurs

```bash
git commit -m "refactor: remove dead code and apply shared components across remaining pages"
```
