<script>
  import { getContext } from 'svelte';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import { ago } from '$lib/admin/stats-utils.js';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  const HOUR = 3600_000;
  const LEVELS = [
    { key: 'all', label: 'Tout' },
    { key: 'error', label: 'Erreurs' },
    { key: 'warn', label: 'Avertissements' },
  ];

  let entries = $state([]);
  let loading = $state(false);
  let failed = $state(false);
  let lastFetch = $state(null);
  let autoRefresh = $state(true);
  let level = $state('all');
  let q = $state('');
  let sort = $state('count');
  let clearOpen = $state(false);
  let copied = $state(null);
  let W = $state(600);
  let now = $state(Date.now());

  const normalize = (msg) =>
    msg
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '…')
      .replace(/\d+/g, '#');

  const groups = $derived.by(() => {
    const map = {};
    for (const e of entries) {
      const key = `${e.level}|${normalize(e.msg)}`;
      const g = map[key];
      if (g) {
        g.count++;
        if (e.ts > g.last) {
          g.last = e.ts;
          g.msg = e.msg;
        }
        if (e.ts < g.first) g.first = e.ts;
      } else {
        map[key] = { key, level: e.level, msg: e.msg, count: 1, first: e.ts, last: e.ts };
      }
    }
    return Object.values(map);
  });
  const counts = $derived({
    all: groups.length,
    error: groups.filter((g) => g.level === 'error').length,
    warn: groups.filter((g) => g.level === 'warn').length,
  });
  const shown = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    return groups
      .filter((g) => (level === 'all' || g.level === level) && (!needle || g.msg.toLowerCase().includes(needle)))
      .sort(sort === 'count' ? (a, b) => b.count - a.count || b.last - a.last : (a, b) => b.last - a.last);
  });

  const hours = $derived.by(() => {
    const end = Math.floor(now / HOUR) * HOUR + HOUR;
    const out = Array.from({ length: 24 }, (_, i) => {
      const start = end - (24 - i) * HOUR;
      return { start, h: new Date(start).getHours(), error: 0, warn: 0 };
    });
    for (const e of entries) {
      const i = 23 - Math.floor((end - 1 - e.ts) / HOUR);
      if (i >= 0 && i < 24) out[i][e.level === 'warn' ? 'warn' : 'error']++;
    }
    return out;
  });
  const last24 = $derived(hours.reduce((n, b) => ({ error: n.error + b.error, warn: n.warn + b.warn }), { error: 0, warn: 0 }));
  const lastHour = $derived(hours[23].error + hours[23].warn);
  const peak = $derived(hours.reduce((m, b) => (b.error + b.warn > m.error + m.warn ? b : m), hours[0]));
  const maxH = $derived(Math.max(1, ...hours.map((b) => b.error + b.warn)));
  const CH = 110;
  const bw = $derived(W / 24);
  const yh = (v) => (v / maxH) * (CH - 14);

  async function fetchLog() {
    if (!token) return;
    loading = true;
    try {
      const res = await fetch(`/api/admin/errors?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error();
      entries = (await res.json()).entries ?? [];
      failed = false;
      lastFetch = Date.now();
      now = lastFetch;
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  }

  async function clearLog() {
    const res = await fetch(`/api/admin/errors?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
    if (res.ok) entries = [];
    clearOpen = false;
  }

  async function copy(g) {
    try {
      await navigator.clipboard.writeText(g.msg);
      copied = g.key;
      setTimeout(() => copied === g.key && (copied = null), 1500);
    } catch {
      copied = null;
    }
  }

  $effect(() => {
    if (token) fetchLog();
  });

  $effect(() => {
    if (!autoRefresh || !token) return;
    const id = setInterval(fetchLog, 5000);
    return () => clearInterval(id);
  });

  const firstLine = (msg) => msg.split('\n')[0];
  const fmtTs = (ts) => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
</script>

<div class="adm-page">
  <PageHeader title="Erreurs">
    <button class="a-btn small" type="button" onclick={fetchLog} disabled={loading}>{loading ? '…' : 'Actualiser'}</button>
  </PageHeader>

  <div class="a-stack">
    {#if failed}<p class="a-card bad">Impossible de lire le journal du serveur.</p>{/if}

    <div class="a-kpis">
      <div class="a-kpi">
        <span class="a-kpi-label">Erreurs sur 24 h</span>
        <span class="a-kpi-value bad-v">{last24.error}</span>
        <span class="a-kpi-sub">{counts.error} problème{counts.error > 1 ? 's' : ''} différent{counts.error > 1 ? 's' : ''}</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Avertissements sur 24 h</span>
        <span class="a-kpi-value warn-v">{last24.warn}</span>
        <span class="a-kpi-sub">{counts.warn} différent{counts.warn > 1 ? 's' : ''}</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Dernière heure</span>
        <span class="a-kpi-value">{lastHour}</span>
        <span class="a-kpi-sub">{peak.error + peak.warn ? `pic à ${peak.h} h (${peak.error + peak.warn})` : 'aucun pic'}</span>
      </div>
    </div>

    <section class="a-section">
      <div class="a-section-head">
        <h2>Par heure</h2>
        <span class="legend"><i class="e"></i>erreurs <i class="w"></i>avertissements</span>
      </div>
      <div class="chart" bind:clientWidth={W}>
        <svg viewBox="0 0 {W} {CH + 18}" role="img" aria-label="Erreurs et avertissements par heure sur 24 heures">
          <line x1="0" x2={W} y1={CH} y2={CH} class="axis" />
          {#each hours as b, i (b.start)}
            {@const x = i * bw + bw * 0.15}
            {@const w = bw * 0.7}
            <rect {x} y={CH - yh(b.error)} width={w} height={yh(b.error)} class="e"><title>{b.h} h : {b.error} erreur(s), {b.warn} avertissement(s)</title></rect>
            <rect {x} y={CH - yh(b.error) - yh(b.warn)} width={w} height={yh(b.warn)} class="w"><title>{b.h} h : {b.error} erreur(s), {b.warn} avertissement(s)</title></rect>
            {#if i % 4 === 3}<text x={x + w / 2} y={CH + 14} text-anchor="middle">{b.h} h</text>{/if}
          {/each}
          <text x={W} y="10" text-anchor="end" class="max">max {maxH}</text>
        </svg>
      </div>
      <p class="a-muted note">Le serveur garde les 300 derniers messages. Le journal repart de zéro à chaque redémarrage.</p>
    </section>

    <div class="a-toolbar">
      <label class="a-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span class="a-sr">Rechercher</span>
        <input type="search" placeholder="Chercher dans les messages…" bind:value={q} />
      </label>
      <select class="a-select sort" bind:value={sort} aria-label="Trier">
        <option value="count">Les plus fréquentes</option>
        <option value="last">Les plus récentes</option>
      </select>
    </div>
    <div class="bar">
      <div class="a-chips" role="group" aria-label="Filtrer">
        {#each LEVELS as l (l.key)}
          <button class="a-chip" type="button" aria-pressed={level === l.key} onclick={() => (level = l.key)}>{l.label}<b>{counts[l.key]}</b></button>
        {/each}
      </div>
      <label class="a-check auto"><input type="checkbox" bind:checked={autoRefresh} /> Mise à jour auto</label>
    </div>

    {#if shown.length === 0}
      <p class="a-card a-empty">{entries.length ? 'Aucun message ne correspond.' : 'Aucune erreur enregistrée. 🎉'}</p>
    {:else}
      <ul class="a-list">
        {#each shown as g (g.key)}
          <li>
            <details class="err {g.level}">
              <summary>
                <span class="count">{g.count}<small>×</small></span>
                <span class="a-row-main">
                  <span class="title">{firstLine(g.msg)}</span>
                  <span class="a-row-sub">
                    <em class="a-tag {g.level === 'error' ? 'bad' : 'warn'}">{g.level === 'error' ? 'Erreur' : 'Avertissement'}</em>
                    dernière fois {ago(g.last, now)}{g.count > 1 ? ` · première ${ago(g.first, now)}` : ''}
                  </span>
                </span>
              </summary>
              <div class="body">
                <pre>{g.msg}</pre>
                <div class="foot">
                  <span class="a-muted">{fmtTs(g.last)}</span>
                  <button class="a-btn small" type="button" onclick={() => copy(g)}>{copied === g.key ? 'Copié' : 'Copier le message'}</button>
                </div>
              </div>
            </details>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="end">
      {#if lastFetch}<span class="a-muted">Mis à jour à {new Date(lastFetch).toLocaleTimeString('fr-FR')}</span>{/if}
      <button class="a-btn small danger" type="button" disabled={!entries.length} onclick={() => (clearOpen = true)}>Vider le journal</button>
    </div>
  </div>
</div>

<Sheet bind:open={clearOpen} title="Vider le journal">
  <p>Effacer définitivement les {entries.length} messages enregistrés ? Les nouvelles erreurs continueront d’arriver.</p>
  <div class="a-btns confirm">
    <button class="a-btn" type="button" onclick={() => (clearOpen = false)}>Annuler</button>
    <button class="a-btn danger" type="button" onclick={clearLog}>Tout effacer</button>
  </div>
</Sheet>

<style>
  .bad-v { color: var(--a-bad); }
  .warn-v { color: var(--a-warn); }

  .legend { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--a-muted); }
  .legend i { width: 10px; height: 10px; margin-left: 6px; border-radius: 3px; }
  .legend i.e { background: var(--a-bad); }
  .legend i.w { background: var(--a-warn); }
  .chart { min-width: 0; }
  .chart svg { display: block; width: 100%; height: auto; overflow: visible; }
  .chart svg text { fill: var(--a-dim); font-size: 11px; font-family: inherit; }
  .axis { stroke: var(--a-line); }
  rect.e { fill: var(--a-bad); }
  rect.w { fill: var(--a-warn); }
  .note { font-size: 0.78rem; }

  .sort { flex: 0 1 220px; width: auto; }
  .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  .bar .a-chips { min-width: 0; }
  .auto { font-size: 0.85rem; color: var(--a-muted); }

  .err { border: 1px solid var(--a-line); border-left: 3px solid var(--a-bad); border-radius: 14px; background: var(--a-surface); }
  .err.warn { border-left-color: var(--a-warn); }
  .err[open] { border-color: var(--a-dim); }
  summary { display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  .count { flex: 0 0 auto; min-width: 48px; font-family: var(--a-display); font-size: 1.5rem; font-weight: 800; text-align: center; font-variant-numeric: tabular-nums; }
  .count small { font-size: 0.9rem; color: var(--a-dim); }
  .title { display: -webkit-box; overflow: hidden; font-size: 0.9rem; font-weight: 600; overflow-wrap: anywhere; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
  .a-row-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; white-space: normal; }
  .body { display: grid; gap: 10px; padding: 0 14px 14px; }
  pre { max-height: 320px; overflow: auto; padding: 12px; border-radius: 10px; background: var(--a-bg); font-size: 0.78rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
  .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.8rem; }

  .end { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.8rem; }
  .confirm { margin-top: 14px; }
</style>
