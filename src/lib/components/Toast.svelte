<script>
  import { toastState } from '$lib/toast.svelte.js';
</script>

{#if toastState.msg}
  <div class="toast toast--{toastState.type}" role="status" aria-live="polite">
    {toastState.msg}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--modal-bg);
    color: var(--text);
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.95rem;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    border: 1px solid rgb(var(--c-glass) / 0.08);
    white-space: nowrap;
    animation: toast-in 0.2s ease;
  }
  .toast--success { border-color: rgb(var(--accent-rgb) / 0.4); }
  .toast--error   { border-color: rgba(255, 80, 80, 0.4); }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
</style>
