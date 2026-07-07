<script>
  let { icon = '🎵', title, description = '' } = $props();
</script>

<div class="empty-state">
  <span class="empty-icon">{icon}</span>
  <p class="empty-title">{title}</p>
  {#if description}<p class="empty-desc">{description}</p>{/if}
</div>

<style>
  .empty-state {
    text-align: center;
    padding: 48px 20px;
    color: rgb(var(--c-glass) / 0.4);
  }
  .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 12px; }
  .empty-title { font-size: 1rem; font-weight: 600; color: rgb(var(--c-glass) / 0.6); margin: 0 0 6px; }
  .empty-desc { font-size: 0.875rem; margin: 0; }
</style>
