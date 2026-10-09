<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import ZikleTrackSearch from '$lib/admin/ZikleTrackSearch.svelte';
  import { ago } from '$lib/admin/stats-utils.js';

  let { data, form } = $props();

  const day = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
  const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
  const lowStock = $derived(data.available < 30);

  function go(params) {
    const p = new SvelteURLSearchParams(page.url.searchParams);
    for (const [k, v] of Object.entries(params)) v ? p.set(k, v) : p.delete(k);
    goto(`?${p}`, { keepFocus: true, noScroll: true });
  }

  let search = $state(page.url.searchParams.get('q') ?? '');
  $effect(() => {
    const v = search;
    if (v === (page.url.searchParams.get('q') ?? '')) return;
    const id = setTimeout(() => go({ q: v, page: '' }), 300);
    return () => clearTimeout(id);
  });

  let addOpen = $state(false);
  let toRemove = $state(null);
  let removeOpen = $state(false);
  let busy = $state('');

  const submit = (name) => () => {
    busy = name;
    return async ({ result, update }) => {
      await update({ reset: false });
      busy = '';
      if (result.type === 'success') {
        addOpen = false;
        removeOpen = false;
      }
    };
  };
</script>

<div class="adm-page">
  <PageHeader title="Pool Zikle">
    <a class="a-btn small" href="/admin/zikle">Calendrier</a>
  </PageHeader>

  <div class="a-stack">
    <p class="a-muted intro">Le titre du jour est tiré au hasard dans ce pool, parmi ceux qui n'ont pas servi depuis un an.</p>

    <div class="a-kpis">
      <div class="a-kpi"><span class="a-kpi-label">Titres dans le pool</span><span class="a-kpi-value">{data.poolTotal}</span><span class="a-kpi-sub">{data.addedThisWeek ? `+${data.addedThisWeek} cette semaine` : data.lastAdded ? `dernier ajout ${ago(data.lastAdded)}` : 'vide'}</span></div>
      <div class="a-kpi" class:warn={lowStock}>
        <span class="a-kpi-label">Encore disponibles</span>
        <span class="a-kpi-value">{data.available}</span>
        <span class="a-kpi-sub" class:down={lowStock}>{lowStock ? 'Bientôt à court : ajoute des titres' : `environ ${data.available} jours de réserve`}</span>
      </div>
    </div>

    <div class="a-toolbar">
      <label class="a-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span class="a-sr">Chercher dans le pool</span>
        <input type="search" placeholder="Chercher un artiste ou un titre…" bind:value={search} />
      </label>
      <button class="a-btn primary" type="button" onclick={() => (addOpen = true)}>Ajouter un titre</button>
      <form method="POST" action="?/refreshPool" use:enhance={submit('refresh')}>
        <button class="a-btn" type="submit" disabled={busy === 'refresh'}>{busy === 'refresh' ? 'Mise à jour…' : 'Ajouter le top Deezer'}</button>
      </form>
    </div>

    {#if form?.done}<p class="a-card good">{form.done}</p>{/if}
    {#if form?.error}<p class="a-card bad">{form.error}</p>{/if}
    {#if data.error}<p class="a-card bad">{data.error}</p>{/if}

    <p class="a-muted count">{data.total} titre{data.total > 1 ? 's' : ''}{data.q ? ` pour « ${data.q} »` : ''}</p>
    <ul class="a-list">
      {#each data.rows as r (r.track_id)}
        <li class="a-row">
          {#if r.tracks?.cover_url}<img class="a-cover" src={r.tracks.cover_url} alt="" />{:else}<span class="a-cover"></span>{/if}
          <span class="a-row-main">
            <span class="a-row-title">{r.tracks?.title}</span>
            <span class="a-row-sub">{r.tracks?.artist} · ajouté {ago(r.added_at)}</span>
          </span>
          {#if r.playedOn}
            <em class="a-tag {r.playedOn > data.today ? 'good' : ''}">{r.playedOn > data.today ? 'Programmé' : 'Joué'} le {day(r.playedOn)}</em>
          {/if}
          {#if r.tracks?.preview_url}
            <a class="a-btn small hide-sm" href={r.tracks.preview_url} target="_blank" rel="noreferrer">Écouter</a>
          {/if}
          <button class="a-btn small" type="button" onclick={() => { toRemove = r; removeOpen = true; }}>Retirer</button>
        </li>
      {:else}
        <li class="a-empty">{data.q ? 'Aucun titre ne correspond.' : 'Le pool est vide.'}</li>
      {/each}
    </ul>

    {#if totalPages > 1}
      <div class="a-pager">
        <button class="a-btn small" type="button" disabled={data.page <= 1} onclick={() => go({ page: String(data.page - 1) })}>← Précédent</button>
        <span>{data.page} / {totalPages}</span>
        <button class="a-btn small" type="button" disabled={data.page >= totalPages} onclick={() => go({ page: String(data.page + 1) })}>Suivant →</button>
      </div>
    {/if}
  </div>
</div>

<Sheet bind:open={addOpen} title="Ajouter au pool">
  <form method="POST" action="?/addToPool" use:enhance={submit('add')}>
    <ZikleTrackSearch disabled={busy === 'add'} />
  </form>
</Sheet>

<Sheet bind:open={removeOpen} title="Retirer du pool">
  {#if toRemove}
    <p>Retirer <b>{toRemove.tracks?.title}</b> de {toRemove.tracks?.artist} ? Il ne pourra plus être tiré au hasard. Les jours déjà programmés ne changent pas.</p>
    <form method="POST" action="?/removeFromPool" class="a-btns confirm" use:enhance={submit('remove')}>
      <input type="hidden" name="track_id" value={toRemove.track_id} />
      <button class="a-btn danger" type="submit" disabled={busy === 'remove'}>Retirer</button>
    </form>
  {/if}
</Sheet>

<style>
  .intro { font-size: 0.88rem; }
  .a-kpi.warn { border-color: rgba(251, 191, 36, 0.35); background: var(--a-warn-soft); }
  .count { font-size: 0.82rem; }
  span.a-cover { display: inline-block; }
  .confirm { margin-top: 14px; }
  @media (max-width: 520px) {
    .hide-sm { display: none; }
    .a-row .a-tag { display: none; }
  }
</style>
