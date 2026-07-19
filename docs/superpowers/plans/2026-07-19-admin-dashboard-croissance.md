# Dashboard croissance admin — Plan d'implémentation (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Remplacer le dashboard admin par un tableau de bord de croissance : 4 StatCards avec deltas, courbe 30/60/90j multi-séries (visiteurs Umami + inscriptions + joueurs actifs), sources de trafic, conversion, rétention J7, bloc ops compact.

**Architecture :** RPC SQL Supabase pour les séries BDD (migration à appliquer à la main par Theo) ; client Umami côté serveur (login → token Bearer, self-host) ; endpoint agrégateur `/api/admin/stats` avec cache mémoire 5 min ; composants Svelte 5 SVG maison (StatCard, Sparkline, TrendChart) dans `src/lib/admin/`.

**Tech Stack :** SvelteKit 5 (runes), Supabase RPC, Umami self-host API (`https://stats.zik-music.fr`), vitest pour la logique pure.

## Global Constraints

- Svelte 5 runes uniquement (`$state`, `$derived`, `$props`) — pas de stores Svelte 4.
- Pas de lib de charts, pas de framework CSS — SVG maison, styles scoped.
- **Ne jamais commit sans confirmation explicite de Theo** (règle CLAUDE.md). Les étapes « Commit » ci-dessous = préparer et demander.
- `npm run lint` doit passer avant toute PR.
- Le MCP Supabase pointe sur un projet vide : la migration SQL est **appliquée à la main par Theo** dans le SQL editor Supabase (projet `fbeubmwhxytniohodlgr`).
- Env vars déjà en place sur Railway : `UMAMI_API_URL`, `UMAMI_WEBSITE_ID`, `UMAMI_USER`, `UMAMI_PASS`. En local, les ajouter au `.env` pour tester.
- Version : bump **v3.1.0** (package.json) au moment de la PR. Pas de changement de CSS statique → pas de bump `?v=` des CSS.
- Auth des GET admin : pattern existant `?token=` + `verifyToken` + check `role === 'super_admin'` (cf. `src/routes/(site)/api/admin/errors/+server.js`).
- Fuseau : `Europe/Paris` pour tous les groupements par jour (SQL et Umami).

---

### Task 1 : Migration SQL — RPC de séries et métriques

**Files:**

- Create: `supabase/migrations/20260719_admin_growth_stats.sql`

**Interfaces:**

- Produces (RPC PostgREST, appelées via `sb.rpc(name, args)`) :
  - `admin_signups_per_day(p_days int)` → `TABLE(day date, n int)` — série complète, jours à 0 inclus
  - `admin_active_players_per_day(p_days int)` → `TABLE(day date, n int)` — joueurs distincts (invités inclus) par jour
  - `admin_games_per_day(p_days int)` → `TABLE(day date, n int)`
  - `admin_guest_ratio_7d()` → `TABLE(guests int, logged int)`
  - `admin_retention_j7()` → `TABLE(cohort_size int, retained int)`

- [ ] **Step 1 : Écrire la migration**

```sql
-- 20260719_admin_growth_stats.sql
-- RPC d'agrégats pour le dashboard admin croissance.
-- SECURITY DEFINER : lisent games/game_players/profiles sans dépendre du RLS.
-- Appelées uniquement côté serveur avec le service key.

create or replace function admin_signups_per_day(p_days int)
returns table(day date, n int)
language sql security definer set search_path = public as $$
  select d.day::date, count(p.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join profiles p
    on (p.created_at at time zone 'Europe/Paris')::date = d.day::date
  group by d.day order by d.day;
$$;

create or replace function admin_active_players_per_day(p_days int)
returns table(day date, n int)
language sql security definer set search_path = public as $$
  select d.day::date, count(distinct coalesce(gp.user_id::text, gp.username))::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join games g
    on (g.started_at at time zone 'Europe/Paris')::date = d.day::date
  left join game_players gp on gp.game_id = g.id
  group by d.day order by d.day;
$$;

create or replace function admin_games_per_day(p_days int)
returns table(day date, n int)
language sql security definer set search_path = public as $$
  select d.day::date, count(g.id)::int
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - (p_days - 1),
    (now() at time zone 'Europe/Paris')::date,
    interval '1 day'
  ) as d(day)
  left join games g
    on (g.started_at at time zone 'Europe/Paris')::date = d.day::date
  group by d.day order by d.day;
$$;

create or replace function admin_guest_ratio_7d()
returns table(guests int, logged int)
language sql security definer set search_path = public as $$
  select
    count(distinct gp.username) filter (where gp.is_guest)::int,
    count(distinct gp.user_id) filter (where not gp.is_guest)::int
  from game_players gp
  join games g on g.id = gp.game_id
  where g.started_at >= now() - interval '7 days';
$$;

-- Cohorte = inscrits il y a 14 à 7 jours ; retenu = a joué dans les 7 jours suivant son inscription.
create or replace function admin_retention_j7()
returns table(cohort_size int, retained int)
language sql security definer set search_path = public as $$
  with cohort as (
    select id, created_at from profiles
    where created_at >= now() - interval '14 days'
      and created_at <  now() - interval '7 days'
  )
  select
    (select count(*) from cohort)::int,
    (select count(distinct c.id) from cohort c
      join game_players gp on gp.user_id = c.id
      join games g on g.id = gp.game_id
      where g.started_at between c.created_at and c.created_at + interval '7 days'
    )::int;
$$;

revoke execute on function admin_signups_per_day(int) from anon, authenticated;
revoke execute on function admin_active_players_per_day(int) from anon, authenticated;
revoke execute on function admin_games_per_day(int) from anon, authenticated;
revoke execute on function admin_guest_ratio_7d() from anon, authenticated;
revoke execute on function admin_retention_j7() from anon, authenticated;
```

