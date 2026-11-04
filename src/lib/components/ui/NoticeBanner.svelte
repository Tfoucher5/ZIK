<script>
  let { message, tv = false } = $props();
</script>

{#if message}
  <p class="notice" class:tv role="status"><b>Annonce ZIK</b> {message}</p>
{/if}

<style>
  .notice {
    margin: 12px 0 0;
    padding: 12px 14px;
    border-left: 4px solid var(--warn);
    border-radius: 3px;
    background: color-mix(in srgb, var(--warn) 14%, var(--surface));
    color: var(--text);
    font-size: 0.95rem;
    line-height: 1.4;
  }
  .notice b {
    display: block;
    color: var(--warn);
    font-size: 0.8em;
    text-transform: uppercase;
  }
  .notice.tv {
    margin: 0;
    padding: 16px 64px;
    border-radius: 0;
    font-size: 1.75rem;
  }
  .notice.tv b {
    display: inline;
    margin-right: 16px;
    font-size: 1em;
  }
</style>
