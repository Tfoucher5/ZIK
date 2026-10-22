<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import PlaylistTile from '$lib/components/admin/playlist/PlaylistTile.svelte';
  import PlaylistFlags from '$lib/components/admin/playlist/PlaylistFlags.svelte';
  import PlaylistEditForm from '$lib/components/admin/playlist/PlaylistEditForm.svelte';
  import TopPlaylists from '$lib/components/admin/playlist/TopPlaylists.svelte';
  import { ago } from '$lib/shared/admin/stats-utils.js';

  let { data, form } = $props();

  const FILTERS = [
    ['all', 'Toutes', 'total'],
    ['official', 'Officielles', 'official'],
    ['public', 'Publiques', 'public'],
    ['private', 'Privées', 'private'],
    ['empty', 'Vides', 'empty'],
  ];
  const SORTS = [
    ['tracks', 'Plus de titres'],
    ['recent', 'Récentes'],
    ['name', 'Nom'],
  ];

  let editing = $state(null);
  let editOpen = $state(false);
  let deleting = $state(null);
  let deleteOpen = $state(false);
  let busy = $state(false);
  let searchTimer;

  const totalPages = $derived(Math.max(1, Math.ceil(data.count / data.pageSize)));
  const fmt = (n) => n.toLocaleString('fr-FR');

  function setParam(key, value) {
    const p = new SvelteURLSearchParams(page.url.searchParams);
    if (value && value !== 'all') p.set(key, value);
    else p.delete(key);
    if (key !== 'page') p.delete('page');
    goto(`?${p}`, { keepFocus: true, noScroll: key !== 'page' });
  }

  function onSearch(e) {
    clearTimeout(searchTimer);
    const v = e.currentTarget.value;
    searchTimer = setTimeout(() => setParam('q', v.trim()), 300);
  }
  $effect(() => () => clearTimeout(searchTimer));

  function edit(pl) {
    editing = { ...pl };
    editOpen = true;
  }
  function askDelete(pl) {
    deleting = pl;
    deleteOpen = true;
  }

  const keep = () => async ({ update }) => {
    await update({ reset: false });
  };
  const closing = (close) => () => {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      await update({ reset: false });
      if (result.type === 'success' && result.data?.success) close();
    };
  };
</script>