- [ ] **Step 2 : Theo applique la migration** dans Supabase SQL editor (copier-coller le fichier entier, Run).

- [ ] **Step 3 : Vérifier les RPC** — exécuter dans le SQL editor :

```sql
select * from admin_signups_per_day(7);
select * from admin_active_players_per_day(7);
select * from admin_games_per_day(7);
select * from admin_guest_ratio_7d();
select * from admin_retention_j7();
```

Attendu : chaque série retourne exactement 7 lignes (jours consécutifs, zéros inclus), les scalaires retournent 1 ligne. Comparer un jour avec un comptage manuel (`select count(*) from profiles where created_at::date = current_date;`).

- [ ] **Step 4 : Commit** (après confirmation Theo)

```bash
git add supabase/migrations/20260719_admin_growth_stats.sql
git commit -m "feat(admin): RPC SQL séries croissance (signups, actifs, parties, rétention)"
```

---

### Task 2 : Utilitaires stats purs (TDD)

**Files:**

- Create: `src/lib/admin/stats-utils.js`
- Test: `src/lib/admin/__tests__/stats-utils.test.js`

**Interfaces:**

- Produces :
  - `sumWindow(series, n, offset = 0)` → somme des `n` derniers points (en sautant `offset` points depuis la fin). `series` = `[{ day, n }]` ou `[{ x, y }]` (clé numérique détectée : `n` sinon `y`).
  - `computeDelta(current, previous)` → `{ pct: number|null, dir: 'up'|'down'|'flat' }` ; `pct` arrondi entier, `null` si `previous === 0`.
  - `toPercent(part, total)` → entier arrondi, `0` si `total === 0`.

- [ ] **Step 1 : Écrire les tests (rouges)**

```js
// src/lib/admin/__tests__/stats-utils.test.js
import { describe, it, expect } from "vitest";
import { sumWindow, computeDelta, toPercent } from "../stats-utils.js";

const serie = (vals) => vals.map((n, i) => ({ day: `2026-07-${10 + i}`, n }));

describe("sumWindow", () => {
  it("somme les n derniers points", () => {
    expect(sumWindow(serie([1, 2, 3, 4]), 2)).toBe(7);
  });
  it("gère l'offset (fenêtre précédente)", () => {
    expect(sumWindow(serie([1, 2, 3, 4]), 2, 2)).toBe(3);
  });
  it("accepte le format Umami {x,y}", () => {
    expect(
      sumWindow(
        [
          { x: "a", y: 5 },
          { x: "b", y: 6 },
        ],
        2,
      ),
    ).toBe(11);
  });
  it("série plus courte que la fenêtre → somme ce qui existe", () => {
    expect(sumWindow(serie([3]), 7)).toBe(3);
  });
});

describe("computeDelta", () => {
  it("hausse", () => {
    expect(computeDelta(120, 100)).toEqual({ pct: 20, dir: "up" });
  });
  it("baisse", () => {
    expect(computeDelta(80, 100)).toEqual({ pct: -20, dir: "down" });
  });
  it("stable", () => {
    expect(computeDelta(100, 100)).toEqual({ pct: 0, dir: "flat" });
  });
  it("précédent à zéro → pct null", () => {
    expect(computeDelta(5, 0)).toEqual({ pct: null, dir: "up" });
  });
});

describe("toPercent", () => {
  it("arrondit", () => {
    expect(toPercent(1, 3)).toBe(33);
  });
  it("total zéro → 0", () => {
    expect(toPercent(5, 0)).toBe(0);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — `npx vitest run src/lib/admin` → FAIL (module introuvable).

- [ ] **Step 3 : Implémenter**

```js
// src/lib/admin/stats-utils.js
const val = (p) => (typeof p.n === "number" ? p.n : (p.y ?? 0));

