<script>
  let { video, selected, auto, playing, onSelect, onPlay } = $props();

  const duration = $derived(
    video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : ''
  );
</script>

<div class="vrow" class:selected>
  <label class="vrow-pick">
    <input type="radio" name="version" value={video.id} checked={selected} onchange={onSelect} />
    <img class="vrow-thumb" src="https://i.ytimg.com/vi/{video.id}/mqdefault.jpg" alt="" width="64" height="36" loading="lazy" decoding="async" />
    <span class="vrow-info">
      <span class="vrow-title" title={video.title}>{video.title}</span>
      <span class="vrow-meta">
        {#if auto}<span class="vrow-auto">Choix auto</span>{/if}
        <span class="vrow-channel">{video.channel}</span>
        {#if duration}<span>· {duration}</span>{/if}
      </span>
    </span>
  </label>
  <button class="vrow-play" class:on={playing} onclick={onPlay}
    aria-label="{playing ? 'Arrêter' : 'Écouter'} {video.title}" aria-pressed={playing}>
    {playing ? '■' : '▶'}
  </button>
</div>

<style>
  .vrow {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: var(--r);
    transition: border-color 0.12s, background 0.12s;
  }
  .vrow.selected {
    border-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.06);
  }
  .vrow-pick {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0 8px 10px;
    min-height: 44px;
    cursor: pointer;
  }
  .vrow-pick input { accent-color: var(--accent); flex-shrink: 0; margin: 0; }
  .vrow-pick input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .vrow-thumb {
    width: 64px;
    height: 36px;
    object-fit: cover;
    background: var(--border);
    border-radius: 3px;
    flex-shrink: 0;
  }
  .vrow-info { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .vrow-title {
    font-size: 0.82rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .vrow-meta {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 0.7rem;
    color: var(--mid);
    white-space: nowrap;
    overflow: hidden;
  }
  .vrow-channel { overflow: hidden; text-overflow: ellipsis; }
  .vrow-auto {
    flex-shrink: 0;
    color: var(--accent);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.6rem;
  }
  .vrow-play {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    margin-right: 4px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text);
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .vrow-play:hover, .vrow-play:focus-visible { background: var(--surface2); }
  .vrow-play.on { color: var(--accent); }
</style>
