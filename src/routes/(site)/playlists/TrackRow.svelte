<script>
  let { track, index, onRemove, onMoveUp, onMoveDown, onEditAnswers } = $props();
</script>

<div class="track-row-pl">
  <span class="track-num">{index}</span>
  {#if track.cover_url}
    <img class="track-cover" src={track.cover_url} alt="" onerror={e => e.currentTarget.style.display='none'}>
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
    <button class="track-answers-btn" title="Réponses custom" onclick={onEditAnswers}>&#x270E;</button>
  {/if}
  <button class="track-remove-btn" onclick={onRemove}>&#x2715;</button>
</div>

<style>
.track-row-pl {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  background: rgb(var(--c-glass) / 0.02);
  border: 1px solid var(--border);
}
.track-num {
  font-size: 0.75rem;
  color: var(--dim);
  width: 22px;
  flex-shrink: 0;
  text-align: right;
}
.track-cover {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  object-fit: cover;
  background: rgb(var(--c-glass) / 0.05);
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
  font-size: 0.72rem;
  color: var(--mid);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-source {
  font-size: 0.65rem;
  color: var(--dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}
.track-move-btn:hover {
  color: var(--text);
  background: rgb(var(--c-glass) / 0.1);
}
.track-answers-btn {
  background: transparent;
  border: none;
  color: var(--dim);
  width: 26px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.track-answers-btn:hover {
  color: var(--accent);
  background: rgb(var(--c-accent) / 0.12);
}
.track-remove-btn {
  background: transparent;
  border: none;
  color: var(--dim);
  width: 26px;
  height: 26px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.track-remove-btn:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}
</style>
