<script>
  import VersionPanel from './VersionPanel.svelte';
  import { coverThumb } from '$lib/shared/playlist/input.js';

  let { track, index, store, open, onToggle, onEditAnswers } = $props();
</script>

<li class="prow" class:open>
  <div class="prow-main">
    <span class="prow-num">{index}</span>
    {#if track.cover_url}
      <img class="prow-cover" src={coverThumb(track.cover_url)} alt="" width="38" height="38" loading="lazy" decoding="async">
    {:else}
      <span class="prow-cover prow-cover-empty">♪</span>
    {/if}
    <div class="prow-info">
      <div class="prow-title" title={track.title}>{track.title}</div>
      <div class="prow-artist" title={track.artist}>{track.artist}{#if track.youtube_id}<span class="prow-ok" title="Version vérifiée"> ✓</span>{/if}</div>
    </div>
    <button class="prow-btn prow-play" class:on={open} onclick={onToggle}
      aria-expanded={open} aria-label="{open ? 'Fermer' : 'Écouter la version jouée de'} {track.title}">{open ? '■' : '▶'}</button>
    <button class="prow-btn" onclick={onEditAnswers} title="Réponses acceptées" aria-label="Réponses acceptées pour {track.title}">✎</button>
    <button class="prow-btn prow-del" onclick={() => store.unlink(track)} title="Retirer" aria-label="Retirer {track.title}">✕</button>
  </div>
  {#if open}<VersionPanel {track} {store} />{/if}
</li>

<style>
  .prow { border-bottom: 1px solid var(--border); content-visibility: auto; contain-intrinsic-size: auto 58px; }
  .prow.open { content-visibility: visible; background: rgb(var(--accent-rgb) / 0.03); }
  .prow-main { display: flex; align-items: center; gap: 10px; padding: 9px 0; }
  .prow-num {
    width: 24px;
    flex-shrink: 0;
    text-align: right;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.66rem;
    color: var(--dim);
  }
  .prow-cover { width: 38px; height: 38px; border-radius: 4px; object-fit: cover; flex-shrink: 0; background: var(--surface); }
  .prow-cover-empty { display: flex; align-items: center; justify-content: center; color: var(--dim); }
  .prow-info { flex: 1; min-width: 0; }
  .prow-title, .prow-artist { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .prow-title { font-size: 0.86rem; font-weight: 600; }
  .prow-artist { font-size: 0.74rem; color: var(--mid); }
  .prow-ok { color: var(--success); }
  .prow-btn {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--dim);
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .prow-btn:hover, .prow-btn:focus-visible { background: var(--surface2); color: var(--text); }
  .prow-play { color: var(--text); }
  .prow-play.on { color: var(--accent); }
  .prow-del:hover { color: var(--danger); }
  @media (max-width: 600px) {
    .prow-num { display: none; }
    .prow-btn { width: 40px; height: 40px; }
  }
</style>