export function sumWindow(series, n, offset = 0) {
  const end = series.length - offset;
  return series
    .slice(Math.max(0, end - n), end)
    .reduce((s, p) => s + val(p), 0);
}

export function computeDelta(current, previous) {
  const dir = current > previous ? "up" : current < previous ? "down" : "flat";
  if (previous === 0) return { pct: current === 0 ? 0 : null, dir };
  return { pct: Math.round(((current - previous) / previous) * 100), dir };
}

export function toPercent(part, total) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
```

- [ ] **Step 4 : Vérifier le vert** — `npx vitest run src/lib/admin` → PASS (9 tests).

- [ ] **Step 5 : Commit** (après confirmation Theo)

```bash
git add src/lib/admin/stats-utils.js src/lib/admin/__tests__/stats-utils.test.js
git commit -m "feat(admin): utilitaires stats (fenêtres, deltas, pourcentages) + tests"
```

---

### Task 3 : Client Umami serveur

**Files:**

- Create: `src/lib/server/umami.js`

**Interfaces:**

- Consumes : env `UMAMI_API_URL`, `UMAMI_WEBSITE_ID`, `UMAMI_USER`, `UMAMI_PASS`.
- Produces :
  - `isUmamiConfigured()` → bool
  - `getUmamiData(days)` → `{ visitors: [{x,y}], pageviews7d: number, visitors7d: number, visitors7dPrev: number, referrers: [{x,y}], pages: [{x,y}] } | null` (null si non configuré ou erreur — le dashboard doit fonctionner sans Umami).

- [ ] **Step 1 : Implémenter**

```js
// src/lib/server/umami.js
// Client API Umami self-host : login → token Bearer, re-login sur 401.
let _token = null;

const cfg = () => ({
  url: process.env.UMAMI_API_URL,
  siteId: process.env.UMAMI_WEBSITE_ID,
  user: process.env.UMAMI_USER,
  pass: process.env.UMAMI_PASS,
});

export function isUmamiConfigured() {
  const c = cfg();
  return Boolean(c.url && c.siteId && c.user && c.pass);
}

