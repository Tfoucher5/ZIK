<script>
  /** Réglage des sons de la TV, pour l'hôte qui n'a pas la régie sous la main. */
  let { settings, onSet } = $props();

  let open = $state(false);
  let box = $state(null);
  // Le son du buzz n'a de sens qu'en mode buzzer
  let sons = $derived([
    ...(settings.answerMode === 'buzzer' ? [['buzzSound', 'Son du buzz']] : []),
    ['finaleSound', 'Roulement de tambour du podium final'],
  ]);
</script>

<svelte:window onclick={(e) => { if (!box?.contains(e.target)) open = false; }} />

<div class="hs" bind:this={box}>
  <button class="sh-icon-btn" title="Sons de la TV" aria-label="Sons de la TV" aria-expanded={open} onclick={() => (open = !open)}>🔔</button>
  {#if open}
    <div class="hs-panel">
      <p class="sx-kicker">Sons de la TV</p>
      {#each sons as [key, label] (key)}
        <label>
          <input type="checkbox" checked={settings[key] !== false} onchange={(e) => onSet({ [key]: e.currentTarget.checked })}>
          {label}
        </label>
      {/each}
    </div>
  {/if}
</div>

<style>
  .hs { position: relative; }
  .hs-panel {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 60;
    display: flex; flex-direction: column; gap: 10px;
    min-width: 220px; padding: 14px;
    background: var(--bg2); border: 1px solid var(--border2); border-radius: 4px;
    box-shadow: 0 14px 40px rgb(0 0 0 / 0.4);
  }
  .hs-panel label { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; cursor: pointer; }
  .hs-panel input { width: 18px; height: 18px; accent-color: var(--accent); }
</style>
