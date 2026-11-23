<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getContext } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import TrackList from '$lib/components/admin/tracks/TrackList.svelte';
  import TrackSheet from '$lib/components/admin/tracks/TrackSheet.svelte';
  import { pct } from '$lib/shared/admin/stats-utils.js';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  const FILTERS = [
    ['all', 'Tous', 'total'],
    ['nopin', 'Sans vidéo épinglée', 'nopin'],
    ['nopreview', 'Sans extrait', 'nopreview'],
    ['reported', 'Signalés', 'reported'],
  ];
  const SORTS = [
    ['recent', 'Ajoutés récemment'],
    ['artist', 'Artiste (A → Z)'],
    ['title', 'Titre (A → Z)'],
  ];

  let sheet = $state();
  let sheetOpen = $state(false);
  let searchTimer;

  const totalPages = $derived(Math.max(1, Math.ceil(data.count / data.pageSize)));
  const fmt = (n) => n.toLocaleString('fr-FR');

  function setParam(key, value) {
    const p = new SvelteURLSearchParams(page.url.searchParams);
    if (value && value !== 'all') p.set(key, value);
    else p.delete(key);
    if (key !== 'page') p.delete('page');
    p.delete('open');
    goto(`?${p}`, { keepFocus: true, noScroll: key !== 'page' });
  }

  function onSearch(e) {
    clearTimeout(searchTimer);
    const v = e.currentTarget.value;
    searchTimer = setTimeout(() => setParam('q', v.trim()), 300);
  }
  $effect(() => () => clearTimeout(searchTimer));
</script>

<div class="adm-page">
  <PageHeader title="Titres" />

  <div class="a-stack">
    <div class="a-kpis">
      <div class="a-kpi">
        <span class="a-kpi-label">Titres au catalogue</span>
        <span class="a-kpi-value">{fmt(data.kpis.total)}</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Avec vidéo épinglée</span>
        <span class="a-kpi-value">{fmt(data.kpis.pinned)}</span>
        <div class="a-meter"><i class="good" style="width:{pct(data.kpis.pinned, data.kpis.total)}%"></i></div>
        <span class="a-kpi-sub">{pct(data.kpis.pinned, data.kpis.total)} % du catalogue</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Sans extrait</span>
        <span class="a-kpi-value">{fmt(data.kpis.nopreview)}</span>
        <div class="a-meter"><i class="warn" style="width:{pct(data.kpis.nopreview, data.kpis.total)}%"></i></div>
        <span class="a-kpi-sub">{pct(data.kpis.nopreview, data.kpis.total)} % muets en room</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Signalés</span>
        <span class="a-kpi-value">{fmt(data.kpis.reported)}</span>
        <span class="a-kpi-sub"><a href="/admin/reparer">voir dans Réparer</a></span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Réponses en plus</span>
        <span class="a-kpi-value">{fmt(data.kpis.answers)}</span>
        <span class="a-kpi-sub">films, séries, personnages…</span>
      </div>
    </div>

    <div class="a-toolbar">
      <label class="a-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span class="a-sr">Rechercher un titre</span>
        <input type="search" placeholder="Artiste ou titre…" value={data.q} oninput={onSearch} />
      </label>
      <select class="a-select sort" aria-label="Trier" value={data.sort} onchange={(e) => setParam('sort', e.currentTarget.value === 'recent' ? '' : e.currentTarget.value)}>
        {#each SORTS as [k, l] (k)}<option value={k}>{l}</option>{/each}
      </select>
    </div>

    <div class="a-chips" role="group" aria-label="Filtrer">
      {#each FILTERS as [k, l, kpi] (k)}
        <button class="a-chip" type="button" aria-pressed={data.filter === k} onclick={() => setParam('f', k)}>{l}<b>{fmt(data.kpis[kpi])}</b></button>
      {/each}
    </div>

    {#if form?.error && !sheetOpen}<p class="a-card bad">{form.error}</p>{/if}
    {#if data.error}<p class="a-card bad">{data.error}</p>{/if}

    {#if !data.tracks.length}
      <p class="a-card a-empty">{data.filter === 'reported' ? 'Aucun titre signalé. Tout va bien.' : 'Aucun titre ne correspond.'}</p>
    {:else}
      <TrackList
        tracks={data.tracks} count={data.count} page={data.page} {totalPages}
        onOpen={(id, tab) => sheet.open(id, tab)}
        onPage={(n) => setParam('page', String(n))}
      />
    {/if}
  </div>
</div>

<TrackSheet bind:this={sheet} bind:sheetOpen {token} {form} />

<style>
  .sort { flex: 0 0 auto; width: auto; }
</style>
