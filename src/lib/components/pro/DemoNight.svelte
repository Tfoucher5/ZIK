<script>
  import { nightAt, clock, NIGHT, NIGHT_CYCLE, NIGHT_STILL } from './demos.js';

  // Ordre d'affichage du podium : 2e, 1re, 3e ; révélé du 3e au 1er
  const PODIUM = [
    { n: 'Karim', s: 88, place: 2, h: 62, at: 2 },
    { n: 'Léa', s: 93, place: 1, h: 80, at: 3 },
    { n: 'Zoé', s: 80, place: 3, h: 46, at: 1 },
  ];
  let t = $state(NIGHT_STILL);
  const s = $derived(nightAt(t));
</script>

<div class="tv2" {@attach clock(NIGHT_CYCLE, NIGHT_STILL, (v) => (t = v))}>
  <div class="scr one">
    <div class="stg">
      <div class="lay cum" class:on={!s.podium}>
        <p class="kk">Soirée · {s.game < 1 ? '1 partie' : `${s.game + 1} parties`}</p>
        <ol>
          {#each NIGHT as [n, pts], j (n)}
            {@const v = s.game < 0 ? 0 : pts[s.game]}
            <li class:gold={j === 0}>
              <b>{n}</b>
              <div class="bar"><i style="transform:scaleX({v / 100})"></i></div>
              <span>{v}</span>
            </li>
          {/each}
        </ol>
      </div>
      <div class="lay fin" class:on={s.podium}>
        <div>
          <p class="kk">Fin de la soirée · 3 parties</p>
          <div class="fin-t">Le podium de la soirée</div>
        </div>
        <div class="fin-p">
          {#each PODIUM as p (p.n)}
            <div class="plc p{p.place}" class:on={s.places >= p.at}>
              {#if p.place === 1}<svg class="crown" viewBox="0 0 64 40"><path d="M4 36 L8 8 L22 22 L32 4 L42 22 L56 8 L60 36 Z" /></svg>{/if}
              <span class="n">{p.n}</span>
              <span class="s">{p.s} pts</span>
              <div class="blk" style="--h:{p.h}%">{p.place}</div>
            </div>
          {/each}
        </div>
        <ol class="fin-r"><li>4 <b>Hugo</b> 66</li><li>5 <b>Inès</b> 58</li><li>6 <b>Sarah</b> 51</li></ol>
      </div>
    </div>
  </div>
</div>

<style>
  .lay {
    position: absolute;
    inset: 0;
    display: grid;
  }
  .cum {
    grid-template-rows: auto minmax(0, 1fr);
    gap: 1.6em;
    text-align: left;
  }
  .cum ol {
    list-style: none;
    margin: 0;
    padding: 0 4%;
    display: grid;
    align-content: center;
    gap: 0.9em;
  }
  .cum li {
    display: grid;
    grid-template-columns: 4.4em minmax(0, 1fr) 2.6em;
    gap: 0.8em;
    align-items: center;
  }
  .cum li b {
    font-family: var(--titre);
    text-transform: uppercase;
    font-size: 1.15em;
  }
  .cum li span {
    font-family: var(--mono);
    font-weight: 700;
    text-align: right;
  }
  .bar {
    height: 1.1em;
    border-radius: 0.3em;
    background: rgba(255, 255, 255, 0.06);
    overflow: hidden;
  }
  .bar i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--violet), var(--accent));
    transform-origin: left;
    transition: transform 0.8s var(--out);
  }
  .gold .bar i {
    background: linear-gradient(90deg, #f0b030, #ffe08a);
  }
  .fin {
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 1.6cqw;
    text-align: center;
  }
  .fin-t {
    margin-top: 0.15em;
    font-family: var(--titre);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 2.8em;
    line-height: 0.95;
  }
  .fin-p {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.6cqw;
    align-items: end;
    width: 76%;
    height: 100%;
    min-height: 0;
    margin: 0 auto;
  }
  .plc {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0.2em;
    opacity: 0;
    transform: translateY(18%);
    transition:
      opacity 0.4s,
      transform 0.6s cubic-bezier(0.2, 1.3, 0.4, 1);
  }
  .plc.on {
    opacity: 1;
    transform: none;
  }
  .n {
    font-family: var(--titre);
    font-weight: 800;
    text-transform: uppercase;
    font-size: 1.3em;
    line-height: 1;
  }
  .s {
    font-family: var(--mono);
    font-size: 0.8em;
    color: var(--muted);
  }
  .blk {
    height: var(--h);
    display: grid;
    place-items: start center;
    padding-top: 0.3em;
    border-radius: 0.3em 0.3em 0 0;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 1.6em;
    color: #111;
  }
  .p1 .blk {
    background: linear-gradient(#ffe08a, var(--gold));
  }
  .p2 .blk {
    background: linear-gradient(#f0f0f6, var(--silver));
  }
  .p3 .blk {
    background: linear-gradient(#f0b07a, var(--bronze));
  }
  .p1 .n {
    color: var(--gold);
    font-size: 1.6em;
  }
  .crown {
    width: 2.2em;
    margin: 0 auto 0.1em;
    fill: var(--gold);
  }
  .fin-r {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3em 0.6em;
    font-size: 0.78em;
    color: var(--muted);
  }
  .fin-r b {
    color: var(--text);
    font-weight: 600;
  }
</style>