async function login() {
  const c = cfg();
  const r = await fetch(`${c.url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: c.user, password: c.pass }),
  });
  if (!r.ok) throw new Error(`Umami login ${r.status}`);
  _token = (await r.json()).token;
}

async function api(path, params) {
  const c = cfg();
  const qs = new URLSearchParams(params).toString();
  const call = () =>
    fetch(`${c.url}/api/websites/${c.siteId}${path}?${qs}`, {
      headers: { Authorization: `Bearer ${_token}` },
    });
  if (!_token) await login();
  let r = await call();
  if (r.status === 401) {
    await login();
    r = await call();
  }
  if (!r.ok) throw new Error(`Umami ${path} ${r.status}`);
  return r.json();
}

export async function getUmamiData(days) {
  if (!isUmamiConfigured()) return null;
  const DAY = 86_400_000;
  const now = Date.now();
  const start = now - days * DAY;
  const start7 = now - 7 * DAY;
  const start14 = now - 14 * DAY;
  try {
    const [series, statsNow, statsPrev, referrers, pages] = await Promise.all([
      api("/pageviews", {
        startAt: start,
        endAt: now,
        unit: "day",
        timezone: "Europe/Paris",
      }),
      api("/stats", { startAt: start7, endAt: now }),
      api("/stats", { startAt: start14, endAt: start7 }),
      api("/metrics", {
        startAt: start7,
        endAt: now,
        type: "referrer",
        limit: 8,
      }),
      api("/metrics", { startAt: start7, endAt: now, type: "url", limit: 8 }),
    ]);
    const num = (v) => (typeof v === "object" ? (v?.value ?? 0) : (v ?? 0));
    return {
      visitors: series.sessions ?? [],
      pageviews7d: num(statsNow.pageviews),
      visitors7d: num(statsNow.visitors),
      visitors7dPrev: num(statsPrev.visitors),
      referrers,
      pages,
    };
  } catch (e) {
    console.error("[umami]", e.message);
    return null;
  }
}
```

- [ ] **Step 2 : Vérifier à la main** — ajouter les 4 env vars au `.env` local, puis :

```bash
node -e "import('./src/lib/server/umami.js').then(async m => console.log(JSON.stringify(await m.getUmamiData(30), null, 2)))"
```

Attendu : un objet JSON avec `visitors` (tableau, peut être vide tant que le script n'est pas déployé), `visitors7d`, `referrers`, `pages`. Pas d'exception.

- [ ] **Step 3 : Commit** (après confirmation Theo)

```bash
git add src/lib/server/umami.js
git commit -m "feat(admin): client API Umami serveur (login, stats, séries, référents)"
```

---

### Task 4 : Endpoint agrégateur `/api/admin/stats`

**Files:**

- Create: `src/routes/(site)/api/admin/stats/+server.js`

**Interfaces:**

- Consumes : RPC Task 1, `getUmamiData` Task 3, `sumWindow`/`computeDelta`/`toPercent` Task 2, `verifyToken` + `getAdminClient` (existants).
- Produces : `GET /api/admin/stats?token=...&days=30|60|90` →

```json
{
  "series": {
    "visitors": [{ "x": "2026-07-19", "y": 12 }],
    "signups": [{ "day": "2026-07-19", "n": 3 }],
    "players": [{ "day": "2026-07-19", "n": 9 }]
  },
  "hero": {
    "visitors7d": { "value": 240, "delta": { "pct": 20, "dir": "up" } },
    "signups7d": { "value": 12, "delta": { "pct": -8, "dir": "down" } },
    "players7d": { "value": 90, "delta": { "pct": 4, "dir": "up" } },
    "games7d": { "value": 55, "delta": { "pct": 0, "dir": "flat" } }
  },
  "traffic": {
    "referrers": [{ "x": "google.com", "y": 80 }],
    "pages": [{ "x": "/", "y": 150 }],
    "available": true
  },
  "kpis": {
    "conversionPct": 5,
    "guestPct": 60,
    "retention": { "cohort": 10, "retained": 4, "pct": 40 }
  }
}
```

- [ ] **Step 1 : Implémenter**

```js
// src/routes/(site)/api/admin/stats/+server.js
import { error, json } from "@sveltejs/kit";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { getUmamiData } from "$lib/server/umami.js";
import { sumWindow, computeDelta, toPercent } from "$lib/admin/stats-utils.js";

const CACHE_TTL = 5 * 60_000;
const _cache = new Map(); // days -> { data, exp }

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

export async function GET({ url }) {
  await checkAdmin(url.searchParams.get("token"));
  const days = [30, 60, 90].includes(Number(url.searchParams.get("days")))
    ? Number(url.searchParams.get("days"))
    : 30;

  const hit = _cache.get(days);
  if (hit && hit.exp > Date.now()) return json(hit.data);

  const sb = getAdminClient();
  const [signups, players, games, ratio, retention, umami] = await Promise.all([
    sb.rpc("admin_signups_per_day", { p_days: days }),
    sb.rpc("admin_active_players_per_day", { p_days: days }),
    sb.rpc("admin_games_per_day", { p_days: days }),
    sb.rpc("admin_guest_ratio_7d"),
    sb.rpc("admin_retention_j7"),
    getUmamiData(days),
  ]);

  const s = (r) => r.data ?? [];
  const stat = (serie) => {
    const value = sumWindow(serie, 7);
    return { value, delta: computeDelta(value, sumWindow(serie, 7, 7)) };
  };

  const signupsSerie = s(signups);
  const { guests = 0, logged = 0 } = s(ratio)[0] ?? {};
  const { cohort_size = 0, retained = 0 } = s(retention)[0] ?? {};
  const signups7d = sumWindow(signupsSerie, 7);

  const data = {
    series: {
      visitors: umami?.visitors ?? [],
      signups: signupsSerie,
      players: s(players),
    },
    hero: {
      visitors7d: umami
        ? {
            value: umami.visitors7d,
            delta: computeDelta(umami.visitors7d, umami.visitors7dPrev),
          }
        : { value: null, delta: null },
      signups7d: stat(signupsSerie),
      players7d: stat(s(players)),
      games7d: stat(s(games)),
    },
    traffic: {
      referrers: umami?.referrers ?? [],
      pages: umami?.pages ?? [],
      available: Boolean(umami),
    },
    kpis: {
      conversionPct: umami ? toPercent(signups7d, umami.visitors7d) : null,
      guestPct: toPercent(guests, guests + logged),
      retention: {
        cohort: cohort_size,
        retained,
        pct: toPercent(retained, cohort_size),
      },
    },
  };

  _cache.set(days, { data, exp: Date.now() + CACHE_TTL });
  return json(data);
}
```

- [ ] **Step 2 : Vérifier à la main** — `npm run dev`, se connecter en super_admin sur `/admin`, récupérer le token (`console.log` temporaire ou onglet réseau), puis :

```bash
curl "http://localhost:5173/api/admin/stats?token=<TOKEN>&days=30"
```

Attendu : le JSON du contrat ci-dessus, `series.signups` de longueur 30. Sans token : 403. Deuxième appel immédiat : réponse identique (cache).

- [ ] **Step 3 : Commit** (après confirmation Theo)

```bash
git add "src/routes/(site)/api/admin/stats/+server.js"
git commit -m "feat(admin): endpoint /api/admin/stats (RPC + Umami, cache 5 min)"
```

---

### Task 5 : Composants SVG — StatCard, Sparkline, TrendChart

**Files:**

- Create: `src/lib/admin/StatCard.svelte`
- Create: `src/lib/admin/Sparkline.svelte`
- Create: `src/lib/admin/TrendChart.svelte`

**Interfaces:**

- Consumes : format deltas de Task 4 (`{ pct, dir }`).
- Produces :
  - `StatCard` props : `{ label, value, delta = null, spark = [] }` (`spark` = tableau de nombres)
  - `Sparkline` props : `{ points = [], width = 120, height = 32, color = 'var(--adm-accent)' }`
  - `TrendChart` props : `{ series = [] }` où chaque série = `{ label, color, points: [{ x: 'YYYY-MM-DD', y: number }] }` — toutes les séries partagent le même axe X.

- [ ] **Step 1 : Sparkline**

```svelte
<!-- src/lib/admin/Sparkline.svelte -->
<script>
  let { points = [], width = 120, height = 32, color = 'var(--adm-accent)' } = $props();

  const path = $derived.by(() => {
    if (points.length < 2) return '';
    const max = Math.max(...points, 1);
    const stepX = width / (points.length - 1);
    return points
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`)
      .join(' ');
  });
