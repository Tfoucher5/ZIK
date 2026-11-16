<script>
  let { loading = false, hasMore = false, onLoad } = $props();
</script>

{#if hasMore}
  <div class="load-more-wrap">
    <button type="button" class="load-more-btn" onclick={onLoad} disabled={loading}>
      {loading ? 'Chargement…' : 'Charger plus'}
    </button>
  </div>
{/if}

<style>
  .load-more-wrap {
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }
  /* Jetons v2 sur les pages refaites, valeurs v1 en repli ailleurs */
  .load-more-btn {
    min-height: 44px;
    padding: 0 28px;
    border-radius: 999px;
    border: 1px solid var(--line-2, rgb(var(--c-glass) / 0.15));
    background: transparent;
    color: var(--text);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .load-more-btn:hover:not(:disabled) {
    border-color: var(--text);
  }
  .load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
