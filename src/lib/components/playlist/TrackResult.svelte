<script>
  import { player } from './previewPlayer.svelte.js';
  import { coverThumb } from '$lib/shared/playlist/input.js';

  let { track, store, active = false, onArtist = null, onAlbum = null, onhover = null } = $props();

  let pending = $state(false);
  const inList = $derived(!!store.find(track));
  const playKey = $derived(`dz:${track.external_id}`);
  const playing = $derived(player.current === playKey);

  async function toggle() {
    if (pending) return;
    pending = true;
    await store.toggle(track);
    pending = false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="tres" class:active class:in={inList} onmousemove={onhover}>
  <button class="tres-cover" class:playing onclick={() => player.toggle(playKey, track.preview_url)}
    disabled={!track.preview_url} aria-label="{playing ? 'Arrêter' : 'Écouter'} l'extrait de {track.title}">
    {#if track.cover_url}<img src={coverThumb(track.cover_url)} alt="" width="40" height="40" loading="lazy" decoding="async">{/if}
    {#if track.preview_url}<span class="tres-play" aria-hidden="true">{playing ? '■' : '▶'}</span>{/if}
  </button>
  <div class="tres-info">
    <div class="tres-title" title={track.title}>{track.title}</div>
    <div class="tres-meta">
      {#if onArtist && track.artist_id}
        <button class="tres-link" onclick={() => onArtist(track.artist_id)}>{track.artist}</button>
      {:else}<span>{track.artist}</span>{/if}
      {#if onAlbum && track.album_id && track.album}
        <span aria-hidden="true">·</span>
        <button class="tres-link tres-album" onclick={() => onAlbum(track.album_id)}>{track.album}</button>
      {/if}
    </div>
  </div>
  <button class="tres-add" class:in={inList} onclick={toggle} disabled={pending}
    aria-label="{inList ? 'Retirer' : 'Ajouter'} {track.title}" title={inList ? 'Dans la playlist (cliquer pour retirer)' : 'Ajouter'}>
    {pending ? '…' : inList ? '✓' : '+'}
  </button>
</div>

<style>
  .tres {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: 10px;
    transition: background 0.1s;
  }
  .tres.active { background: rgb(var(--accent-rgb) / 0.12); box-shadow: inset 3px 0 0 var(--accent); }
  .tres-cover {
    position: relative;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    padding: 0;
    border: none;
    border-radius: 5px;
    overflow: hidden;
    background: var(--surface);
    cursor: pointer;
  }
  .tres-cover:disabled { cursor: default; }
  .tres-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tres-play {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 0.45);
    color: #fff;
    font-size: 0.8rem;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .tres-cover:hover .tres-play, .tres-cover:focus-visible .tres-play, .tres-cover.playing .tres-play { opacity: 1; }
  @media (hover: none) { .tres-play { opacity: 0.85; background: rgb(0 0 0 / 0.3); } }
  .tres-info { flex: 1; min-width: 0; }
  .tres-title { font-size: 0.86rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tres.in .tres-title { color: var(--mid); }
  .tres-meta {
    display: flex;
    gap: 5px;
    font-size: 0.74rem;
    color: var(--mid);
    white-space: nowrap;
    overflow: hidden;
  }
  .tres-link {
    border: none;
    background: none;
    padding: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tres-link:hover { color: var(--accent); text-decoration: underline; }
  .tres-album { color: var(--dim); }
  .tres-add {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 1px solid var(--border2);
    background: transparent;
    color: var(--text);
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .tres-add.in { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-size: 0.9rem; }
  @media (hover: hover) {
    .tres-add:hover { border-color: var(--accent); color: var(--accent); }
    .tres-add.in:hover { background: var(--danger); border-color: var(--danger); color: #fff; }
  }
</style>
