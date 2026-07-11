<script>
  let { tabs, active, onChange } = $props();
</script>

<div class="tab-bar" role="tablist">
  {#each tabs as tab (tab.id)}
    <button
      role="tab"
      class="tab"
      class:active={active === tab.id}
      aria-selected={active === tab.id}
      onclick={() => onChange(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tab-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tab {
    padding: 8px 18px;
    border-radius: 20px;
    border: 1px solid rgb(var(--c-glass) / 0.1);
    background: transparent;
    color: rgb(var(--c-glass) / 0.6);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .tab:hover { border-color: rgb(var(--c-glass) / 0.3); color: var(--text); }
  .tab.active {
    background: rgb(var(--accent-rgb) / 0.12);
    border-color: rgb(var(--accent-rgb) / 0.45);
    color: var(--accent);
  }
</style>
