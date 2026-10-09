<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getContext, untrack } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import VideoFixer from '$lib/admin/VideoFixer.svelte';
  import TrackAnswers from '$lib/admin/TrackAnswers.svelte';
  import TrackAudioDebugger from '$lib/components/admin/TrackAudioDebugger.svelte';
  import { ago, pct } from '$lib/admin/stats-utils.js';

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
  const TABS = [
    ['infos', 'Infos'],
    ['answers', 'Réponses'],
    ['video', 'Vidéo salon'],
    ['audio', 'Extrait room'],
  ];
  const ISSUE = { video: 'Vidéo de salon', audio: 'Extrait de room', answer: 'Infos du titre' };

  let openId = $state(null);
  let sheetOpen = $state(false);
  let tab = $state('infos');
  let detail = $state(null);
  let detailErr = $state('');
  let busy = $state(false);
  let saved = $state(false);
  let armDelete = $state(false);
  let searchTimer;

  const totalPages = $derived(Math.max(1, Math.ceil(data.count / data.pageSize)));
  const fmt = (n) => n.toLocaleString('fr-FR');
  const entries = $derived(
    (detail?.entries ?? []).map((e) => ({
      id: e.id,
      label: `${e.custom_playlists?.emoji ?? ''} ${e.custom_playlists?.name ?? 'Playlist'}`.trim(),
      answers: e.track_answers ?? [],
    })),
  );

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

  async function loadDetail() {
    const id = openId;
    detailErr = '';
    try {
      const r = await fetch(`/api/admin/tracks-detail?id=${id}&token=${encodeURIComponent(token)}`);
      const d = await r.json();
      if (id !== openId) return;
      if (!r.ok) detailErr = d.error || 'Chargement impossible.';
      else detail = d;
    } catch {
      detailErr = 'Le serveur est injoignable.';
    }
  }

  function open(id, startTab = 'infos') {
    openId = id;
    detail = null;
    tab = startTab;
    saved = false;
    armDelete = false;
    sheetOpen = true;
    if (token) loadDetail();
  }

  $effect(() => {
    const id = page.url.searchParams.get('open');
    if (id && token) untrack(() => openId !== id && open(id));
  });

  const afterEdit = () => {
    busy = true;
    saved = false;
    return async ({ result, update }) => {
      busy = false;
      await update({ reset: false });
      if (result.type === 'success' && result.data?.success) {
        saved = true;
        loadDetail();
      }
    };
  };
  const afterDelete = () => {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      armDelete = false;
      await update({ reset: false });
      if (result.type === 'success' && result.data?.deleted) sheetOpen = false;
    };
  };
</script>

