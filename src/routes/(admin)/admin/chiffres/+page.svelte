<script>
  import { getContext } from 'svelte';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import PulsePanel from '$lib/components/admin/stats/PulsePanel.svelte';
  import AudienceStats from '$lib/components/admin/stats/AudienceStats.svelte';
  import TrafficStats from '$lib/components/admin/stats/TrafficStats.svelte';
  import { INFO } from '$lib/components/admin/stats/metrics.js';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let { data } = $props();
  const days = $derived(data.days);
  let info = $state(null);
  let sheetOpen = $state(false);

  function explain(key) {
    info = INFO[key];
    sheetOpen = true;
  }
</script>

<div class="adm-page">
  <PageHeader title="Chiffres">
    <div class="seg" role="group" aria-label="Période">
      {#each [7, 30, 90] as d (d)}
        <a href="?j={d}" class:on={days === d} aria-current={days === d ? 'page' : undefined}>{d} j</a>
      {/each}
    </div>
  </PageHeader>

  <div class="stack">
    <PulsePanel {days} {token} onExplain={explain} />

    <AudienceStats {data} {days} />

    <TrafficStats {data} {days} />
  </div>
</div>

<Sheet bind:open={sheetOpen} title={info?.title ?? ''}>
  {#if info}
    <dl class="explain">
      <div><dt>Ce que ça mesure</dt><dd>{info.what}</dd></div>
      <div><dt>Comment c'est calculé</dt><dd>{info.how}</dd></div>
      <div><dt>Objectif</dt><dd>{info.goal}</dd></div>
    </dl>
  {/if}
</Sheet>

<style>
  .stack { display: grid; gap: 14px; padding-top: 16px; color: var(--a-fg); }

  .seg { display: flex; padding: 3px; border: 1px solid var(--a-line); border-radius: 99px; background: var(--a-surface); }
  .seg a {
    padding: 5px 11px;
    border: 0;
    border-radius: 99px;
    background: none;
    color: var(--a-muted);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }
  .seg a.on { background: var(--a-accent); color: #1a0018; }

  /* Légendes des graphiques, partagées par les blocs */
  .stack :global(.keys) { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; font-size: 0.82rem; color: var(--a-muted); }
  .stack :global(.keys span) { display: inline-flex; align-items: center; gap: 6px; }
  .stack :global(.keys i) { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
  .stack :global(.keys b) { color: var(--a-fg); }

  .explain { display: grid; gap: 14px; }
  .explain dt { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--a-accent); }
  .explain dd { max-width: 60ch; margin-top: 2px; line-height: 1.45; }
</style>
