<script>
  let { warn = false, label, children } = $props();
</script>

<div class={warn ? 'doc-warn' : 'doc-tip'}>
  <span class={warn ? 'doc-warn-icon' : 'doc-tip-icon'}>{warn ? '⚠️' : '💡'}</span>
  <div>
    <strong>{label}</strong> {@render children()}
  </div>
</div>

<style>
  .doc-tip,
  .doc-warn {
    display: flex;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 10px;
    margin: 24px 0;
    font-size: 0.88rem;
    line-height: 1.6;
    align-items: flex-start;
  }

  .doc-tip {
    background: rgb(var(--accent-rgb) / 0.1);
    border: 1px solid rgb(var(--accent-rgb) / 0.25);
    color: var(--mid, #ccc);
  }

  .doc-warn {
    background: rgba(234, 179, 8, 0.08);
    border: 1px solid rgba(234, 179, 8, 0.25);
    color: var(--mid, #ccc);
  }

  .doc-tip-icon,
  .doc-warn-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .doc-tip :global(strong),
  .doc-warn :global(strong) {
    color: var(--text, #fff);
    display: block;
    margin-bottom: 4px;
  }
</style>
