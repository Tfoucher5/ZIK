<script>
  /** Barre de progression ; sans label elle est décorative (span, utilisable dans un bouton). */
  let { width, label = null, total = false } = $props();
</script>

{#if label}
  <div class="col-progress" class:col-progress-total={total} role="img" aria-label={label}>
    <span style:width></span>
  </div>
{:else}
  <span class="col-progress" aria-hidden="true">
    <span style:width></span>
  </span>
{/if}

<style>
  .col-progress-total {
    max-width: 420px;
    margin-top: 10px;
  }

  .col-progress {
    display: block;
    height: 5px;
    border-radius: 3px;
    background: var(--surface2);
    overflow: hidden;
  }

  .col-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
  }

  :global(.col-group.is-done) .col-progress span {
    background: var(--rarity-legendary);
  }

  :global(.col-set-head) .col-progress {
    width: min(320px, 70vw);
  }
</style>
