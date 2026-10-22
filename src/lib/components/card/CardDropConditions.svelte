<script>
  /** Conditions d'exploit de la carte, réussies ou ratées. */
  let { conditions } = $props();
</script>

<ul class="cd-conditions">
  {#each conditions as c (c.label)}
    <li class:ok={c.ok}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {#if c.ok}<path d="M3.5 8.5l3 3 6-7" />{:else}<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />{/if}
      </svg>
      <span class="cd-cond-label">{c.label}</span>
      <span class="cd-cond-value">{c.value}</span>
    </li>
  {/each}
</ul>

<style>
  .cd-conditions {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 12px 0 0;
    border-top: 1px solid rgb(255 255 255 / 0.1);
    list-style: none;
  }

  .cd-conditions li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    color: #ff9b9b;
  }

  .cd-conditions li.ok {
    color: #86efac;
  }

  .cd-cond-label {
    color: rgb(255 255 255 / 0.8);
  }

  .cd-cond-value {
    font: 600 1rem/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
