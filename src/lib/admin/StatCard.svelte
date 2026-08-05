<script>
  import Sparkline from './Sparkline.svelte';
  let { label, value, delta = null, spark = [] } = $props();
</script>

<div class="card">
  <div class="label">{label}</div>
  <div class="row">
    <div class="value">{value ?? '—'}</div>
    {#if delta}
      <span class="delta {delta.dir}">
        {delta.dir === 'up' ? '↗' : delta.dir === 'down' ? '↘' : '→'}
        {delta.pct === null ? 'nouveau' : `${delta.pct > 0 ? '+' : ''}${delta.pct} %`}
      </span>
    {/if}
  </div>
  <Sparkline points={spark} />
</div>

<style>
  .card {
    background: var(--adm-glass);
    border: 1px solid var(--adm-border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .label {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--adm-muted);
  }
  .row { display: flex; align-items: baseline; gap: 10px; }
  .value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.9rem;
    font-weight: 600;
    color: var(--adm-text);
  }
  .delta { font-size: 0.78rem; font-weight: 500; }
  .delta.up { color: var(--adm-green); }
  .delta.down { color: var(--adm-red); }
  .delta.flat { color: var(--adm-muted); }
</style>