</script>

{#if path}
  <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
    <path d={path} fill="none" stroke={color} stroke-width="1.5" stroke-linejoin="round" />
  </svg>
{/if}
```

- [ ] **Step 2 : StatCard**

```svelte
<!-- src/lib/admin/StatCard.svelte -->
<script>
  import Sparkline from './Sparkline.svelte';
  let { label, value, delta = null, spark = [] } = $props();
</script>

<div class="card">
  <div class="label">{label}</div>
  <div class="row">
    <div class="value">{value ?? '—'}</div>
    {#if delta}
      <span class="delta {delta.dir}">
        {delta.dir === 'up' ? '↗' : delta.dir === 'down' ? '↘' : '→'}
        {delta.pct === null ? 'nouveau' : `${delta.pct > 0 ? '+' : ''}${delta.pct} %`}
      </span>
    {/if}
  </div>
  <Sparkline points={spark} />
</div>

<style>
  .card {
    background: var(--adm-glass);
    border: 1px solid var(--adm-border);
    border-radius: 14px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--adm-muted);
  }
  .row { display: flex; align-items: baseline; gap: 10px; }
  .value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.9rem;
    font-weight: 600;
    color: var(--adm-text);
  }
  .delta { font-size: 0.8rem; font-weight: 600; }
  .delta.up { color: var(--adm-green); }
  .delta.down { color: var(--adm-red); }
  .delta.flat { color: var(--adm-muted); }
</style>
```

- [ ] **Step 3 : TrendChart** (multi-séries, tooltip au survol, axe X par dates)

```svelte
<!-- src/lib/admin/TrendChart.svelte -->
<script>
  let { series = [] } = $props();

  const W = 900, H = 260, PAD = { t: 12, r: 12, b: 26, l: 36 };
  let hoverIdx = $state(null);

  const xDates = $derived(series[0]?.points.map((p) => p.x) ?? []);
  const maxY = $derived(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y))));
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const px = (i) => PAD.l + (xDates.length < 2 ? 0 : (i / (xDates.length - 1)) * innerW);
  const py = (v) => PAD.t + innerH - (v / maxY) * innerH;
  const linePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const yTicks = $derived([0, 0.5, 1].map((f) => Math.round(maxY * f)));

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W - PAD.l;
    hoverIdx = Math.max(0, Math.min(xDates.length - 1, Math.round((x / innerW) * (xDates.length - 1))));
  }
</script>

