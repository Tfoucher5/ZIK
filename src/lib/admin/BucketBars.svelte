<script>
  let { title, buckets = [], footer = '' } = $props();

  const max = $derived(Math.max(1, ...buckets.map((b) => b.n)));
  const total = $derived(buckets.reduce((s, b) => s + b.n, 0));
</script>

<div class="bars">
  <h2>{title}</h2>
  {#if total === 0}
    <p class="empty">Aucune donnée sur la période.</p>
  {:else}
    <ul>
      {#each buckets as b (b.label)}
        <li>
          <span class="lbl">{b.label}</span>
          <span class="track">
            <span class="fill" style="width: {(b.n / max) * 100}%"></span>
          </span>
          <span class="val">{b.n}</span>
        </li>
      {/each}
    </ul>
  {/if}
  {#if footer}
    <p class="note">{footer}</p>
  {/if}
</div>

<style>
  .bars {
    background: var(--adm-panel);
    border: 1px solid var(--adm-border);
    border-radius: 10px;
    padding: 18px 20px;
  }
  h2 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--adm-text);
    margin-bottom: 14px;
  }
  ul { display: flex; flex-direction: column; gap: 9px; }
  li {
    display: grid;
    grid-template-columns: 90px 1fr 42px;
    align-items: center;
    gap: 10px;
  }
  .lbl {
    font-size: 0.74rem;
    color: var(--adm-muted);
  }
  .track {
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--adm-accent);
  }
  .val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem;
    color: var(--adm-text);
    text-align: right;
  }
  .empty, .note {
    font-size: 0.72rem;
    color: var(--adm-muted);
    margin-top: 10px;
  }
</style>
