<script>
  import { getContext } from "svelte";
  import StatCard from "$lib/admin/StatCard.svelte";
  import TrendChart from "$lib/admin/TrendChart.svelte";

  let { data, form } = $props();
  const adminCtx = getContext("adminToken");
  const token = $derived(adminCtx?.token ?? "");

  let stats = $state(null);
  let days = $state(30);
  let loading = $state(true);
  let maintEnabled = $state(data.maintenance?.enabled ?? false);
  let maintMessage = $state(data.maintenance?.message ?? "");

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
            label: "Inscriptions",
            color: "#6366f1",
            points: stats.series.signups.map((p) => ({ x: p.day, y: p.n })),
          },
          {
            label: "Joueurs actifs",
            color: "#f59e0b",
            points: stats.series.players.map((p) => ({ x: p.day, y: p.n })),
          },
          {
            label: "Parties",
            color: "#22c55e",
            points: stats.series.games.map((p) => ({ x: p.day, y: p.n })),
          },
          {
            label: "Zikle",
            color: "#38bdf8",
            points: stats.series.zikle.map((p) => ({ x: p.day, y: p.n })),
          },
        ].filter((s) => s.points.length > 0),
  );
</script>

<div class="dash">
  <div class="dash-head">
    <h1>Dashboard</h1>
    <div class="period">
      {#each [30, 60, 90] as d (d)}
        <button class:active={days === d} onclick={() => (days = d)}>{d} j</button>
      {/each}
    </div>
  </div>

  {#if stats}
    <div class="hero">
      <StatCard
        label="Inscrits 7 j"
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
      <StatCard
        label="Parties 7 j"
        value={stats.hero.games7d.value}
        delta={stats.hero.games7d.delta}
        spark={sparkOf(stats.series.games)}
      />
      <StatCard
        label="Zikle 7 j"
        value={stats.hero.zikle7d.value}
        delta={stats.hero.zikle7d.delta}
        spark={sparkOf(stats.series.zikle)}
      />
    </div>

    <div class="panel">
      <div class="panel-head">
        <span class="panel-label">Tendances</span>
        <span class="panel-sub">{days} derniers jours</span>
      </div>
      <TrendChart series={chartSeries} />
    </div>

    <div class="secondary">
      <div class="panel">
        <div class="panel-head">
          <span class="panel-label">Zikle du jour</span>
        </div>
        <div class="stat-grid">
          <div class="stat-block">
            <span class="stat-val indigo">{stats.zikle.today.total}</span>
            <span class="stat-lbl">Participants</span>
          </div>
          <div class="stat-block">
            <span
              class="stat-val"
              class:green={stats.zikle.today.winRate >= 50}
              class:red={stats.zikle.today.total > 0 && stats.zikle.today.winRate < 50}
            >{stats.zikle.today.total > 0 ? `${stats.zikle.today.winRate} %` : "—"}</span>
            <span class="stat-lbl">Taux de victoire</span>
          </div>
          <div class="stat-block">
            <span class="stat-val">{stats.zikle.today.total > 0 ? stats.zikle.today.avgAttempts : "—"}</span>
            <span class="stat-lbl">Essais moyens</span>
          </div>
          <div class="stat-block">
            <span class="stat-val">{stats.totals.ziklePool}</span>
            <span class="stat-lbl">Titres dans le pool</span>
          </div>
        </div>
        <div class="divider"></div>
        <div class="inline-row">
          <span class="il-lbl">7 derniers jours</span>
          <span class="il-val">{stats.zikle.sevenDays.total} joueurs</span>
          <span class="il-sep">·</span>
          <span class="il-val" class:green={stats.zikle.sevenDays.winRate >= 50}>
            {stats.zikle.sevenDays.total > 0 ? `${stats.zikle.sevenDays.winRate} % de victoires` : "—"}
          </span>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-label">Rétention</span>
        </div>
        <div class="kpi-list">
          <div class="kpi-row">
            <span>Joueurs invités (7 j)</span>
            <b>{stats.kpis.guestPct} %</b>
          </div>
          <div class="kpi-row">
            <span>Rétention J7</span>
            <div class="kpi-right">
              <b class:green={stats.kpis.retention.pct >= 20}>{stats.kpis.retention.pct} %</b>
              <small>{stats.kpis.retention.retained} / {stats.kpis.retention.cohort} inscrits</small>
            </div>
          </div>
          <div class="kpi-row">
            <span>Zikle win rate 7 j</span>
            <b
              class:green={stats.zikle.sevenDays.winRate >= 50}
              class:red={stats.zikle.sevenDays.total > 0 && stats.zikle.sevenDays.winRate < 30}
            >{stats.zikle.sevenDays.total > 0 ? `${stats.zikle.sevenDays.winRate} %` : "—"}</b>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-label">Totaux</span>
        </div>
        <div class="kpi-list">
          <div class="kpi-row">
            <span>Inscrits</span>
            <b>{stats.totals.users.toLocaleString("fr-FR")}</b>
          </div>
          <div class="kpi-row">
            <span>Parties jouées</span>
            <b>{stats.totals.games.toLocaleString("fr-FR")}</b>
          </div>
          <div class="kpi-row">
            <span>Jours Zikle joués</span>
            <b>{stats.totals.zikleDays}</b>
          </div>
          <div class="kpi-row">
            <span>Pool Zikle</span>
            <b>{stats.totals.ziklePool} titres</b>
          </div>
        </div>
      </div>
    </div>

  {:else if loading}
    <p class="status">Chargement…</p>
  {:else}
    <p class="status err">Impossible de charger les statistiques.</p>
  {/if}

  <div class="ops-bar">
    <div class="ops-item">
      <span class="ops-lbl">Reports en attente</span>
      <span class="ops-val" class:amber={data.ops.pendingReports > 0}>{data.ops.pendingReports}</span>
    </div>
    <div class="ops-item">
      <span class="ops-lbl">Rooms publiques</span>
      <span class="ops-val">{data.ops.publicRooms}</span>
    </div>
    <div class="ops-item">
      <span class="ops-lbl">Uptime</span>
      <span class="ops-val">{data.ops.uptime}</span>
    </div>
    <div class="ops-links">
      <a href="/admin/live">Live →</a>
      <a href="/admin/reports">Reports →</a>
      <a href="/admin/users">Utilisateurs →</a>
    </div>
  </div>

  <div class="panel maint" class:maint-on={maintEnabled}>
    <div class="panel-head">
      <span class="panel-label">Mode maintenance</span>
      <span class="maint-status" class:active={data.maintenance?.enabled}>
        {data.maintenance?.enabled ? "Actif — site fermé" : "Inactif"}
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
  </div>
</div>

<style>
  .dash {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-dim: #374151;
    --c-green: #22c55e;
    --c-red: #ef4444;
    --c-amber: #f59e0b;
    --c-indigo: #6366f1;
    --c-sky: #38bdf8;
    /* Pour StatCard / TrendChart */
    --adm-glass: rgba(255, 255, 255, 0.025);
    --adm-border: rgba(255, 255, 255, 0.07);
    --adm-text: #e2e8f0;
    --adm-muted: #6b7280;
    --adm-accent: #6366f1;
    --adm-green: #22c55e;
    --adm-red: #ef4444;
    --adm-panel: #13161e;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--c-text);
  }

  /* En-tête */
  .dash-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .dash-head h1 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--c-text);
    letter-spacing: -0.02em;
  }
  .period {
    display: flex;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
  }
  .period button {
    background: none;
    border: none;
    color: var(--c-muted);
    padding: 4px 14px;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .period button.active {
    background: rgba(255, 255, 255, 0.07);
    color: var(--c-text);
  }

  /* Hero */
  .hero {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  /* Panel */
  .panel {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .panel-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .panel-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text);
  }
  .panel-sub {
    font-size: 0.75rem;
    color: var(--c-muted);
  }

  /* Zikle du jour */
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 20px;
  }
  .stat-block {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .stat-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.7rem;
    font-weight: 600;
    color: var(--c-text);
    line-height: 1;
  }
  .stat-val.indigo { color: var(--c-indigo); }
  .stat-val.green  { color: var(--c-green); }
  .stat-val.red    { color: var(--c-red); }
  .stat-lbl {
    font-size: 0.72rem;
    color: var(--c-muted);
  }
  .divider {
    height: 1px;
    background: var(--c-border);
  }
  .inline-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    flex-wrap: wrap;
  }
  .il-lbl { color: var(--c-muted); font-size: 0.75rem; }
  .il-val { color: var(--c-text); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
  .il-val.green { color: var(--c-green); }
  .il-sep { color: var(--c-dim); }

  /* KPI list */
  .kpi-list { display: flex; flex-direction: column; }
  .kpi-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 0;
    font-size: 0.84rem;
    border-bottom: 1px solid var(--c-border);
  }
  .kpi-row:last-child { border-bottom: none; padding-bottom: 0; }
  .kpi-row > span:first-child { color: var(--c-muted); }
  .kpi-row b {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--c-text);
  }
  .kpi-row b.green { color: var(--c-green); }
  .kpi-row b.red   { color: var(--c-red); }
  .kpi-right {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .kpi-right small { font-size: 0.72rem; color: var(--c-muted); }

  /* Grid secondaire */
  .secondary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  /* Status */
  .status { color: var(--c-muted); font-size: 0.85rem; padding: 8px 0; }
  .status.err { color: var(--c-red); }

  /* Ops bar */
  .ops-bar {
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    overflow: hidden;
    flex-wrap: wrap;
  }
  .ops-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 20px;
    border-right: 1px solid var(--c-border);
  }
  .ops-lbl {
    font-size: 0.68rem;
    color: var(--c-muted);
    white-space: nowrap;
  }
  .ops-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--c-text);
  }
  .ops-val.amber { color: var(--c-amber); }
  .ops-links {
    display: flex;
    gap: 0;
    margin-left: auto;
  }
  .ops-links a {
    padding: 12px 18px;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--c-muted);
    border-left: 1px solid var(--c-border);
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .ops-links a:hover {
    color: var(--c-text);
    background: rgba(255, 255, 255, 0.04);
  }

  /* Maintenance */
  .maint { gap: 14px; }
  .maint.maint-on { border-color: rgba(239, 68, 68, 0.4); }
  .maint-status {
    font-size: 0.75rem;
    color: var(--c-muted);
    margin-left: auto;
  }
  .maint-status.active { color: var(--c-red); }
  .maint-form { display: flex; flex-direction: column; gap: 10px; }
  .maint-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    color: var(--c-text);
    cursor: pointer;
  }
  .maint-toggle input { accent-color: var(--c-red); }
  .maint-form textarea {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.84rem;
    padding: 9px 12px;
    resize: vertical;
  }
  .maint-form textarea::placeholder { color: var(--c-muted); }
  .maint-actions { display: flex; align-items: center; gap: 12px; }
  .maint-btn {
    background: transparent;
    border: 1px solid var(--c-border);
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    padding: 7px 20px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .maint-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
  .maint-ok  { font-size: 0.8rem; color: var(--c-green); }
  .maint-err { font-size: 0.8rem; color: var(--c-red); }

  @media (max-width: 1100px) {
    .hero      { grid-template-columns: repeat(2, 1fr); }
    .secondary { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 680px) {
    .hero      { grid-template-columns: 1fr 1fr; }
    .secondary { grid-template-columns: 1fr; }
    .ops-links { margin-left: 0; }
  }
</style>