<div class="chart">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg viewBox="0 0 {W} {H}" onmousemove={onMove} onmouseleave={() => (hoverIdx = null)}>
    {#each yTicks as t (t)}
      <line x1={PAD.l} x2={W - PAD.r} y1={py(t)} y2={py(t)} class="grid" />
      <text x={PAD.l - 8} y={py(t) + 4} class="tick" text-anchor="end">{t}</text>
    {/each}
    {#each series as s (s.label)}
      <path d={linePath(s.points)} fill="none" stroke={s.color} stroke-width="2" stroke-linejoin="round" />
    {/each}
    {#if xDates.length > 1}
      <text x={PAD.l} y={H - 6} class="tick">{fmtDate(xDates[0])}</text>
      <text x={W - PAD.r} y={H - 6} class="tick" text-anchor="end">{fmtDate(xDates.at(-1))}</text>
    {/if}
    {#if hoverIdx !== null}
      <line x1={px(hoverIdx)} x2={px(hoverIdx)} y1={PAD.t} y2={H - PAD.b} class="cursor" />
      {#each series as s (s.label)}
        {#if s.points[hoverIdx]}
          <circle cx={px(hoverIdx)} cy={py(s.points[hoverIdx].y)} r="3.5" fill={s.color} />
        {/if}
      {/each}
    {/if}
  </svg>
  {#if hoverIdx !== null && xDates[hoverIdx]}
    <div class="tooltip" style="left: {(px(hoverIdx) / W) * 100}%">
      <div class="tt-date">{fmtDate(xDates[hoverIdx])}</div>
      {#each series as s (s.label)}
        <div class="tt-row"><span class="dot" style="background:{s.color}"></span>{s.label} : <b>{s.points[hoverIdx]?.y ?? 0}</b></div>
      {/each}
    </div>
  {/if}
  <div class="legend">
    {#each series as s (s.label)}
      <span class="legend-item"><span class="dot" style="background:{s.color}"></span>{s.label}</span>
    {/each}
  </div>
</div>

<style>
  .chart { position: relative; }
  svg { width: 100%; height: auto; display: block; }
  .grid { stroke: var(--adm-border); stroke-width: 1; }
  .cursor { stroke: var(--adm-muted); stroke-width: 1; stroke-dasharray: 3 3; }
  .tick { fill: var(--adm-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
  .tooltip {
    position: absolute; top: 0; transform: translateX(-50%);
    background: var(--adm-panel); border: 1px solid var(--adm-border);
    border-radius: 10px; padding: 8px 12px; font-size: 0.78rem;
    pointer-events: none; white-space: nowrap; z-index: 5; color: var(--adm-text);
  }
  .tt-date { color: var(--adm-muted); margin-bottom: 4px; }
  .tt-row { display: flex; align-items: center; gap: 6px; }
  .legend { display: flex; gap: 16px; margin-top: 10px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--adm-muted); }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
</style>
```

- [ ] **Step 4 : Vérifier** — `npm run lint` → PASS (les composants seront testés visuellement en Task 6).

- [ ] **Step 5 : Commit** (après confirmation Theo)

```bash
git add src/lib/admin/StatCard.svelte src/lib/admin/Sparkline.svelte src/lib/admin/TrendChart.svelte
git commit -m "feat(admin): composants SVG StatCard, Sparkline, TrendChart"
```

---

### Task 6 : Réécriture du dashboard

**Files:**

- Modify: `src/routes/(admin)/admin/dashboard/+page.svelte` (réécriture complète)
- Modify: `src/routes/(admin)/admin/dashboard/+page.server.js` (le `load` ne garde que ops + maintenance)

**Interfaces:**

- Consumes : `GET /api/admin/stats` (Task 4), composants (Task 5), contexte `adminToken` du layout admin, action `?/maintenance` existante (inchangée), SSE `/api/admin/live` existant.

- [ ] **Step 1 : Alléger le `load`** — dans `+page.server.js`, supprimer du `Promise.allSettled` les requêtes désormais servies par `/api/admin/stats` (totalUsers, gamesToday, activeUsers7d, officialPlaylists et le RPC `count_active_players_7d`) ; garder `publicRooms`, `pendingReports`, uptime, maintenance. L'action `?/maintenance` reste identique.

```js
// +page.server.js — nouveau load (l'action maintenance ne change pas)
export async function load() {
  const sb = getAdminClient();
  const results = await Promise.allSettled([
    sb
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true),
    sb
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  const getCount = (r) => (r.status === "fulfilled" ? (r.value.count ?? 0) : 0);
  const [publicRooms, pendingReports] = results.map(getCount);

  const uptimeSeconds = Math.floor(process.uptime());
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const uptime = `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;

  return {
    maintenance: await getMaintenance(),
    ops: { publicRooms, pendingReports, uptime },
  };
}
```

- [ ] **Step 2 : Réécrire la page.** Structure (le CSS complet est fourni à l'étape 3) :

```svelte
<!-- +page.svelte — structure -->
<script>
  import { onMount, getContext } from 'svelte';
  import StatCard from '$lib/admin/StatCard.svelte';
  import TrendChart from '$lib/admin/TrendChart.svelte';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let stats = $state(null);
  let days = $state(30);
  let loading = $state(true);
  let maintEnabled = $state(data.maintenance?.enabled ?? false);
  let maintMessage = $state(data.maintenance?.message ?? '');

  async function loadStats() {
    if (!token) return;
    loading = true;
    const r = await fetch(`/api/admin/stats?token=${encodeURIComponent(token)}&days=${days}`);
    if (r.ok) stats = await r.json();
    loading = false;
  }

  onMount(loadStats);
  $effect(() => { void days; loadStats(); });

  const sparkOf = (serie) => (serie ?? []).slice(-14).map((p) => p.n ?? p.y ?? 0);
  const chartSeries = $derived(!stats ? [] : [
    { label: 'Visiteurs', color: 'var(--adm-accent)', points: stats.series.visitors.map((p) => ({ x: p.x, y: p.y })) },
    { label: 'Inscriptions', color: 'var(--adm-green)', points: stats.series.signups.map((p) => ({ x: p.day, y: p.n })) },
    { label: 'Joueurs actifs', color: 'var(--adm-amber)', points: stats.series.players.map((p) => ({ x: p.day, y: p.n })) },
  ].filter((s) => s.points.length > 0));
</script>

<div class="dash">
  <header class="dash-head">
    <h1>Croissance</h1>
    <div class="period">
      {#each [30, 60, 90] as d (d)}
        <button class:active={days === d} onclick={() => (days = d)}>{d} j</button>
      {/each}
    </div>
  </header>

  {#if stats}
    <div class="hero">
      <StatCard label="Visiteurs 7 j" value={stats.hero.visitors7d.value} delta={stats.hero.visitors7d.delta} spark={sparkOf(stats.series.visitors)} />
      <StatCard label="Nouveaux inscrits 7 j" value={stats.hero.signups7d.value} delta={stats.hero.signups7d.delta} spark={sparkOf(stats.series.signups)} />
      <StatCard label="Joueurs actifs 7 j" value={stats.hero.players7d.value} delta={stats.hero.players7d.delta} spark={sparkOf(stats.series.players)} />
      <StatCard label="Parties 7 j" value={stats.hero.games7d.value} delta={stats.hero.games7d.delta} />
    </div>

    <section class="panel">
      <TrendChart series={chartSeries} />
    </section>

    <div class="secondary">
      <section class="panel">
        <h2>Sources de trafic (7 j)</h2>
        {#if !stats.traffic.available}
          <p class="empty">Umami indisponible — vérifier UMAMI_* dans les variables Railway.</p>
        {:else if stats.traffic.referrers.length === 0}
          <p class="empty">Pas encore de données.</p>
        {:else}
          {#each stats.traffic.referrers as r (r.x)}
            <div class="bar-row"><span class="bar-label">{r.x || 'Direct'}</span><span class="bar-value">{r.y}</span></div>
          {/each}
        {/if}
      </section>

      <section class="panel">
        <h2>Top pages (7 j)</h2>
        {#each stats.traffic.pages as p (p.x)}
          <div class="bar-row"><span class="bar-label">{p.x}</span><span class="bar-value">{p.y}</span></div>
        {:else}
          <p class="empty">Pas encore de données.</p>
        {/each}
      </section>

      <section class="panel kpis">
        <h2>Conversion & rétention</h2>
        <div class="kpi"><span>Visiteur → inscrit</span><b>{stats.kpis.conversionPct ?? '—'} %</b></div>
        <div class="kpi"><span>Joueurs invités</span><b>{stats.kpis.guestPct} %</b></div>
        <div class="kpi">
          <span>Rétention J7</span>
          <b>{stats.kpis.retention.pct} %</b>
          <small>{stats.kpis.retention.retained}/{stats.kpis.retention.cohort} inscrits</small>
        </div>
      </section>
    </div>
  {:else if loading}
    <p class="empty">Chargement…</p>
  {:else}
    <p class="empty">Impossible de charger les stats.</p>
  {/if}

  <div class="ops">
    <div class="ops-item"><span>Reports en attente</span><b class:warn={data.ops.pendingReports > 0}>{data.ops.pendingReports}</b></div>
    <div class="ops-item"><span>Rooms publiques</span><b>{data.ops.publicRooms}</b></div>
    <div class="ops-item"><span>Uptime serveur</span><b>{data.ops.uptime}</b></div>
    <a class="ops-item link" href="/admin/live">Live →</a>
  </div>

  <!-- Formulaire maintenance : reprendre le markup existant tel quel (action ?/maintenance, _token, checkbox, textarea, feedback form) -->
</div>
```

- [ ] **Step 3 : Styles.** Variables locales en attendant la phase 2 (elles migreront dans le layout admin) — ajouter dans le `<style>` de la page :

```css
.dash {
  --adm-bg: #0b0c12;
  --adm-panel: #14161f;
  --adm-glass: rgba(255, 255, 255, 0.03);
  --adm-border: rgba(255, 255, 255, 0.08);
  --adm-text: #eef0f6;
  --adm-muted: #8b90a0;
  --adm-accent: #7c6cff;
  --adm-green: #3ddc84;
  --adm-amber: #ffb300;
  --adm-red: #ff5470;
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: "Bricolage Grotesque", sans-serif;
  color: var(--adm-text);
}
.dash-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dash-head h1 {
  font-size: 1.5rem;
  font-weight: 800;
}
.period {
  display: flex;
  gap: 4px;
  background: var(--adm-glass);
  border: 1px solid var(--adm-border);
  border-radius: 10px;
  padding: 3px;
}
.period button {
  background: none;
  border: none;
  color: var(--adm-muted);
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
}
.period button.active {
  background: var(--adm-panel);
  color: var(--adm-text);
}
.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.panel {
  background: var(--adm-glass);
  border: 1px solid var(--adm-border);
  border-radius: 14px;
  padding: 18px 20px;
}
.panel h2 {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--adm-muted);
  margin-bottom: 12px;
}
.secondary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}
.bar-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--adm-border);
}
.bar-row:last-child {
  border-bottom: none;
}
.bar-label {
  color: var(--adm-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar-value {
  font-family: "JetBrains Mono", monospace;
  color: var(--adm-muted);
}
.kpi {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 0;
  font-size: 0.9rem;
}
.kpi b {
  font-family: "JetBrains Mono", monospace;
  font-size: 1.1rem;
}
.kpi small {
  color: var(--adm-muted);
}
.ops {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.ops-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  background: var(--adm-glass);
  border: 1px solid var(--adm-border);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 0.85rem;
  color: var(--adm-muted);
}
.ops-item b {
  color: var(--adm-text);
  font-family: "JetBrains Mono", monospace;
}
.ops-item b.warn {
  color: var(--adm-amber);
}
.ops-item.link {
  color: var(--adm-accent);
}
.empty {
  color: var(--adm-muted);
  font-size: 0.85rem;
}
```

Conserver aussi les styles du formulaire maintenance existant (adaptés aux variables `--adm-*`).

- [ ] **Step 4 : Vérifier en local** — `npm run dev`, aller sur `/admin/dashboard` en super_admin :
  - Les 4 StatCards s'affichent avec deltas colorés et sparklines.
  - La courbe change quand on clique 30/60/90 (nouvel appel réseau, sauf cache).
  - Le sélecteur de période, le tooltip au survol de la courbe et la légende fonctionnent.
  - Le panneau sources affiche « Pas encore de données » (normal tant qu'Umami n'a pas de trafic) et PAS le message d'erreur de config.
  - Le toggle maintenance fonctionne toujours (activer → bandeau site → désactiver).

- [ ] **Step 5 : Lint + tests** — `npm run lint` → PASS, `npm run test` → PASS.

- [ ] **Step 6 : Commit** (après confirmation Theo)

```bash
git add "src/routes/(admin)/admin/dashboard/"
git commit -m "feat(admin): dashboard croissance (StatCards, courbe multi-séries, trafic, KPIs)"
```

---

### Task 7 : Finalisation — version, PR

**Files:**

- Modify: `package.json` (version)

- [ ] **Step 1 : Bump version** — `package.json` : `"version": "3.1.0"`. Vérifier avec `grep -r "3\.0\.0" src static --include="*.svelte" --include="*.html" -l` s'il y a des versions affichées à bumper (les `?v=3.0.0` des CSS statiques ne bougent PAS : aucun CSS statique modifié).

- [ ] **Step 2 : Vérification finale** — `npm run lint && npm run test` → PASS. Re-tester `/admin/dashboard` en local.

- [ ] **Step 3 : Branche + PR** (après confirmation Theo — inclut aussi les fixes déjà en attente : `static/og.png` restauré, `/classements` dans le sitemap, script Umami dans `app.html`, spec + plan)

```bash
git checkout -b feat/admin-dashboard-croissance
git add -A
git commit -m "v3.1.0 - dashboard admin croissance + tracking Umami + fixes audit URLs"
git push -u origin feat/admin-dashboard-croissance
gh pr create --title "v3.1.0 — Dashboard admin croissance" --body "..."
```

---

## Self-review (fait le 2026-07-19)

- **Couverture spec phase 1 :** ligne héro ✔ (Task 5+6), courbe 30/60/90 ✔ (Task 5+6), sources/top pages/conversion/ratio invités/rétention ✔ (Task 1+4+6), bloc ops + maintenance ✔ (Task 6), RPC + endpoint + cache + env ✔ (Task 1+3+4), script de tracking ✔ (déjà fait dans `app.html`, hors plan).
- **Types cohérents :** séries BDD `{day, n}` / Umami `{x, y}` — conversion unique dans `chartSeries` (Task 6) et `sumWindow` accepte les deux (Task 2). Contrat JSON de Task 4 consommé tel quel en Task 6.
- **Placeholders :** le seul renvoi non détaillé est le formulaire maintenance de Task 6, volontairement « reprendre le markup existant tel quel » — le code existe déjà dans le fichier modifié, pas de réécriture nécessaire.
