<script>
  import LineChart from '$lib/components/admin/LineChart.svelte';
  import { MEDIUM, dayLabel } from './metrics.js';

  /** D'où viennent les visiteurs : visites, canaux, sources et pages d'arrivée. */
  let { data, days } = $props();

  const trafficTotal = $derived(data.traffic.reduce((n, d) => n + d.n, 0));
  const mediumTotal = $derived(data.mediums.reduce((n, m) => n + m.n, 0) || 1);
</script>

<h2 class="a-h2">D'où viennent les visiteurs</h2>
<div class="a-cols">
  <section class="a-section">
    <div class="a-section-head"><h3>Visites par jour</h3><span class="a-muted small">{trafficTotal.toLocaleString('fr-FR')} sur {days} jours</span></div>
    <LineChart points={data.traffic.map((d) => ({ label: dayLabel(d.day), value: d.n }))} color="var(--a-cyan)" />
    <div class="medium-bar" aria-hidden="true">
      {#each data.mediums as m (m.medium)}
        <i style:width="{(m.n / mediumTotal) * 100}%" style:background={MEDIUM[m.medium]?.color ?? 'var(--a-dim)'}></i>
      {/each}
    </div>
    <div class="keys">
      {#each data.mediums as m (m.medium)}
        <span><i style:background={MEDIUM[m.medium]?.color ?? 'var(--a-dim)'}></i>{MEDIUM[m.medium]?.label ?? m.medium} <b>{Math.round((m.n / mediumTotal) * 100)} %</b></span>
      {/each}
    </div>
  </section>
  <section class="a-section">
    <div class="a-section-head"><h3>Meilleures sources</h3></div>
    <ul class="ranks">
      {#each data.sources as s (s.source + s.medium)}
        <li>
          <span class="r-name">{s.source}<em>{MEDIUM[s.medium]?.label ?? s.medium}</em></span>
          <span class="a-meter"><i style:width="{(s.n / (data.sources[0]?.n || 1)) * 100}%" style:background={MEDIUM[s.medium]?.color}></i></span>
          <b>{s.n}</b>
        </li>
      {:else}
        <li class="a-muted">Aucune visite enregistrée.</li>
      {/each}
    </ul>
  </section>
</div>
<section class="a-section">
  <div class="a-section-head"><h3>Pages d'arrivée</h3></div>
  <ul class="ranks">
    {#each data.landings as l (l.path)}
      <li>
        <a class="r-name" href={l.path} target="_blank" rel="noopener noreferrer">{l.path}</a>
        <span class="a-meter"><i style:width="{(l.n / (data.landings[0]?.n || 1)) * 100}%"></i></span>
        <b>{l.n}</b>
      </li>
    {/each}
  </ul>
</section>

<style>
  .small { font-size: 0.8rem; }
  .medium-bar { display: flex; gap: 2px; height: 12px; margin-top: 6px; border-radius: 6px; overflow: hidden; }
  .medium-bar i { display: block; height: 100%; }
  .ranks { display: grid; gap: 10px; list-style: none; }
  .ranks li { display: grid; grid-template-columns: minmax(0, 1.2fr) 1fr 44px; align-items: center; gap: 10px; font-size: 0.85rem; }
  .ranks b { text-align: right; font-variant-numeric: tabular-nums; }
  .r-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .r-name em { margin-left: 6px; font-size: 0.72rem; font-style: normal; color: var(--a-dim); }
  a.r-name:hover { color: var(--a-accent); }
</style>