{#snippet actions(pl)}
  <a class="a-btn small" href="/admin/playlists/{pl.id}">Ouvrir</a>
  <button class="a-btn small" type="button" onclick={() => edit(pl)}>Modifier</button>
  <button class="a-btn small danger" type="button" onclick={() => askDelete(pl)}>Supprimer</button>
{/snippet}

<div class="adm-page">
  <PageHeader title="Playlists" />

  <div class="a-stack">
    <div class="a-kpis">
      <div class="a-kpi">
        <span class="a-kpi-label">Playlists</span>
        <span class="a-kpi-value">{fmt(data.kpis.total)}</span>
        <span class="a-kpi-sub">{data.kpis.empty} vides</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Officielles</span>
        <span class="a-kpi-value">{fmt(data.kpis.official)}</span>
        <span class="a-kpi-sub">jouées dans les rooms du site</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Publiques / privées</span>
        <span class="a-kpi-value">{fmt(data.kpis.public)}<small> / {fmt(data.kpis.private)}</small></span>
        <div class="a-meter"><i style="width:{(data.kpis.public / Math.max(1, data.kpis.total)) * 100}%"></i></div>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Titres au total</span>
        <span class="a-kpi-value">{fmt(data.kpis.entries)}</span>
        <span class="a-kpi-sub">≈ {Math.round(data.kpis.entries / Math.max(1, data.kpis.total))} par playlist</span>
      </div>
    </div>

    <div class="a-cols">
      <div>
        <div class="a-toolbar">
          <label class="a-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span class="a-sr">Rechercher une playlist</span>
            <input type="search" placeholder="Rechercher une playlist…" value={data.q} oninput={onSearch} />
          </label>
          <select class="a-select sort" aria-label="Trier" value={data.sort} onchange={(e) => setParam('sort', e.currentTarget.value === 'tracks' ? '' : e.currentTarget.value)}>
            {#each SORTS as [k, l] (k)}<option value={k}>{l}</option>{/each}
          </select>
        </div>

        <div class="a-chips" role="group" aria-label="Filtrer">
          {#each FILTERS as [k, l, kpi] (k)}
            <button class="a-chip" type="button" aria-pressed={data.filter === k} onclick={() => setParam('f', k)}>{l}<b>{fmt(data.kpis[kpi])}</b></button>
          {/each}
        </div>

        {#if form?.error}<p class="a-card bad">{form.error}</p>{/if}
        {#if data.error}<p class="a-card bad">{data.error}</p>{/if}

        {#if !data.playlists.length}
          <p class="a-card a-empty">Aucune playlist ne correspond.</p>
        {:else}
          <ul class="a-list mobile">
            {#each data.playlists as pl (pl.id)}
              <li class="m-item">
                <a class="a-row" href="/admin/playlists/{pl.id}">
                  <PlaylistTile emoji={pl.emoji} official={pl.is_official} />
                  <span class="a-row-main">
                    <span class="a-row-title">{pl.name}</span>
                    <span class="a-row-sub">{pl.track_count} titres · {pl.profiles?.username ?? 'sans auteur'}{pl.plays !== null ? ` · ${fmt(pl.plays)} parties` : ''}</span>
                  </span>
                  {#if pl.is_official}<em class="a-tag warn">★</em>{/if}
                  {#if !pl.is_public}<em class="a-tag">privée</em>{/if}
                </a>
                <div class="m-actions">
                  <PlaylistFlags {pl} {keep} />
                  <span class="sp"></span>
                  <button class="a-btn small" type="button" onclick={() => edit(pl)}>Modifier</button>
                  <button class="a-btn small danger" type="button" aria-label="Supprimer" onclick={() => askDelete(pl)}>✕</button>
                </div>
              </li>
            {/each}
          </ul>

          <div class="a-table-wrap desktop">
            <table class="a-table">
              <thead>
                <tr>
                  <th>Playlist</th>
                  <th>Créée par</th>
                  <th class="num">Titres</th>
                  <th class="num">Parties</th>
                  <th>Statut</th>
                  <th>Modifiée</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each data.playlists as pl (pl.id)}
                  <tr>
                    <td>
                      <a class="name" href="/admin/playlists/{pl.id}">
                        <PlaylistTile emoji={pl.emoji} official={pl.is_official} small />
                        <b>{pl.name}</b>
                      </a>
                    </td>
                    <td>
                      {#if pl.owner_id}<a href="/admin/users/{pl.owner_id}">{pl.profiles?.username ?? '—'}</a>{:else}—{/if}
                    </td>
                    <td class="num">{fmt(pl.track_count)}</td>
                    <td class="num">{pl.plays !== null ? fmt(pl.plays) : '—'}</td>
                    <td><div class="flags"><PlaylistFlags {pl} {keep} /></div></td>
                    <td class="a-muted nowrap">{ago(pl.updated_at)}</td>
                    <td><div class="row-actions">{@render actions(pl)}</div></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          {#if totalPages > 1}
            <nav class="a-pager">
              <button class="a-btn small" disabled={data.page <= 1} onclick={() => setParam('page', String(data.page - 1))}>← Précédent</button>
              <span>{data.page} / {totalPages}</span>
              <button class="a-btn small" disabled={data.page >= totalPages} onclick={() => setParam('page', String(data.page + 1))}>Suivant →</button>
            </nav>
          {/if}
        {/if}
      </div>

      <aside>
        <TopPlaylists top={data.top} />
      </aside>
    </div>
  </div>
</div>

<Sheet bind:open={editOpen} title="Modifier la playlist">
  {#if editing}
    <PlaylistEditForm pl={editing} action="?/editPlaylist" submit={closing(() => (editOpen = false))} {busy} error={form?.error} />
  {/if}
</Sheet>

<Sheet bind:open={deleteOpen} title="Supprimer la playlist ?">
  {#if deleting}
    <form class="a-form" method="POST" action="?/deletePlaylist" use:enhance={closing(() => (deleteOpen = false))}>
      <input type="hidden" name="id" value={deleting.id} />
      <p>
        <b>{deleting.emoji} {deleting.name}</b> et ses {deleting.track_count} titres seront supprimés pour de bon.
        Les titres restent dans le catalogue.
      </p>
      <button class="a-btn danger" type="submit" disabled={busy}>Supprimer définitivement</button>
    </form>
  {/if}
</Sheet>

<style>
  .a-kpi-value small { font-size: 1.1rem; color: var(--a-dim); }
  .sort { flex: 0 0 auto; width: auto; }
  .a-cols > div { align-content: start; }


  .m-item { display: grid; gap: 0; }
  .m-item .a-row { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
  .m-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--a-line);
    border-top: 0;
    border-radius: 0 0 14px 14px;
    background: var(--a-surface);
  }
  .sp { flex: 1; }

  .m-actions :global(.flag span) { display: none; }
  @media (min-width: 400px) { .m-actions :global(.flag span) { display: inline; } }

  .desktop { display: none; }
  @media (min-width: 900px) {
    .mobile { display: none; }
    .desktop { display: block; }
  }
  .name { display: flex; align-items: center; gap: 10px; min-width: 200px; }
  .flags, .row-actions { display: flex; gap: 6px; }
  .row-actions { justify-content: flex-end; }
  .nowrap { white-space: nowrap; }
</style>
