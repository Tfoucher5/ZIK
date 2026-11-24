<script>
  import { FREE_MAX_PLAYERS } from '#lib/data/proPlans.js';
  import TvRows from './TvRows.svelte';
  import { playersAt, clock, PLAYERS_CYCLE } from './demos.js';

  const STILL = PLAYERS_CYCLE - 1;
  let t = $state(STILL);
  const s = $derived(playersAt(t));
</script>

<div class="tv2" {@attach clock(PLAYERS_CYCLE, STILL, (v) => (t = v))}>
  <div class="scr">
    <div class="stg">
      <div class="stg-in">
        <p class="kk"><b>●</b> Joueurs connectés</p>
        <div class="n">{s.count}</div>
        <div class="code">{#each 'KZ4P2M' as c, i (i)}<b>{c}</b>{/each}</div>
        <div class="lim" class:over={s.over}>
          <span>Gratuit : {FREE_MAX_PLAYERS} max</span><span class="pro-tag">ZIK Pro</span>
        </div>
      </div>
    </div>
    <aside class="brd">
      <div class="brd-h"><span>Arrivées</span><span>{s.count}</span></div>
      <TvRows rows={s.rows} />
    </aside>
  </div>
</div>

<style>
  .n {
    font-family: var(--titre);
    font-weight: 900;
    font-size: 5em;
    line-height: 0.9;
    font-variant-numeric: tabular-nums;
  }
  .code {
    display: flex;
    gap: 0.25em;
  }
  .code b {
    display: grid;
    place-items: center;
    width: 1.45em;
    height: 1.8em;
    border-radius: 0.25em;
    background: rgba(255, 255, 255, 0.09);
    font-family: var(--mono);
    font-size: 1.2em;
  }
  .lim {
    margin-top: 0.6em;
    display: inline-flex;
    gap: 0.5em;
    align-items: center;
    font-family: var(--mono);
    font-size: 0.72em;
    color: var(--muted);
  }
  .lim .pro-tag {
    margin: 0;
    padding: 0.3em 0.6em;
    font-size: 0.95em;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .lim.over .pro-tag {
    opacity: 1;
  }
</style>
