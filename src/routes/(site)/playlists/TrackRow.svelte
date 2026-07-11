<script>
  let { track, index, onRemove, onMoveUp, onMoveDown, onEditAnswers } = $props();
</script>

<div class="track-row-pl">
  <span class="track-num">{index}</span>
  {#if track.cover_url}
    <img class="track-cover" src={track.cover_url} alt="" width="34" height="34" loading="lazy" decoding="async" onerror={e => e.currentTarget.style.display='none'}>
  {/if}
  <div class="track-info">
    <div class="track-title">{track.title}</div>
    <div class="track-artist">{track.artist}</div>
  </div>
  <span class="track-source">{track.source}</span>
  {#if onMoveUp || onMoveDown}
    <div class="track-reorder">
      {#if onMoveUp}<button class="track-move-btn" onclick={onMoveUp} title="Monter">↑</button>{/if}
      {#if onMoveDown}<button class="track-move-btn" onclick={onMoveDown} title="Descendre">↓</button>{/if}
    </div>
  {/if}
  {#if onEditAnswers}
    <button class="track-answers-btn" title="Modifier les réponses" onclick={onEditAnswers}>&#x270E;</button>
  {/if}
  <button class="track-remove-btn" onclick={onRemove}>&#x2715;</button>
</div>

<style>
.track-row-pl {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  content-visibility: auto;
  contain-intrinsic-size: auto 55px;
}
.track-num {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 0.7rem;
  color: var(--dim);
  width: 22px;
  flex-shrink: 0;
  text-align: right;
}
.track-cover {
  width: 34px;
  height: 34px;
  object-fit: cover;
  background: var(--border);
  flex-shrink: 0;
}
.track-info {
  flex: 1;
  min-width: 0;
}
.track-title {
  font-size: 0.84rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-artist {
  font-size: 0.7rem;
  color: var(--mid);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-source {
  font-size: 0.58rem;
  color: var(--dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}
.track-reorder {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.track-move-btn {
  background: transparent;
  border: none;
  color: var(--dim);
  width: 22px;
  height: 22px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.12s;
}
.track-move-btn:hover { color: var(--text); }

.track-answers-btn {
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--mid);
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.12s, color 0.12s;
  flex-shrink: 0;
}
.track-answers-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.track-remove-btn {
  background: transparent;
  border: none;
  color: var(--dim);
  width: 26px;
  height: 26px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.12s;
  flex-shrink: 0;
}
.track-remove-btn:hover { color: var(--danger); }
</style>
