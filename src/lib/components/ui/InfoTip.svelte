<script>
  /** Petit « ? » qui ouvre une bulle d'explication au clic (ou au clavier). */
  let { label = 'Plus d’infos', children } = $props();

  let open = $state(false);
  let tip = $state(null);
  const id = `tip-${Math.random().toString(36).slice(2, 8)}`;
</script>

<svelte:window
  onclick={(e) => { if (!tip?.contains(e.target)) open = false; }}
  onkeydown={(e) => { if (e.key === 'Escape') open = false; }}
/>

<span class="tip" bind:this={tip}>
  <button type="button" class="tip-btn" aria-label={label} aria-expanded={open} aria-controls={id}
    onclick={() => (open = !open)}>?</button>
  {#if open}
    <span class="tip-bulle" {id} role="tooltip">{@render children()}</span>
  {/if}
</span>

<style>
  .tip { position: relative; display: inline-flex; vertical-align: middle; margin-left: 6px; }
  .tip-btn {
    width: 20px; height: 20px; padding: 0; border-radius: 50%;
    border: 1px solid var(--border2); background: none; color: var(--mid);
    font: inherit; font-size: 0.72rem; font-weight: 700; line-height: 1; cursor: pointer;
  }
  .tip-btn:hover, .tip-btn[aria-expanded='true'] { border-color: var(--accent); color: var(--accent); }
  .tip-bulle {
    position: absolute; top: calc(100% + 8px); left: -10px; z-index: 50;
    width: max-content; max-width: min(300px, 80vw);
    padding: 12px 14px; border-radius: 4px;
    background: var(--bg2); border: 1px solid var(--border2);
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
    color: var(--text); font-size: 0.82rem; font-weight: 400; line-height: 1.5;
    text-transform: none; letter-spacing: 0; text-align: left;
  }
</style>
