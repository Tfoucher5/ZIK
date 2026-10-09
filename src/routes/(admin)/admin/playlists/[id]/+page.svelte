<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import TrackAnswers from '$lib/admin/TrackAnswers.svelte';
  import TrackRepair from '$lib/admin/TrackRepair.svelte';
  import { invalidateAll } from '$app/navigation';
  import { getContext } from 'svelte';
  import { ago } from '$lib/admin/stats-utils.js';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  const playlist = $derived(data.playlist);
  const tracks = $derived(data.tracks);

  const VIEWS = [
    ['all', 'Tous'],
    ['nopreview', 'Sans extrait'],
    ['reported', 'Signalés'],
    ['answers', 'Réponses en plus'],
  ];

  let query = $state('');
  let view = $state('all');
  let player = $state();
  let playing = $state(null);
  let arming = $state(null);
  let busy = $state(false);

  let editId = $state(null);
  let editOpen = $state(false);
  let repairId = $state(null);
  let repairOpen = $state(false);
  let addOpen = $state(false);
  let plOpen = $state(false);
  let deleteOpen = $state(false);

  let found = $state([]);
  let searching = $state(false);
  let added = $state([]);
  let searchTimer;

  const editing = $derived(tracks.find((t) => t.id === editId));
  const repairing = $derived(tracks.find((t) => t.id === repairId));
  const counts = $derived({
    all: tracks.length,
    nopreview: tracks.filter((t) => !t.track?.preview_url).length,
    reported: tracks.filter((t) => t.reported).length,
    answers: tracks.filter((t) => t.answers.length).length,
  });
  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter((t) => {
      if (view === 'nopreview' && t.track?.preview_url) return false;
      if (view === 'reported' && !t.reported) return false;
      if (view === 'answers' && !t.answers.length) return false;
      if (!q) return true;
      return [artistOf(t), titleOf(t), ...(t.custom_feats ?? []), ...t.answers.map((a) => a.value)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  });
  const canReorder = $derived(view === 'all' && !query.trim());
  const typeName = $derived(Object.fromEntries(data.types.map((t) => [t.id, t.name])));

  function artistOf(t) {
    return t.custom_artist || t.track?.artist || '?';
  }
  function titleOf(t) {
    return t.custom_title || t.track?.title || '?';
  }

  function toggle(t) {
    if (playing === t.id) {
      player.pause();
      playing = null;
      return;
    }
    player.src = t.track.preview_url;
    player.play().catch(() => (playing = null));
    playing = t.id;
  }

  function openEdit(t) {
    editId = t.id;
    editOpen = true;
  }
  function openRepair(t) {
    repairId = t.id;
    repairOpen = true;
  }

  function onSearch(e) {
    clearTimeout(searchTimer);
    const v = e.currentTarget.value.trim();
    if (v.length < 2) {
      found = [];
      return;
    }
    searchTimer = setTimeout(async () => {
      searching = true;
      try {
        const r = await fetch(`/api/tracks/search?q=${encodeURIComponent(v)}`);
        found = r.ok ? await r.json() : [];
      } finally {
        searching = false;
      }
    }, 300);
  }
  $effect(() => () => clearTimeout(searchTimer));

  const inPlaylist = $derived(new Set(tracks.map((t) => t.track?.id)));

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

  function armRemove(e, id) {
    if (arming !== id) {
      e.preventDefault();
      arming = id;
    }
  }
</script>

<!-- svelte-ignore a11y_media_has_caption -->
<audio bind:this={player} onended={() => (playing = null)} preload="none"></audio>

<div class="adm-page">
  <PageHeader title="Playlist">
    <button class="a-btn primary small" type="button" onclick={() => (addOpen = true)}>+ Ajouter</button>
  </PageHeader>

  <div class="a-stack">
    <a class="back" href="/admin/playlists">← Toutes les playlists</a>

    <section class="hero a-section">
      <span class="big-tile" class:official={playlist.is_official}>{playlist.emoji}</span>
      <div class="hero-main">
        <h2>{playlist.name}</h2>
        <p class="by">
          par {#if playlist.owner_id}<a href="/admin/users/{playlist.owner_id}">{playlist.profiles?.username ?? 'inconnu'}</a>{:else}inconnu{/if}
          · créée {ago(playlist.created_at)} · modifiée {ago(playlist.updated_at)}
        </p>
        <div class="tags">
          {#if playlist.is_official}<em class="a-tag warn">★ Officielle</em>{/if}
          <em class="a-tag {playlist.is_public ? 'good' : ''}">{playlist.is_public ? 'Publique' : 'Privée'}</em>
          {#if playlist.linked_room_id}<em class="a-tag accent">Room {playlist.linked_room_id}</em>{/if}
        </div>
      </div>
      <div class="hero-stats">
        <div><span class="a-big">{tracks.length}</span><small>titres</small></div>
        {#if data.plays !== null}<div><span class="a-big">{data.plays.toLocaleString('fr-FR')}</span><small>parties</small></div>{/if}
        {#if counts.nopreview}<div><span class="a-big warn">{counts.nopreview}</span><small>sans extrait</small></div>{/if}
        {#if counts.reported}<div><span class="a-big bad">{counts.reported}</span><small>signalés</small></div>{/if}
      </div>
      <div class="a-btns hero-actions">
        <form method="POST" action="/admin/playlists?/toggleFlag" use:enhance={keep}>
          <input type="hidden" name="id" value={playlist.id} />
          <input type="hidden" name="field" value="is_official" />
          <input type="hidden" name="value" value={String(!playlist.is_official)} />
          <button class="a-btn small">{playlist.is_official ? 'Retirer des officielles' : '★ Rendre officielle'}</button>
        </form>
        <form method="POST" action="/admin/playlists?/toggleFlag" use:enhance={keep}>
          <input type="hidden" name="id" value={playlist.id} />
          <input type="hidden" name="field" value="is_public" />
          <input type="hidden" name="value" value={String(!playlist.is_public)} />
          <button class="a-btn small">{playlist.is_public ? 'Rendre privée' : 'Rendre publique'}</button>
        </form>
        <button class="a-btn small" type="button" onclick={() => (plOpen = true)}>Modifier</button>
        <button class="a-btn small danger" type="button" onclick={() => (deleteOpen = true)}>Supprimer</button>
      </div>
    </section>

    {#if form?.error}<p class="a-card bad">{form.error}</p>{/if}

    <div class="a-toolbar">
      <label class="a-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span class="a-sr">Rechercher dans la playlist</span>
        <input type="search" placeholder="Artiste, titre, feat, réponse…" bind:value={query} />
      </label>
    </div>
    <div class="a-chips" role="group" aria-label="Filtrer les titres">
      {#each VIEWS as [k, l] (k)}
        <button class="a-chip" type="button" aria-pressed={view === k} onclick={() => (view = k)}>{l}<b>{counts[k]}</b></button>
      {/each}
    </div>

    {#if !tracks.length}
      <div class="a-card a-empty">
        <p>Cette playlist est vide.</p>
        <button class="a-btn primary" type="button" onclick={() => (addOpen = true)}>Ajouter un titre</button>
      </div>
    {:else if !shown.length}
      <p class="a-card a-empty">Aucun titre ne correspond.</p>
    {:else}
      <ol class="a-list">
        {#each shown as t, i (t.id)}
          <li class="trk" class:on={playing === t.id}>
            <span class="pos">{t.position + 1}</span>
            {#if t.track?.preview_url}
              <button class="cover-btn" type="button" aria-label={playing === t.id ? 'Pause' : 'Écouter l’extrait'} onclick={() => toggle(t)}>
                {#if t.track.cover_url}<img class="a-cover" src={t.track.cover_url} alt="" loading="lazy" />{:else}<span class="a-cover"></span>{/if}
                <span class="play">{playing === t.id ? '❚❚' : '▶'}</span>
              </button>
            {:else if t.track?.cover_url}
              <img class="a-cover" src={t.track.cover_url} alt="" loading="lazy" />
            {:else}
              <span class="a-cover"></span>
            {/if}
            <div class="a-row-main">
              <span class="a-row-title">
                {titleOf(t)}{#if t.custom_title}<span class="mark" title="Titre modifié pour cette playlist">✎</span>{/if}
              </span>
              <span class="a-row-sub">
                {artistOf(t)}{#if t.custom_artist}<span class="mark" title="Artiste modifié pour cette playlist">✎</span>{/if}
                {#if t.custom_feats?.length} · feat. {t.custom_feats.join(', ')}{/if}
              </span>
              {#if t.answers.length || t.reported || !t.track?.preview_url || t.track?.youtube_id}
                <span class="tags">
                  {#if t.reported}<em class="a-tag bad">signalé</em>{/if}
                  {#if !t.track?.preview_url}<em class="a-tag warn">sans extrait</em>{/if}
                  {#if t.track?.youtube_id}<em class="a-tag good">vidéo épinglée</em>{/if}
                  {#each t.answers as a (a.id)}<em class="a-tag accent">{typeName[a.answer_type_id]} : {a.value}</em>{/each}
                </span>
              {/if}
            </div>
            <div class="acts">
              {#if canReorder}
                <form method="POST" action="?/reorderTrack" use:enhance={keep}>
                  <input type="hidden" name="track_id" value={t.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button class="a-btn small icon" aria-label="Monter" disabled={i === 0}>▲</button>
                </form>
                <form method="POST" action="?/reorderTrack" use:enhance={keep}>
                  <input type="hidden" name="track_id" value={t.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button class="a-btn small icon" aria-label="Descendre" disabled={i === shown.length - 1}>▼</button>
                </form>
              {/if}
              <button class="a-btn small" type="button" onclick={() => openEdit(t)}>Modifier</button>
              <button class="a-btn small" type="button" disabled={!t.track} onclick={() => openRepair(t)}>Réparer</button>
              <form method="POST" action="?/deleteTrack" use:enhance={keep}>
                <input type="hidden" name="track_id" value={t.id} />
                <button
                  class="a-btn small"
                  class:danger={arming === t.id}
                  onclick={(e) => armRemove(e, t.id)}
                  onblur={() => arming === t.id && (arming = null)}
                >{arming === t.id ? 'Confirmer' : 'Retirer'}</button>
              </form>
            </div>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</div>

<Sheet bind:open={addOpen} title="Ajouter un titre">
  <div class="add">
    <label class="a-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span class="a-sr">Chercher dans le catalogue</span>
      <input type="search" placeholder="Artiste ou titre…" oninput={onSearch} />
    </label>
    {#if searching}<p class="a-muted">Recherche…</p>{/if}
    <ul class="a-list">
      {#each found as r (r.id)}
        <li class="a-row">
          {#if r.cover_url}<img class="a-cover" src={r.cover_url} alt="" loading="lazy" />{:else}<span class="a-cover"></span>{/if}
          <span class="a-row-main">
            <span class="a-row-title">{r.title}</span>
            <span class="a-row-sub">{r.artist}</span>
          </span>
          {#if inPlaylist.has(r.id) || added.includes(r.id)}
            <em class="a-tag good">dans la playlist</em>
          {:else}
            <form method="POST" action="?/addTrack" use:enhance={() => { added = [...added, r.id]; return keep(); }}>
              <input type="hidden" name="track_id" value={r.id} />
              <button class="a-btn small primary">Ajouter</button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
    <p class="a-muted small">Seuls les titres déjà dans le catalogue apparaissent ici.</p>
  </div>
</Sheet>

<Sheet bind:open={editOpen} title="Modifier le titre" wide>
  {#if editing}
    <div class="edit">
      <p class="who">
        {#if editing.track?.cover_url}<img class="a-cover" src={editing.track.cover_url} alt="" />{/if}
        <span><b>{editing.track?.title}</b><br /><span class="a-muted">{editing.track?.artist}</span></span>
        {#if editing.track}<a class="a-btn small" href="/admin/tracks?open={editing.track.id}">Fiche du titre</a>{/if}
      </p>
      <h3 class="a-h2">Dans cette playlist</h3>
      <form class="a-form" method="POST" action="?/editTrackMeta" use:enhance={closing(() => (editOpen = false))}>
        <input type="hidden" name="track_id" value={editing.id} />
        <div class="a-form-row">
          <label class="a-label">Artiste affiché<input class="a-input" name="custom_artist" value={editing.custom_artist ?? ''} placeholder={editing.track?.artist} /></label>
          <label class="a-label">Titre affiché<input class="a-input" name="custom_title" value={editing.custom_title ?? ''} placeholder={editing.track?.title} /></label>
        </div>
        <label class="a-label">
          Artistes en featuring (séparés par des virgules)
          <input class="a-input" name="custom_feats" value={editing.custom_feats?.join(', ') ?? ''} placeholder="ex : Nekfeu, Damso" />
        </label>
        <p class="a-muted small">Laisse vide pour garder le nom du catalogue.</p>
        <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
      </form>
      <h3 class="a-h2">Réponses acceptées en plus</h3>
      <TrackAnswers
        trackId={editing.track?.id}
        entries={[{ id: editing.id, label: playlist.name, answers: editing.answers }]}
        types={data.types}
        {token}
        onchange={invalidateAll}
      />
    </div>
  {/if}
</Sheet>

<Sheet bind:open={repairOpen} title="Réparer le titre" wide>
  {#if repairing?.track}
    <p class="who-line"><b>{repairing.track.artist}</b> · {repairing.track.title}</p>
    <TrackRepair track={repairing.track} {token} />
  {/if}
</Sheet>

<Sheet bind:open={plOpen} title="Modifier la playlist">
  <form class="a-form" method="POST" action="/admin/playlists?/editPlaylist" use:enhance={closing(() => (plOpen = false))}>
    <input type="hidden" name="id" value={playlist.id} />
    <div class="edit-name">
      <label class="a-label emoji">Emoji<input class="a-input" name="emoji" value={playlist.emoji} maxlength="4" /></label>
      <label class="a-label">Nom<input class="a-input" name="name" value={playlist.name} required /></label>
    </div>
    <label class="a-label">
      Room liée (code)
      <input class="a-input" name="linked_room_id" value={playlist.linked_room_id ?? ''} placeholder="ex : KDP2G9" maxlength="12" />
      <span class="a-muted small">La room du site qui joue cette playlist. Sert aussi à compter ses parties.</span>
    </label>
    <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
  </form>
</Sheet>

<Sheet bind:open={deleteOpen} title="Supprimer la playlist ?">
  <form class="a-form" method="POST" action="?/deletePlaylist" use:enhance>
    <p><b>{playlist.emoji} {playlist.name}</b> et ses {tracks.length} titres seront supprimés pour de bon. Les titres restent dans le catalogue.</p>
    <button class="a-btn danger" type="submit">Supprimer définitivement</button>
  </form>
</Sheet>

<style>
  .back { width: fit-content; font-size: 0.85rem; color: var(--a-muted); }
  .back:hover { color: var(--a-fg); }

  .hero { grid-template-columns: auto 1fr; align-items: center; gap: 14px; }
  .big-tile {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--a-surface2), var(--a-accent-soft));
    font-size: 2.4rem;
  }
  .big-tile.official { box-shadow: inset 0 0 0 2px var(--a-warn); }
  .hero-main { display: grid; gap: 6px; min-width: 0; }
  .hero-main h2 {
    font-family: var(--a-display);
    font-size: 1.7rem;
    font-weight: 800;
    line-height: 1.05;
    overflow-wrap: anywhere;
  }
  .by { font-size: 0.82rem; color: var(--a-dim); }
  .by a { color: var(--a-cyan); }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .hero-stats { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 22px; }
  .hero-stats div { display: grid; gap: 2px; }
  .hero-stats small { font-size: 0.75rem; color: var(--a-dim); }
  .a-big.warn { color: var(--a-warn); }
  .a-big.bad { color: var(--a-bad); }
  .hero-actions { grid-column: 1 / -1; }
  .hero-actions form { display: contents; }
  @media (min-width: 900px) {
    .hero { grid-template-columns: auto 1fr auto; padding: 22px; }
    .big-tile { width: 96px; height: 96px; font-size: 3.2rem; }
    .hero-main h2 { font-size: 2.2rem; }
    .hero-stats { grid-column: auto; }
  }

  .trk {
    display: grid;
    grid-template-columns: 22px 44px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--a-line);
    border-radius: 14px;
    background: var(--a-surface);
  }
  .trk.on { border-color: var(--a-accent); }
  .pos { font-size: 0.75rem; text-align: right; color: var(--a-dim); font-variant-numeric: tabular-nums; }
  .cover-btn { position: relative; padding: 0; border: 0; background: none; cursor: pointer; }
  .cover-btn .a-cover { display: block; }
  .play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 0.9rem;
  }
  .trk.on .play { background: rgba(255, 61, 240, 0.55); }
  .mark { margin-left: 4px; font-size: 0.75rem; color: var(--a-warn); }
  .trk .tags { margin-top: 2px; }
  .acts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
  .acts form { display: contents; }
  .icon { min-width: 32px; padding-inline: 6px; }
  @media (min-width: 900px) {
    .trk { grid-template-columns: 26px 44px minmax(0, 1fr) auto; }
    .acts { grid-column: auto; flex-wrap: nowrap; }
  }

  .add { display: grid; gap: 12px; }
  .add form { display: contents; }
  .small { font-size: 0.78rem; font-weight: 400; }

  .edit { display: grid; gap: 14px; }
  .who { display: flex; align-items: center; gap: 12px; }
  .who > span { flex: 1; min-width: 0; }
  .who-line { margin-bottom: 12px; }
  .edit-name { display: grid; grid-template-columns: 84px 1fr; gap: 10px; }
  .emoji input { text-align: center; font-size: 1.2rem; }
</style>
