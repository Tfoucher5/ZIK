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
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent;
    color: rgba(255,255,255,0.6);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .tab:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
  .tab.active {
    background: rgba(62, 207, 255, 0.15);
    border-color: rgba(62, 207, 255, 0.5);
    color: #3ecfff;
  }
</style>
