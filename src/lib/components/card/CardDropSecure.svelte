<script>
  /** Progression vers la manche où la carte gagnée devient définitive. */
  let { round, maxRounds, delayed = false } = $props();

  const secureAt = $derived(Math.ceil(maxRounds / 2));
  const secured = $derived(round >= secureAt);
</script>

<div class="cd-secure" class:is-secured={secured}>
  <div class="cd-track" role="img" aria-label={`Manche ${round} sur ${maxRounds}`}>
    {#each Array.from({ length: maxRounds }, (_, i) => i + 1) as n (n)}
      <span class="cd-seg" class:done={n <= round} class:goal={n === secureAt}></span>
    {/each}
  </div>
  <p class="cd-secure-text">
    {#if secured}
      <svg viewBox="0 0 16 16" aria-hidden="true"
        ><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg
      >
      Carte sécurisée{delayed ? ", disponible dans ta collection sous 24 h" : ""}
    {:else}
      Sécurisée à la manche {secureAt}, reste jusque-là pour la garder
    {/if}
  </p>
</div>

<style>
  .cd-secure {
    display: grid;
    gap: 8px;
  }

  .cd-track {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 4px;
  }

  .cd-seg {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: rgb(255 255 255 / 0.12);
  }

  .cd-seg.done {
    background: var(--rc);
  }

  .cd-seg.goal::after {
    content: '';
    position: absolute;
    top: -4px;
    right: -3px;
    width: 2px;
    height: 14px;
    border-radius: 1px;
    background: #f5f3f8;
  }

  .cd-secure-text {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 0.82rem;
    color: rgb(255 255 255 / 0.6);
  }

  .cd-secure.is-secured .cd-secure-text {
    color: var(--rc-light);
    font-weight: 600;
  }

  svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
