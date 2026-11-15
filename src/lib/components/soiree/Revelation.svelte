<script module>
  import { ease, pad, seg, stage } from '$lib/components/soiree/soireePins.js';

  // [pseudo, score avant, points gagnés]
  const B = [['Karim', 21, 0], ['Léa', 19, 3], ['Zoé', 18, 2], ['Hugo', 14, 3], ['Inès', 12, 2], ['Malik', 9, 0], ['Sarah', 7, 3], ['Tom', 5, 0]];
  const AFTER = [...B].sort((a, b) => b[1] + b[2] - (a[1] + a[2])).map((x) => x[0]);

  export function render(p) {
    const f = ease(seg(p, 0.04, 0.3));
    const a = ease(seg(p, 0.26, 0.4));
    const b = seg(p, 0.4, 0.5);
    const d = ease(seg(p, 0.5, 0.62));
    const c = seg(p, 0.6, 0.76);
    const m = ease(seg(p, 0.78, 0.95));
    return {
      cover: `rotateY(${180 - 180 * f}deg)`,
      txt: { o: a, y: `translateY(${(1 - a) * 20}%)` },
      fast: { o: b, k: `scale(${0.7 + 0.3 * ease(b)})` },
      bar: 1 - seg(p, 0.04, 1),
      rows: B.map(([n, s, g], i) => {
        const j = AFTER.indexOf(n);
        return {
          n,
          s: s + Math.round(g * c),
          g,
          go: g ? d : 0,
          gx: `translateX(${(1 - d) * -260}%) scale(${0.6 + 0.4 * d})`,
          y: i + (j - i) * m,
          up: j < i && m > 0,
          rk: pad((m > 0.5 ? j : i) + 1),
        };
      }),
      beat: stage(p, [0.5]),
    };
  }
</script>

<script>
  import Pin from '$lib/components/soiree/Pin.svelte';
  import { PINS } from '$lib/components/soiree/soireeBeats.js';

  let p = $state(1);
  const s = $derived(render(p));
</script>

<Pin id="revelation" len={1.2} {...PINS.revelation} beat={s.beat} onprogress={(v) => (p = v)}>
  <div class="dev solo" aria-hidden="true">
    <div class="tv2">
      <div class="scr">
        <div class="stg rev">
          <div class="cvw"><div class="cv" style:transform={s.cover}><div class="cv-f"></div><div class="cv-b">?</div></div></div>
          <div class="rev-t" style:opacity={s.txt.o} style:transform={s.txt.y}>
            <p class="kk">Tout le monde a répondu !</p>
            <div class="rev-a">One More Time</div>
            <div class="rev-f">Daft Punk</div>
          </div>
          <div class="rev-1" style:opacity={s.fast.o} style:transform={s.fast.k}>Le plus rapide<b>Léa</b></div>
          <div class="rbar"><i style:transform="scaleX({s.bar})"></i></div>
        </div>
        <aside class="brd">
          <div class="brd-h"><span>Classement</span><span>8</span></div>
          <ol class="rows">
            {#each s.rows as r (r.n)}
              <li class="row" class:up={r.up} style:transform="translateY({r.y * 117}%)">
                <span class="rk">{r.rk}</span><span class="nm">{r.n}</span>
                <span class="pt"><span>{r.s}</span>{#if r.g}<small style:opacity={r.go} style:transform={r.gx}>+{r.g}</small>{/if}</span>
              </li>
            {/each}
          </ol>
        </aside>
      </div>
    </div>
  </div>
</Pin>

<style>
  .stg.rev { grid-template-columns: 42% minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; gap: 2.4cqw 3cqw; place-items: center start; text-align: left; padding-bottom: 2cqw; }
  .cvw { width: 100%; aspect-ratio: 1; perspective: 70cqw; }
  .cv { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; }
  .cv > div { position: absolute; inset: 0; border-radius: 0.45em; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .cv-b { display: grid; place-items: center; transform: rotateY(180deg); background: repeating-linear-gradient(45deg, #1e1428 0 6px, #140e1a 6px 12px); font-family: var(--titre); font-weight: 900; font-size: 4em; color: rgba(255, 255, 255, 0.3); }
  .cv-f { background: radial-gradient(circle at 50% 50%, #0b0b10 0 13%, #e9e9f2 13.5% 15%, transparent 15.5%), conic-gradient(from 30deg, #ff00ff, #7b5cff, #2fb8ff, #3ddc84, #f4e04d, #ff4f9a, #ff00ff); box-shadow: 0 1.4em 3em -1em rgba(255, 0, 255, 0.45); }
  .rev-t { min-width: 0; }
  .rev-a { font-family: var(--titre); font-weight: 900; text-transform: uppercase; font-size: 3.4em; line-height: 0.88; margin-top: 0.15em; }
  .rev-f { color: var(--soft); font-size: 1.2em; margin-top: 0.2em; }
  .rev-1 { grid-column: 1 / -1; justify-self: center; display: inline-flex; gap: 0.6em; align-items: baseline; padding: 0.3em 1em; border-radius: 99px; background: rgba(255, 255, 255, 0.07); border: 1px solid var(--line-2); font-family: var(--mono); font-size: 0.78em; text-transform: uppercase; color: var(--muted); }
  .rev-1 b { font-family: var(--titre); font-size: 1.7em; color: var(--text); }
  .rbar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
  .rbar i { display: block; height: 100%; background: linear-gradient(90deg, var(--violet), var(--accent)); transform-origin: left; }
</style>
