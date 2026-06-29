<script>
  let { open, onClose, maxWidth = '440px', boxBg = 'rgba(20, 20, 35, 0.98)', children } = $props();
</script>

{#if open}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  onclick={e => { if (e.target === e.currentTarget) onClose(); }}
>
  <div class="modal-box" style="max-width: {maxWidth}; background: {boxBg}">
    <button class="modal-close" onclick={onClose} aria-label="Fermer">✕</button>
    {@render children()}
  </div>
</div>
{/if}

<style>
  @keyframes overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modal-in {
    from { opacity: 0; transform: scale(0.95) translateY(-8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: overlay-in 0.15s ease;
  }
  .modal-box {
    width: 100%;
    border-radius: 16px;
    padding: 32px;
    position: relative;
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    animation: modal-in 0.18s ease;
  }
  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: rgba(255,255,255,0.5);
    line-height: 1;
    padding: 4px;
    transition: color 0.15s;
  }
  .modal-close:hover { color: #fff; }
</style>
