<script>
  let { options, value = $bindable() } = $props();
</script>

<div class="rm-motifs">
  {#each options as m (m.value)}
    <button type="button" class="rm-motif" class:on={value === m.value} onclick={() => value = m.value}>
      {m.label}
    </button>
  {/each}
</div>

<style>
.rm-motifs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.rm-motif {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 12px;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: left;
  background: rgb(var(--c-glass, 255 255 255) / 0.04);
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.1));
  border-radius: 10px;
  color: var(--mid, #8896aa);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.rm-motif::before {
  content: "";
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
  border: 1px solid var(--border2, rgb(var(--c-glass) / 0.18));
  background: transparent;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.rm-motif:hover {
  border-color: var(--border2, rgb(var(--c-glass) / 0.18));
  color: var(--text, #fafafa);
}
.rm-motif.on {
  background: rgb(var(--accent-rgb, 255 0 255) / 0.1);
  border-color: rgb(var(--accent-rgb, 255 0 255) / 0.5);
  color: var(--text, #fafafa);
  box-shadow: 0 0 16px rgb(var(--accent-rgb, 255 0 255) / 0.12);
}
.rm-motif.on::before {
  background: var(--accent, #ff00ff);
  border-color: var(--accent, #ff00ff);
  box-shadow: 0 0 8px rgb(var(--accent-rgb, 255 0 255) / 0.6);
}
</style>
