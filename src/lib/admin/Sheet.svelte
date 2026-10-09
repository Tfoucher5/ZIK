<script>
  let { open = $bindable(false), title, wide = false, children } = $props();
  let closeBtn = $state();

  $effect(() => {
    if (open) closeBtn?.focus();
  });
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && (open = false)} />

{#if open}
  <button class="scrim" type="button" aria-label="Fermer" tabindex="-1" onclick={() => (open = false)}></button>
  <div class="sheet" class:wide role="dialog" aria-modal="true" aria-label={title}>
    <h2>{title}</h2>
    {@render children()}
    <button class="close" type="button" bind:this={closeBtn} onclick={() => (open = false)}>Fermer</button>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.55);
    border: 0;
  }
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 201;
    max-height: 82vh;
    overflow-y: auto;
    padding: 10px 20px calc(24px + env(safe-area-inset-bottom, 0px));
    background: var(--a-surface);
    border-top: 1px solid var(--a-line);
    border-radius: 20px 20px 0 0;
    color: var(--a-fg);
  }
  .sheet::before {
    content: '';
    display: block;
    width: 40px;
    height: 4px;
    margin: 0 auto 14px;
    border-radius: 99px;
    background: var(--a-line);
  }
  h2 {
    margin-bottom: 12px;
    font-family: var(--a-display);
    font-size: 1.5rem;
    font-weight: 800;
    text-transform: uppercase;
  }
  .close {
    width: 100%;
    margin-top: 18px;
    padding: 12px;
    border: 1px solid var(--a-line);
    border-radius: 12px;
    background: var(--a-surface2);
    color: var(--a-fg);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  /* Sur grand écran : une fenêtre centrée plutôt qu'un tiroir */
  @media (min-width: 900px) {
    .sheet {
      top: 50%;
      bottom: auto;
      left: 50%;
      right: auto;
      width: 560px;
      max-height: 86vh;
      padding: 24px 28px;
      border: 1px solid var(--a-line);
      border-radius: 20px;
      transform: translate(-50%, -50%);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
    }
    .sheet.wide { width: min(880px, 92vw); }
    .sheet::before { display: none; }
  }
</style>