{#snippet cover(t, size = '')}
  {#if t.cover_url}<img class="a-cover {size}" src={t.cover_url} alt="" loading="lazy" />{:else}<span class="a-cover {size} ph">♪</span>{/if}
{/snippet}

{#snippet flags(t)}
  {#if t.reported}<em class="a-tag bad">signalé</em>{/if}
  {#if !t.preview_url}<em class="a-tag warn">sans extrait</em>{/if}
  {#if t.youtube_id}<em class="a-tag good">vidéo épinglée</em>{/if}
{/snippet}

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
      <p class="a-muted count">{fmt(data.count)} titre{data.count > 1 ? 's' : ''}</p>
      <ul class="a-list mobile">
        {#each data.tracks as t (t.id)}
          <li>
            <button class="a-row" type="button" onclick={() => open(t.id)}>
              {@render cover(t)}
              <span class="a-row-main">
                <span class="a-row-title">{t.title}</span>
                <span class="a-row-sub">{t.artist}</span>
                <span class="tags">
                  {@render flags(t)}
                  <em class="a-tag">{t.playlistCount} playlist{t.playlistCount > 1 ? 's' : ''}</em>
                </span>
              </span>
            </button>
          </li>
        {/each}
      </ul>

      <div class="a-table-wrap desktop">
        <table class="a-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th class="num">Playlists</th>
              <th class="num">Zikle</th>
              <th>État</th>
              <th>Source</th>
              <th>Ajouté</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.tracks as t (t.id)}
              <tr>
                <td>
                  <button class="cell" type="button" onclick={() => open(t.id)}>
                    {@render cover(t, 'sm')}
                    <span class="cell-main"><b>{t.title}</b><span class="a-muted">{t.artist}</span></span>
                  </button>
                </td>
                <td class="num">{t.playlistCount}</td>
                <td class="num">{t.zikleDays || '—'}</td>
                <td><span class="tags">{@render flags(t)}</span></td>
                <td class="a-muted">{t.source}</td>
                <td class="a-muted nowrap">{ago(t.created_at)}</td>
                <td>
                  <div class="row-actions">
                    <button class="a-btn small" type="button" onclick={() => open(t.id)}>Ouvrir</button>
                    <button class="a-btn small" type="button" onclick={() => open(t.id, 'video')}>Réparer</button>
                  </div>
                </td>
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
</div>

<Sheet bind:open={sheetOpen} title="Fiche du titre" wide>
  {#if detailErr}
    <p class="a-card bad">{detailErr}</p>
  {:else if !detail}
    <p class="a-empty">Chargement…</p>
  {:else}
    {@const t = detail.track}
    {@const s = detail.stats}
    <div class="fiche">
      <header class="f-head">
        {@render cover(t, 'xl')}
        <div class="f-main">
          <b class="f-title">{t.title}</b>
          <span class="a-muted">{t.artist}</span>
          <span class="tags">
            {@render flags({ ...t, reported: detail.issues.length })}
            <em class="a-tag">{t.source}</em>
          </span>
          {#if t.preview_url}
            <!-- svelte-ignore a11y_media_has_caption -->
            <audio controls preload="none" src={t.preview_url}></audio>
          {/if}
        </div>
      </header>

      {#if detail.issues.length}
        <div class="a-card bad issues">
          {#each detail.issues as i (i.kind)}
            <p><b>{ISSUE[i.kind] ?? i.kind}</b> signalé{i.count > 1 ? ` ${i.count} fois` : ''} · {ago(i.updated_at)}{i.note ? ` · « ${i.note} »` : ''}</p>
          {/each}
          <a class="a-btn small" href="/admin/reparer">Ouvrir Réparer</a>
        </div>
      {/if}

      <div class="a-chips" role="group" aria-label="Rubriques">
        {#each TABS as [k, l] (k)}
          <button class="a-chip" type="button" aria-pressed={tab === k} onclick={() => (tab = k)}>
            {l}{#if k === 'answers' && entries.some((e) => e.answers.length)}<b>{entries.reduce((n, e) => n + e.answers.length, 0)}</b>{/if}
          </button>
        {/each}
      </div>

      {#if tab === 'infos'}
        <div class="f-grid">
          <section class="f-block">
            <h3 class="a-h2">Statistiques</h3>
            {#if s && s.rounds_played}
              <div class="stats">
                <div><span class="a-big">{fmt(s.rounds_played)}</span><small>manches jouées</small></div>
                <div><span class="a-big">{pct(s.found_full, s.players_exposed)} %</span><small>des joueurs trouvent</small></div>
                <div><span class="a-big">{fmt(s.players_exposed)}</span><small>joueurs l'ont entendu</small></div>
              </div>
              <div class="a-meter"><i class={pct(s.found_full, s.players_exposed) < 20 ? 'bad' : pct(s.found_full, s.players_exposed) < 50 ? 'warn' : 'good'} style="width:{pct(s.found_full, s.players_exposed)}%"></i></div>
              {#if s.last_played_at}<p class="a-muted small">Dernière fois joué {ago(s.last_played_at)}</p>{/if}
            {:else}
              <p class="a-muted">Pas encore de statistiques pour ce titre.</p>
            {/if}

            <h3 class="a-h2">Où il est utilisé</h3>
            {#if detail.entries.length}
              <ul class="where">
                {#each detail.entries as e (e.id)}
                  <li>
                    <a href="/admin/playlists/{e.playlist_id}">{e.custom_playlists?.emoji} {e.custom_playlists?.name}</a>
                    {#if e.custom_playlists?.is_official}<em class="a-tag warn">★</em>{/if}
                    {#if e.custom_artist || e.custom_title}<em class="a-tag" title="Nom modifié dans cette playlist">✎ {e.custom_title || t.title}</em>{/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="a-muted">Dans aucune playlist.</p>
            {/if}
            {#if detail.zikle.length}
              <p class="small">Zikle : {detail.zikle.length} jour{detail.zikle.length > 1 ? 's' : ''} (dernier le {new Date(detail.zikle[0]).toLocaleDateString('fr-FR')})</p>
            {/if}
          </section>

          <section class="f-block">
            <h3 class="a-h2">Modifier</h3>
            {#key t.id + t.artist + t.title + t.cover_url}
              <form class="a-form" method="POST" action="?/editTrack" use:enhance={afterEdit}>
                <input type="hidden" name="id" value={t.id} />
                <label class="a-label">Artiste<input class="a-input" name="artist" value={t.artist} required /></label>
                <label class="a-label">Titre<input class="a-input" name="title" value={t.title} required /></label>
                <label class="a-label">Image de couverture (lien)<input class="a-input" name="cover_url" value={t.cover_url ?? ''} placeholder="https://…" /></label>
                {#if form?.error && sheetOpen}<p class="a-err">{form.error}</p>{/if}
                {#if saved}<p class="a-ok">Enregistré. Le changement vaut pour toutes les playlists.</p>{/if}
                <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
              </form>
            {/key}

            <form class="danger-zone" method="POST" action="?/deleteTrack" use:enhance={afterDelete}>
              <input type="hidden" name="id" value={t.id} />
              {#if detail.entries.length || detail.zikle.length}
                <p class="a-muted small">Pour supprimer ce titre du catalogue, retire-le d'abord de ses playlists et de l'historique Zikle.</p>
              {/if}
              <button
                class="a-btn small danger"
                disabled={busy}
                onclick={(e) => { if (!armDelete) { e.preventDefault(); armDelete = true; } }}
              >{armDelete ? 'Confirmer la suppression' : 'Supprimer du catalogue'}</button>
            </form>
          </section>
        </div>
      {:else if tab === 'answers'}
        <TrackAnswers trackId={t.id} {entries} types={detail.types} {token} onchange={loadDetail} />
      {:else if tab === 'video'}
        {#key t.id}<VideoFixer track={t} {token} />{/key}
      {:else}
        {#key t.id}<TrackAudioDebugger trackId={t.id} {token} />{/key}
      {/if}
    </div>
  {/if}
</Sheet>

<style>
  .sort { flex: 0 0 auto; width: auto; }
  .count { font-size: 0.82rem; }
  .ph { display: grid; place-items: center; color: var(--a-dim); }
  .a-cover.sm { width: 38px; height: 38px; }
  .a-cover.xl { width: 96px; height: 96px; border-radius: 12px; font-size: 2rem; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .a-row .tags { margin-top: 3px; }

  .desktop { display: none; }
  @media (min-width: 900px) {
    .mobile { display: none; }
    .desktop { display: block; }
  }
  .cell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 240px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--a-fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .cell:hover b { color: var(--a-accent); }
  .cell-main { display: grid; min-width: 0; }
  .cell-main .a-muted { font-size: 0.82rem; }
  .row-actions { display: flex; justify-content: flex-end; gap: 6px; }
  .nowrap { white-space: nowrap; }

  .fiche { display: grid; gap: 14px; min-width: 0; }
  .f-head { display: flex; gap: 14px; align-items: flex-start; }
  .f-main { flex: 1; display: grid; gap: 4px; min-width: 0; }
  .f-title { font-family: var(--a-display); font-size: 1.5rem; font-weight: 800; line-height: 1.1; overflow-wrap: anywhere; }
  .f-main audio { width: 100%; height: 36px; margin-top: 6px; }
  .issues { display: grid; gap: 6px; font-size: 0.85rem; }
  .issues .a-btn { justify-self: start; }

  .f-grid { display: grid; gap: 18px; }
  @media (min-width: 760px) {
    .f-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .f-block { display: grid; gap: 10px; align-content: start; }
  .f-block .a-h2:first-child { margin-top: 0; }
  .stats { display: flex; flex-wrap: wrap; gap: 18px; }
  .stats div { display: grid; gap: 2px; }
  .stats small, .small { font-size: 0.78rem; color: var(--a-dim); }
  .where { display: grid; gap: 6px; list-style: none; }
  .where li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.9rem; }
  .where a { color: var(--a-cyan); }
  .danger-zone { display: grid; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--a-line); }
  .danger-zone .a-btn { justify-self: start; }
</style>
