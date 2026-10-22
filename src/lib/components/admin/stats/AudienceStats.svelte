<script>
  import LineChart from '$lib/components/admin/LineChart.svelte';
  import { dayLabel } from './metrics.js';

  /** Audience : joueurs actifs, qui joue chaque semaine et rétention des inscrits. */
  let { data, days } = $props();

  const signupTotal = $derived(data.signups.reduce((n, d) => n + d.n, 0));
  const breakdownMax = $derived(Math.max(1, ...data.breakdown.map((w) => w.new_users + w.returning_users + w.resurrected)));
</script>

<h2 class="a-h2">Audience</h2>
<div class="a-cols">
  <section class="a-section">
    <div class="a-section-head"><h3>Joueurs actifs par jour</h3><span class="a-muted small">{days} derniers jours</span></div>
    <LineChart points={data.actives.map((d) => ({ label: dayLabel(d.day), value: d.n }))} />
  </section>
  <div class="a-kpis">
    <div class="a-kpi"><span class="a-kpi-label">Aujourd'hui</span><span class="a-kpi-value">{data.audience?.dau ?? '–'}</span><span class="a-kpi-sub">joueurs actifs</span></div>
    <div class="a-kpi"><span class="a-kpi-label">Cette semaine</span><span class="a-kpi-value">{data.audience?.wau ?? '–'}</span><span class="a-kpi-sub">joueurs actifs</span></div>
    <div class="a-kpi"><span class="a-kpi-label">Ce mois</span><span class="a-kpi-value">{data.audience?.mau ?? '–'}</span><span class="a-kpi-sub">joueurs actifs</span></div>
    <div class="a-kpi"><span class="a-kpi-label">Inscriptions</span><span class="a-kpi-value">{signupTotal}</span><span class="a-kpi-sub">sur {days} jours</span></div>
  </div>
</div>

<div class="a-cols even">
  <section class="a-section">
    <div class="a-section-head"><h3>Qui joue chaque semaine</h3></div>
    <div class="stack-bars">
      {#each data.breakdown as w (w.week)}
        {@const total = w.new_users + w.returning_users + w.resurrected}
        <div class="sb-row">
          <span class="sb-lbl">{dayLabel(w.week)}</span>
          <span class="sb-bar">
            <i class="new" style:width="{(w.new_users / breakdownMax) * 100}%"></i>
            <i class="ret" style:width="{(w.returning_users / breakdownMax) * 100}%"></i>
            <i class="back" style:width="{(w.resurrected / breakdownMax) * 100}%"></i>
          </span>
          <b>{total}</b>
        </div>
      {/each}
    </div>
    <div class="keys">
      <span><i class="new"></i>Nouveaux</span>
      <span><i class="ret"></i>Fidèles</span>
      <span><i class="back"></i>Revenus après une pause</span>
    </div>
  </section>

  <section class="a-section">
    <div class="a-section-head"><h3>Reviennent-ils ?</h3></div>
    <p class="a-muted small">Part des inscrits de chaque semaine qui rejouent 1, 2, 3 et 4 semaines après.</p>
    <div class="a-table-wrap">
      <table class="a-table cohort">
        <thead><tr><th>Inscrits la semaine du</th><th class="num">Inscrits</th><th class="num">S+1</th><th class="num">S+2</th><th class="num">S+3</th><th class="num">S+4</th></tr></thead>
        <tbody>
          {#each data.cohorts as c (c.cohort_week)}
            <tr>
              <td>{dayLabel(c.cohort_week)}</td>
              <td class="num">{c.cohort_size}</td>
              {#each [c.w1, c.w2, c.w3, c.w4] as v, i (i)}
                {@const p = c.cohort_size ? Math.round((v / c.cohort_size) * 100) : 0}
                {@const done = new Date(c.cohort_week).getTime() + (i + 2) * 7 * 86400000 <= Date.now()}
                <td class="num heat" style:--h={done ? Math.min(1, p / 30) : 0}>{done ? `${p} %` : '·'}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

<style>
  .small { font-size: 0.8rem; }
  .stack-bars { display: grid; gap: 6px; }
  .sb-row { display: grid; grid-template-columns: 56px 1fr 36px; align-items: center; gap: 8px; font-size: 0.8rem; }
  .sb-lbl { color: var(--a-dim); }
  .sb-row b { text-align: right; font-variant-numeric: tabular-nums; }
  .sb-bar { display: flex; height: 14px; border-radius: 4px; background: var(--a-surface2); overflow: hidden; }
  .sb-bar i, .keys i.new, .keys i.ret, .keys i.back { display: block; height: 100%; }
  .new { background: var(--a-accent); }
  .ret { background: var(--a-cyan); }
  .back { background: var(--a-warn); }
  .cohort td.heat { background: rgba(74, 222, 128, calc(var(--h) * 0.45)); }
</style>
