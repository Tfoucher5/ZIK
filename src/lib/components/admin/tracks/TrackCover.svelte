<script>
  /** Pochette d'un titre du catalogue, ou une note de musique à défaut. */
  let { t, size = '' } = $props();
</script>

{#if t.cover_url}<img class="a-cover {size}" src={t.cover_url} alt="" loading="lazy" />{:else}<span class="a-cover {size} ph">♪</span>{/if}

<style>
  .ph { display: grid; place-items: center; color: var(--a-dim); }
  .a-cover.sm { width: 38px; height: 38px; }
  .a-cover.xl { width: 96px; height: 96px; border-radius: 12px; font-size: 2rem; }
</style>
