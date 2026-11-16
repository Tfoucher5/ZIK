<script module>
  import { seg, stage, typed } from '$lib/components/soiree/soireePins.js';

  // [pseudo, score, artiste trouvé à, titre trouvé à] (2 = jamais)
  const P = [['Karim', 21, 0.12, 0.2], ['Léa', 19, 0.3, 0.56], ['Zoé', 18, 0.24, 0.4], ['Hugo', 14, 0.44, 0.62], ['Inès', 12, 0.5, 0.7], ['Malik', 9, 0.64, 2], ['Sarah', 7, 0.72, 0.8], ['Tom', 5, 0.82, 2]];

  export function render(p) {
    const t = 30 - Math.floor(seg(p, 0.03, 0.86) * 21);
    const A = p >= 0.3;
    const T = p >= 0.56;
    return {
      t,
      warn: t <= 10,
      rows: P.map(([n, s, a, ti]) => ({ n, s, a: p >= a, t: p >= ti })),
      ans: P.filter((x) => p >= x[2]).length,
      all: p >= 0.88,
      A,
      T,
      txt: A ? typed(p, 'one more time', 0.36, 0.52) : typed(p, 'daft punk', 0.1, 0.25),
      ok: (p > 0.26 && p < 0.3) || (p > 0.53 && p < 0.56),
      beat: stage(p, [0.3, 0.6]),
    };
  }
</script>

<script>
  import Pin from '$lib/components/soiree/Pin.svelte';
  import { PINS } from '$lib/components/soiree/soireeBeats.js';
  import { pad } from '$lib/components/soiree/soireePins.js';

  let p = $state(0.6);
  const s = $derived(render(p));
</script>

<Pin id="manche" len={1.4} {...PINS.manche} beat={s.beat} onprogress={(v) => (p = v)}>
  <div class="dev duo" aria-hidden="true">
    <div class="tv2">
      <div class="scr">
        <div class="stg">
          <div class="mid">
            <p class="kk">Manche <b class="txt">3</b> / 10</p>
            <div class="tmr" class:warn={s.warn}>{s.t}</div>
            <p class="ans"><b>{s.ans}</b> / 8 ont répondu</p>
            <div class="fnd">{#each s.rows as r (r.n)}<span class:in={r.t}>{r.n}</span>{/each}</div>
          </div>
          <div class="tst" class:on={s.all}>Tout le monde a répondu !</div>
        </div>
        <aside class="brd">
          <div class="brd-h"><span>Classement</span><span>8</span></div>
          <ol class="rows">
            {#each s.rows as r, i (r.n)}
              <li class="row" style:--y={i}>
                <span class="rk">{pad(i + 1)}</span>
                <span class="nm">{r.n}<span class="mk"><i class:ok={r.a}>A</i><i class:ok={r.t}>T</i></span></span>
                <span class="pt"><span>{r.s}</span></span>
              </li>
            {/each}
          </ol>
        </aside>
      </div>
    </div>
    <div class="ph">
      <div class="phs">
        <div class="ptr"><span class="k">Manche <b>3</b> / 10</span><span class="ptm">{s.t}</span></div>
        <div class="pbar"><i style:transform="scaleX({s.t / 30})"></i></div>
        <div class="chips"><span class="chip" class:found={s.A}>Artiste</span><span class="chip" class:found={s.T}>Titre</span></div>
        <div class="phl fixe">
          <div class="lay" class:on={!s.T}>
            <div class="guess">
              <div class="inp">{#if s.txt}{s.txt}{:else}<span class="hold">Artiste, titre, feat…</span>{/if}<i class="caret"></i></div>
              <span class="okb" class:press={s.ok}>OK</span>
            </div>
          </div>
          <div class="lay centre" class:on={s.T}><div class="big">Tout trouvé</div><p class="hint">On attend les autres…</p></div>
        </div>
        <div class="sent">
          <p class="k">Tes réponses</p>
          <div class="sr" class:in={s.A}><span>daft punk</span><b>Artiste ✓</b></div>
          <div class="sr" class:in={s.T}><span>one more time</span><b>Titre ✓</b></div>
        </div>
      </div>
    </div>
  </div>
</Pin>

<style>
  .stg { align-content: center; }
  .mid { display: grid; justify-items: center; gap: 0.3em; }
  .kk .txt { color: var(--text); }
  .ans { margin: 0; color: var(--muted); }
  .ans b { color: var(--text); font-family: var(--mono); }
  .fnd { display: flex; flex-wrap: wrap; gap: 0.3em; justify-content: center; min-height: 1.6em; margin-top: 0.4em; }
  .fnd span { display: none; padding: 0.1em 0.55em; border-radius: 99px; background: rgba(61, 220, 132, 0.15); color: var(--ok); font-family: var(--titre); font-weight: 700; text-transform: uppercase; font-size: 0.85em; }
  .fnd span.in { display: inline-block; animation: pop 0.35s var(--pop); }
  @keyframes pop { from { opacity: 0; transform: scale(0.6); } }
  .tst { position: absolute; left: 50%; bottom: 3%; translate: -50% 0; padding: 0.35em 1em; border-radius: 99px; background: rgba(61, 220, 132, 0.16); border: 1px solid rgba(61, 220, 132, 0.5); color: var(--ok); font-family: var(--titre); font-weight: 800; text-transform: uppercase; white-space: nowrap; opacity: 0; transform: translateY(30%); transition: opacity 0.3s, transform 0.3s; }
  .tst.on { opacity: 1; transform: none; }
  .mk { display: inline-flex; gap: 0.2em; margin-left: 0.35em; vertical-align: middle; }
  .mk i { display: inline-grid; place-items: center; width: 1.25em; height: 1.25em; border-radius: 0.25em; font-style: normal; font-family: var(--mono); font-size: 0.66em; background: rgba(255, 255, 255, 0.08); color: var(--muted); transition: background 0.25s, color 0.25s; }
  .mk i.ok { background: var(--ok); color: #000; }
  .phl.fixe { flex: none; }
  .centre { text-align: center; }
  .sent { display: grid; gap: 0.4em; margin-top: 0.4em; padding-top: 0.6em; border-top: 1px solid var(--line); }
  .sr { display: flex; justify-content: space-between; gap: 0.5em; padding: 0.45em 0.6em; border-radius: 0.45em; background: rgba(61, 220, 132, 0.1); font-size: 0.85em; opacity: 0; transform: translateY(8px); transition: opacity 0.3s, transform 0.3s; }
  .sr.in { opacity: 1; transform: none; }
  .sr b { color: var(--ok); font-family: var(--titre); text-transform: uppercase; white-space: nowrap; }
</style>
