<script>
  import { pad } from './demos.js';

  /** @type {{ rows: { n: string, y: number, s?: number, rk?: string, plus?: string }[] }} */
  let { rows } = $props();
</script>

<ol class="rows">
  {#each rows as r (r.n)}
    <li class="row" class:up={r.plus} style="--y:{r.y}">
      <span class="rk">{r.rk ?? pad(r.y + 1)}</span>
      <span class="nm">{r.n}</span>
      <span class="pt"><span>{r.s ?? ''}</span><small class:on={r.plus}>{r.plus}</small></span>
    </li>
  {/each}
</ol>

<style>
  .rows {
    position: relative;
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
  }
  .row {
    position: absolute;
    inset: 0 0 auto;
    height: 10.6%;
    display: grid;
    grid-template-columns: 1.5em minmax(0, 1fr) auto;
    gap: 0.4em;
    align-items: center;
    padding: 0 0.5em;
    border-radius: 0.35em;
    background: rgba(255, 255, 255, 0.045);
    transform: translateY(calc(var(--y) * 117%));
    transition:
      transform 0.5s var(--out),
      background 0.4s,
      opacity 0.35s;
  }
  @starting-style {
    .row {
      opacity: 0;
    }
  }
  .row.up {
    background: rgba(61, 220, 132, 0.16);
  }
  .rk {
    font-family: var(--mono);
    color: var(--muted);
    font-size: 0.8em;
  }
  .nm {
    font-family: var(--titre);
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pt {
    position: relative;
    font-family: var(--mono);
    font-weight: 700;
  }
  small {
    position: absolute;
    right: 100%;
    top: 50%;
    translate: 0 -50%;
    margin-right: 0.35em;
    font-size: 0.8em;
    color: var(--ok);
    opacity: 0;
    transition: opacity 0.3s;
  }
  small.on {
    opacity: 1;
  }
</style>
