<script>
  import { getContext } from 'svelte';
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

  $effect(() => {
    void days;
    void token;
    loadStats();
  });

  const sparkOf = (serie) => (serie ?? []).slice(-14).map((p) => p.n ?? p.y ?? 0);
  const chartSeries = $derived(
    !stats
      ? []
      : [
          {
            label: 'Visiteurs',
            color: 'var(--adm-accent)',
            points: stats.series.visitors.map((p) => ({ x: p.x, y: p.y })),
          },
          {
            label: 'Inscriptions',
            color: 'var(--adm-green)',
            points: stats.series.signups.map((p) => ({ x: p.day, y: p.n })),
          },
          {
            label: 'Joueurs actifs',
            color: 'var(--adm-amber)',
            points: stats.series.players.map((p) => ({ x: p.day, y: p.n })),
          },
        ].filter((s) => s.points.length > 0),
  );
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
      <StatCard
        label="Visiteurs 7 j"
        value={stats.hero.visitors7d.value}
        delta={stats.hero.visitors7d.delta}
        spark={sparkOf(stats.series.visitors)}
      />
      <StatCard
        label="Nouveaux inscrits 7 j"
        value={stats.hero.signups7d.value}
        delta={stats.hero.signups7d.delta}
        spark={sparkOf(stats.series.signups)}
      />
      <StatCard
        label="Joueurs actifs 7 j"
        value={stats.hero.players7d.value}
        delta={stats.hero.players7d.delta}
        spark={sparkOf(stats.series.players)}
      />
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

  <section class="panel maint-section" class:maint-on={maintEnabled}>
    <div class="maint-head">
      <h2>Mode maintenance</h2>
      <span class="maint-state" class:active={data.maintenance?.enabled}>
        {data.maintenance?.enabled ? '● Actif — site fermé' : '○ Inactif'}
      </span>
    </div>
    <form method="POST" action="?/maintenance" class="maint-form">
      <input type="hidden" name="_token" value={token} />
      <label class="maint-toggle">
        <input type="checkbox" name="enabled" bind:checked={maintEnabled} />
        Activer le mode maintenance (bloque tout le site sauf /admin)
      </label>
      <textarea
        name="message"
        rows="3"
        maxlength="500"
        placeholder="Message affiché aux visiteurs (optionnel)…"
        bind:value={maintMessage}
      ></textarea>
      <div class="maint-actions">
        <button type="submit" class="maint-btn">Appliquer</button>
        {#if form?.maintenanceSaved}<span class="maint-ok">Enregistré</span>{/if}
        {#if form?.maintenanceError}<span class="maint-err">{form.maintenanceError}</span>{/if}
      </div>
    </form>
  </section>
</div>

<style>
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
    font-family: 'Bricolage Grotesque', sans-serif;
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
    font-family: 'JetBrains Mono', monospace;
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
    font-family: 'JetBrains Mono', monospace;
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
    font-family: 'JetBrains Mono', monospace;
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

  .maint-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .maint-section.maint-on {
    border-color: var(--adm-red);
  }
  .maint-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
  }
  .maint-head h2 {
    margin-bottom: 0;
  }
  .maint-state {
    font-size: 0.8rem;
    color: var(--adm-muted);
  }
  .maint-state.active {
    color: var(--adm-red);
  }
  .maint-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .maint-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--adm-text);
    cursor: pointer;
  }
  .maint-toggle input {
    accent-color: var(--adm-red);
  }
  .maint-form textarea {
    background: var(--adm-glass);
    border: 1px solid var(--adm-border);
    border-radius: 8px;
    color: var(--adm-text);
    font-family: inherit;
    font-size: 0.85rem;
    padding: 8px 10px;
    resize: vertical;
  }
  .maint-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .maint-btn {
    background: transparent;
    border: 1px solid var(--adm-accent);
    color: var(--adm-accent);
    font-family: inherit;
    font-size: 0.8rem;
    letter-spacing: 0.03em;
    padding: 6px 18px;
    border-radius: 8px;
    cursor: pointer;
  }
  .maint-btn:hover {
    background: var(--adm-glass);
  }
  .maint-ok {
    font-size: 0.8rem;
    color: var(--adm-green);
  }
  .maint-err {
    font-size: 0.8rem;
    color: var(--adm-red);
  }
</style>
