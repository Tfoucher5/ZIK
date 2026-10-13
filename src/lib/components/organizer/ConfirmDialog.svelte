<script>
  import Modal from '$lib/components/Modal.svelte';

  // ask : { title, confirm, danger?, run } ou null
  let { ask = $bindable(null), busy = false, children } = $props();

  async function go() {
    await ask.run();
    ask = null;
  }
</script>

<Modal open={!!ask} onClose={() => !busy && (ask = null)} maxWidth="460px">
  {#if ask}
    <h2 class="cd-title">{ask.title}</h2>
    <div class="cd-body">{@render children?.()}</div>
    <div class="cd-actions">
      <button class="vn-btn vn-btn-ghost" onclick={() => (ask = null)} disabled={busy}>Annuler</button>
      <button class="vn-btn" class:cd-danger={ask.danger} onclick={go} disabled={busy}>{busy ? 'Un instant…' : ask.confirm}</button>
    </div>
  {/if}
</Modal>

<style>
  .cd-title { font-family: "Barlow Condensed", sans-serif; font-size: 1.5rem; font-weight: 900; line-height: 1.1; margin-bottom: 12px; padding-right: 24px; }
  .cd-body { font-size: 0.92rem; line-height: 1.6; color: var(--mid); }
  .cd-body :global(b) { color: var(--text); }
  .cd-body :global(blockquote) {
    margin: 14px 0 0;
    padding: 12px 14px;
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
  }
  .cd-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin-top: 22px; }
  .cd-danger { background: var(--danger); border-color: var(--danger); color: #fff; }
</style>
