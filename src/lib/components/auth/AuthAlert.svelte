<script>
  /** @type {{ message: string }} */
  let { message } = $props();
</script>

{#if message}<div class="alert-err">{message}</div>{/if}

<style>
  .alert-err {
    background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.4);
    color: var(--danger, #f87171); border-radius: var(--r, 5px);
    padding: 8px 12px; font-size: 0.82rem; margin-bottom: 12px;
  }
</style>
