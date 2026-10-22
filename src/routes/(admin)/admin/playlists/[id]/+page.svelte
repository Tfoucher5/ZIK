<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import TrackRepair from '$lib/components/admin/TrackRepair.svelte';
  import PlaylistHero from '$lib/components/admin/playlist/PlaylistHero.svelte';
  import PlaylistTrackRow from '$lib/components/admin/playlist/PlaylistTrackRow.svelte';
  import PlaylistAddSheet from '$lib/components/admin/playlist/PlaylistAddSheet.svelte';
  import PlaylistTrackEdit from '$lib/components/admin/playlist/PlaylistTrackEdit.svelte';
  import PlaylistEditForm from '$lib/components/admin/playlist/PlaylistEditForm.svelte';
  import { getContext } from 'svelte';
  import { fuzzyFilter } from '$lib/shared/fuzzy.js';

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
  let busy = $state(false);

  let editId = $state(null);
  let editOpen = $state(false);
  let repairId = $state(null);
  let repairOpen = $state(false);
  let addOpen = $state(false);
  let plOpen = $state(false);
  let deleteOpen = $state(false);

  const editing = $derived(tracks.find((t) => t.id === editId));
  const repairing = $derived(tracks.find((t) => t.id === repairId));
  const counts = $derived({
    all: tracks.length,
    nopreview: tracks.filter((t) => !t.track?.preview_url).length,
    reported: tracks.filter((t) => t.reported).length,
    answers: tracks.filter((t) => t.answers.length).length,
  });
  const shown = $derived.by(() => {
    const list = tracks.filter((t) => {
      if (view === 'nopreview' && t.track?.preview_url) return false;
      if (view === 'reported' && !t.reported) return false;
      if (view === 'answers' && !t.answers.length) return false;
      return true;
    });
    return fuzzyFilter(list, query, [artistOf, titleOf, (t) => (t.custom_feats ?? []).join(' '), (t) => t.answers.map((a) => a.value).join(' ')]);
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
</script>

<!-- svelte-ignore a11y_media_has_caption -->
<audio bind:this={player} onended={() => (playing = null)} preload="none"></audio>

<div class="adm-page">
  <PageHeader title="Playlist">
    <button class="a-btn primary small" type="button" onclick={() => (addOpen = true)}>+ Ajouter</button>
  </PageHeader>

  <div class="a-stack">
    <a class="back" href="/admin/playlists">← Toutes les playlists</a>

    <PlaylistHero {playlist} trackCount={tracks.length} plays={data.plays} {counts} {keep} onEdit={() => (plOpen = true)} onDelete={() => (deleteOpen = true)} />

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
          <PlaylistTrackRow
            {t} first={i === 0} last={i === shown.length - 1} playing={playing === t.id}
            {canReorder} {typeName} {keep}
            onToggle={() => toggle(t)} onEdit={() => openEdit(t)} onRepair={() => openRepair(t)}
          />
        {/each}
      </ol>
    {/if}
  </div>
</div>

<PlaylistAddSheet bind:open={addOpen} {inPlaylist} {keep} />

<PlaylistTrackEdit bind:open={editOpen} {editing} playlistName={playlist.name} types={data.types} {token} {busy} {closing} />

<Sheet bind:open={repairOpen} title="Réparer le titre" wide>
  {#if repairing?.track}
    <p class="who-line"><b>{repairing.track.artist}</b> · {repairing.track.title}</p>
    <TrackRepair track={repairing.track} {token} />
  {/if}
</Sheet>

<Sheet bind:open={plOpen} title="Modifier la playlist">
  <PlaylistEditForm pl={playlist} action="/admin/playlists?/editPlaylist" submit={closing(() => (plOpen = false))} {busy} />
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

  .who-line { margin-bottom: 12px; }
</style>
