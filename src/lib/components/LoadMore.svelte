<script>
  let { loading = false, hasMore = false, onLoad } = $props();
</script>

{#if hasMore}
  <div class="load-more-wrap">
    <button class="load-more-btn" onclick={onLoad} disabled={loading}>
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
  .load-more-btn {
    padding: 10px 28px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.15);
    background: transparent;
    color: rgba(255,255,255,0.7);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .load-more-btn:hover:not(:disabled) {
    border-color: rgba(62,207,255,0.4);
    color: #3ecfff;
  }
  .load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
