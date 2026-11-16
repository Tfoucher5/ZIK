<script>
  import TvRows from './TvRows.svelte';
  import { heroAt, clock, HERO_CYCLE, HERO_STILL } from './demos.js';

  let t = $state(HERO_STILL);
  const s = $derived(heroAt(t));
  const FOUND = ['Karim', 'Léa', 'Zoé'];
</script>

<div class="dev" aria-hidden="true" {@attach clock(HERO_CYCLE, HERO_STILL, (v) => (t = v))}>
  <div class="tv2">
    <div class="scr">
      <div class="stg">
        <div class="stg-in">
          <p class="kk">Manche <b class="w">3</b> / 10</p>
          <div class="tmr">{s.timer}</div>
          <p class="ans"><b>{s.found.length}</b> / 6 ont répondu</p>
          <div class="fnd">
            {#each FOUND as n (n)}<span class:in={s.found.includes(n)}>{n}</span>{/each}
          </div>
        </div>
      </div>
      <aside class="brd">
        <div class="brd-h"><span>Classement</span><span>6</span></div>
        <TvRows rows={s.rows} />
      </aside>
    </div>
  </div>
  <div class="ph">
    <div class="phs">
      <div class="ptr"><span class="k">Manche <b>3</b> / 10</span><span class="ptm">{s.timer}</span></div>
      <div class="pbar"><i style="transform:scaleX({s.bar})"></i></div>
      <div class="chips">
        <span class="chip" class:found={s.artist}>Artiste</span>
        <span class="chip" class:found={s.title}>Titre</span>
      </div>
      <div class="guess">
        <div class="inp">{s.typed}<i class="caret"></i></div>
        <span class="okb" class:press={s.press}>OK</span>
      </div>
      <div class="sent">
        <p class="k">Tes réponses</p>
        <div class="sr" class:in={s.artist}><span>daft punk</span><b>Artiste ✓</b></div>
        <div class="sr" class:in={s.title}><span>one more time</span><b>Titre ✓</b></div>
      </div>
    </div>
  </div>
</div>

<style>
  .dev {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 30%;
    width: min(100%, 640px);
    justify-self: center;
  }
  .tv2 {
    grid-column: 1 / -1;
  }
  .scr {
    font-size: 2.9cqw;
  }
  .ph {
    grid-column: 2;
    margin-top: -20%;
    margin-right: -2%;
    z-index: 2;
  }
  .phs {
    font-size: 8cqw;
  }
  .w {
    color: var(--text);
  }
  .tmr {
    font-family: var(--titre);
    font-weight: 900;
    font-size: 7em;
    line-height: 0.9;
    font-variant-numeric: tabular-nums;
  }
  .ans {
    color: var(--muted);
  }
  .ans b {
    color: var(--text);
    font-family: var(--mono);
  }
  .fnd {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3em;
    min-height: 1.6em;
    margin-top: 0.4em;
  }
  .fnd span {
    display: none;
    padding: 0.1em 0.55em;
    border-radius: 99px;
    background: rgba(61, 220, 132, 0.15);
    color: var(--ok);
    font-family: var(--titre);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.85em;
  }
  .fnd span.in {
    display: inline-block;
    animation: pop 0.35s var(--pop);
  }
  .ptm {
    font-family: var(--titre);
    font-weight: 900;
    font-size: 1.5em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .pbar {
    height: 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }
  .pbar i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--violet), var(--accent));
    transform-origin: left;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35em;
  }
  .chip {
    padding: 0.25em 0.65em;
    border-radius: 99px;
    border: 1px solid var(--line-2);
    font-family: var(--titre);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.85em;
    color: var(--muted);
    transition:
      background 0.3s,
      color 0.3s,
      border-color 0.3s;
  }
  .chip.found {
    background: var(--ok);
    border-color: var(--ok);
    color: #000;
  }
  .guess {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.35em;
  }
  .inp {
    padding: 0.5em 0.65em;
    border-radius: 0.45em;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--line-2);
    min-height: 2.3em;
    font-size: 0.92em;
    white-space: nowrap;
    overflow: hidden;
  }
  .caret {
    display: inline-block;
    width: 1px;
    height: 1em;
    background: var(--accent);
    vertical-align: middle;
    animation: blink 1s steps(1) infinite;
  }
  .okb {
    display: grid;
    place-items: center;
    padding: 0 0.8em;
    border-radius: 0.45em;
    background: var(--accent);
    color: #000;
    font-family: var(--titre);
    font-weight: 800;
    transition: transform 0.12s;
  }
  .okb.press {
    transform: scale(0.93);
  }
  .sent {
    display: grid;
    gap: 0.4em;
    margin-top: 0.4em;
    padding-top: 0.6em;
    border-top: 1px solid var(--line);
  }
  .sr {
    display: flex;
    justify-content: space-between;
    gap: 0.5em;
    padding: 0.45em 0.6em;
    border-radius: 0.45em;
    background: rgba(61, 220, 132, 0.1);
    font-size: 0.85em;
    opacity: 0;
    transform: translateY(8px);
    transition:
      opacity 0.3s,
      transform 0.3s;
  }
  .sr.in {
    opacity: 1;
    transform: none;
  }
  .sr b {
    color: var(--ok);
    font-family: var(--titre);
    text-transform: uppercase;
    white-space: nowrap;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
  }
  @media (min-width: 900px) {
    .ph {
      width: 86%;
      justify-self: end;
    }
  }
</style>
