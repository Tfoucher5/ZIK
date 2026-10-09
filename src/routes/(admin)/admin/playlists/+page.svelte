<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import { ago } from '$lib/admin/stats-utils.js';

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
  const maxPlays = $derived(Math.max(1, ...data.top.map((p) => p.plays)));
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

{#snippet flags(pl)}
  <form method="POST" action="?/toggleFlag" use:enhance={keep}>
    <input type="hidden" name="id" value={pl.id} />
    <input type="hidden" name="field" value="is_official" />
    <input type="hidden" name="value" value={String(!pl.is_official)} />
    <button class="flag" class:on-star={pl.is_official} title={pl.is_official ? 'Retirer des officielles' : 'Rendre officielle'}>
      ★ <span>{pl.is_official ? 'Officielle' : 'Non officielle'}</span>
    </button>
  </form>
  <form method="POST" action="?/toggleFlag" use:enhance={keep}>
    <input type="hidden" name="id" value={pl.id} />
    <input type="hidden" name="field" value="is_public" />
    <input type="hidden" name="value" value={String(!pl.is_public)} />
    <button class="flag" class:on={pl.is_public} title={pl.is_public ? 'Rendre privée' : 'Rendre publique'}>
      {pl.is_public ? '●' : '○'} <span>{pl.is_public ? 'Publique' : 'Privée'}</span>
    </button>
  </form>
{/snippet}

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
                  <span class="tile" class:official={pl.is_official}>{pl.emoji}</span>
                  <span class="a-row-main">
                    <span class="a-row-title">{pl.name}</span>
                    <span class="a-row-sub">{pl.track_count} titres · {pl.profiles?.username ?? 'sans auteur'}{pl.plays !== null ? ` · ${fmt(pl.plays)} parties` : ''}</span>
                  </span>
                  {#if pl.is_official}<em class="a-tag warn">★</em>{/if}
                  {#if !pl.is_public}<em class="a-tag">privée</em>{/if}
                </a>
                <div class="m-actions">
                  {@render flags(pl)}
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
                        <span class="tile small" class:official={pl.is_official}>{pl.emoji}</span>
                        <b>{pl.name}</b>
                      </a>
                    </td>
                    <td>
                      {#if pl.owner_id}<a href="/admin/users/{pl.owner_id}">{pl.profiles?.username ?? '—'}</a>{:else}—{/if}
                    </td>
                    <td class="num">{fmt(pl.track_count)}</td>
                    <td class="num">{pl.plays !== null ? fmt(pl.plays) : '—'}</td>
                    <td><div class="flags">{@render flags(pl)}</div></td>
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
        <section class="a-section">
          <div class="a-section-head"><h2>Les plus jouées</h2></div>
          {#if data.top.length}
            <ol class="top">
              {#each data.top as p, i (p.id)}
                <li>
                  <a href="/admin/playlists/{p.id}">
                    <span class="rank">{i + 1}</span>
                    <span class="tile small">{p.emoji}</span>
                    <span class="top-main">
                      <span class="top-name">{p.name}</span>
                      <span class="a-meter"><i style="width:{(p.plays / maxPlays) * 100}%"></i></span>
                    </span>
                    <span class="top-n"><b>{fmt(p.plays)}</b><small>{p.month} ce mois</small></span>
                  </a>
                </li>
              {/each}
            </ol>
            <p class="a-muted foot">Parties lancées dans la room liée à chaque playlist.</p>
          {:else}
            <p class="a-muted">Aucune playlist n'est liée à une room pour l'instant.</p>
          {/if}
        </section>
      </aside>
    </div>
  </div>
</div>

<Sheet bind:open={editOpen} title="Modifier la playlist">
  {#if editing}
    <form class="a-form" method="POST" action="?/editPlaylist" use:enhance={closing(() => (editOpen = false))}>
      <input type="hidden" name="id" value={editing.id} />
      <div class="edit-name">
        <label class="a-label emoji">Emoji<input class="a-input" name="emoji" value={editing.emoji} maxlength="4" /></label>
        <label class="a-label">Nom<input class="a-input" name="name" value={editing.name} required /></label>
      </div>
      <label class="a-label">
        Room liée (code)
        <input class="a-input" name="linked_room_id" value={editing.linked_room_id ?? ''} placeholder="ex : KDP2G9" maxlength="12" />
        <span class="a-muted small">La room du site qui joue cette playlist. Sert aussi à compter ses parties.</span>
      </label>
      {#if form?.error}<p class="a-err">{form.error}</p>{/if}
      <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
    </form>
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

  .tile {
    flex: 0 0 44px;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--a-surface2), var(--a-accent-soft));
    font-size: 1.4rem;
  }
  .tile.official { box-shadow: inset 0 0 0 2px var(--a-warn); }
  .tile.small { flex-basis: 34px; width: 34px; height: 34px; font-size: 1.1rem; border-radius: 8px; }

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

  .flag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 32px;
    padding: 4px 8px;
    border: 1px solid var(--a-line);
    border-radius: 99px;
    background: none;
    color: var(--a-dim);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }
  .flag.on { border-color: var(--a-good); color: var(--a-good); }
  .flag.on-star { border-color: var(--a-warn); color: var(--a-warn); }
  .m-actions .flag span { display: none; }
  @media (min-width: 400px) { .m-actions .flag span { display: inline; } }

  .desktop { display: none; }
  @media (min-width: 900px) {
    .mobile { display: none; }
    .desktop { display: block; }
  }
  .name { display: flex; align-items: center; gap: 10px; min-width: 200px; }
  .flags, .row-actions { display: flex; gap: 6px; }
  .row-actions { justify-content: flex-end; }
  .nowrap { white-space: nowrap; }

  .top { display: grid; gap: 4px; list-style: none; }
  .top a { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-radius: 10px; color: var(--a-fg); }
  .top a:hover { background: var(--a-surface2); }
  .rank { width: 16px; font-family: var(--a-display); font-weight: 800; color: var(--a-dim); }
  .top-main { flex: 1; display: grid; gap: 5px; min-width: 0; }
  .top-name { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .top-n { display: grid; text-align: right; font-variant-numeric: tabular-nums; }
  .top-n small { font-size: 0.7rem; color: var(--a-dim); }
  .foot { font-size: 0.78rem; }

  .edit-name { display: grid; grid-template-columns: 84px 1fr; gap: 10px; }
  .emoji input { text-align: center; font-size: 1.2rem; }
  .small { font-size: 0.75rem; font-weight: 400; }
</style>
