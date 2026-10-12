<script>
  let { choices, checked = $bindable() } = $props();
</script>

{#if choices.length}
  <div class="rm-tracks">
    {#each choices as c (c.key)}
      <label class="rm-track" class:locked={c.locked}>
        <input
          type="checkbox"
          checked={Boolean(checked[c.key])}
          onchange={e => checked = { ...checked, [c.key]: e.currentTarget.checked }}
        >
        <span class="rm-track-lbl">{c.label}</span>
        {#if c.locked}<span class="rm-track-lock" title="Titre masqué pendant la manche">🔒</span>{/if}
      </label>
    {/each}
  </div>
{:else}
  <p class="rm-empty">Aucun titre joué pour l'instant.</p>
{/if}

<style>
.rm-tracks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 190px;
  overflow-y: auto;
}
.rm-track {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--mid, #94a3b8);
  transition: border-color 0.15s;
}
.rm-track:hover { border-color: rgb(var(--accent-rgb) / 0.4); }
.rm-track.locked { border-style: dashed; }
.rm-track input { flex-shrink: 0; accent-color: var(--accent); }
.rm-track-lbl {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-track-lock { flex-shrink: 0; font-size: 0.78rem; }
.rm-empty { color: var(--dim, #64748b); font-size: 0.83rem; margin: 0; }
</style>
