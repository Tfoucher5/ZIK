<script module>
  import { seg, stage } from '$lib/components/soiree/soireePins.js';

  // Points de chaque partie, cumulés partie après partie (93 = total du vainqueur)
  const G = [['Léa', [34, 28, 31]], ['Karim', [30, 33, 25]], ['Zoé', [27, 22, 30]], ['Hugo', [20, 25, 21]]];
  const MAX = 93;

  export function render(p) {
    const st = stage(p, [0.34, 0.6]);
    const g = st < 2 ? 1 : 1 + seg(p, 0.62, 0.95) * 2;
    const full = Math.floor(g);
    const n = Math.min(3, Math.round(g));
    return {
      st,
      parties: `${n} ${n > 1 ? 'parties' : 'partie'}`,
      cumul: G.map(([nom, s]) => {
        const sum = s.slice(0, full).reduce((a, b) => a + b, 0) + (s[full] || 0) * (g - full);
        return { nom, pts: Math.round(sum), k: sum / MAX };
      }),
      now: st < 2 ? st : g < 2.5 ? 2 : 3,
    };
  }
</script>

<script>
  import Pin from '$lib/components/soiree/Pin.svelte';
  import Qr from '$lib/components/soiree/Qr.svelte';
  import { PINS } from '$lib/components/soiree/soireeBeats.js';

  const ETAPES = ['Partie 1', 'Entracte', 'Partie 2', 'Partie 3'];

  let p = $state(1);
  const s = $derived(render(p));
</script>

<Pin id="enchainer" len={1.4} {...PINS.enchainer} beat={s.st} onprogress={(v) => (p = v)}>
  <div class="dev solo" aria-hidden="true">
    <div class="tv2">
      <div class="scr one">
        <div class="stg">
          <div class="lay go" class:on={s.st === 0}>
            <div>
              <p class="kk">Vainqueur · 10 manches</p>
              <div class="go-n">Léa</div>
              <div class="go-p">34 pts</div>
              <dl class="aw">
                <div><dt>Le plus rapide</dt><dd>Karim<small>4 fois 1re réponse</small></dd></div>
                <div><dt>Le plus régulier</dt><dd>Zoé<small>9 titres trouvés</small></dd></div>
              </dl>
            </div>
            <div class="qrb"><Qr /><p>Rejoindre la prochaine partie</p></div>
          </div>
          <div class="lay go ent" class:on={s.st === 1}>
            <div>
              <p class="kk"><b>●</b> On souffle un peu</p>
              <h3>Entracte</h3>
              <p class="when">Reprise vers 22:15</p>
              <p>Pas encore dans la partie ? <b>zik-music.fr</b> · code <b>KZ4P2M</b></p>
            </div>
            <div class="qrb"><Qr /></div>
          </div>
          <div class="lay cum" class:on={s.st === 2}>
            <p class="kk">Soirée · {s.parties}</p>
            <ol>
              {#each s.cumul as c (c.nom)}
                <li><b>{c.nom}</b><div class="bar3"><i style:transform="scaleX({c.k})"></i></div><span>{c.pts}</span></li>
              {/each}
            </ol>
          </div>
        </div>
      </div>
    </div>
    <ol class="pts3">
      {#each ETAPES as e, i (e)}<li class:on={i <= s.now} class:now={i === s.now}>{e}</li>{/each}
    </ol>
  </div>
</Pin>

<style>
  .go { grid-template-columns: minmax(0, 1fr) 30%; gap: 4cqw; text-align: left; place-items: center start; }
  .go-n { font-family: var(--titre); font-weight: 900; font-size: 4.6em; line-height: 0.85; text-transform: uppercase; margin-top: 0.1em; }
  .go-p { font-family: var(--mono); font-weight: 700; font-size: 1.3em; color: var(--accent); }
  .aw { margin: 0.8em 0 0; display: grid; gap: 0.4em; }
  .aw div { display: grid; grid-template-columns: 8.5em minmax(0, 1fr); gap: 0.5em; align-items: baseline; }
  .aw dt { font-family: var(--mono); font-size: 0.7em; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .aw dd { margin: 0; font-family: var(--titre); font-weight: 700; text-transform: uppercase; font-size: 1.1em; }
  .aw small { font-family: var(--corps); font-weight: 400; text-transform: none; color: var(--muted); font-size: 0.72em; margin-left: 0.3em; }
  .qrb { display: grid; gap: 0.5em; justify-items: center; text-align: center; width: 100%; }
  .qrb :global(.qr) { width: 100%; }
  .qrb p { margin: 0; font-family: var(--titre); font-weight: 700; text-transform: uppercase; font-size: 0.9em; line-height: 1.05; }
  .ent h3 { font-weight: 900; font-size: 4.4em; margin: 0.1em 0; }
  .ent p { margin: 0; color: var(--muted); }
  .ent .when { color: var(--text); font-family: var(--mono); font-size: 1.1em; margin-bottom: 0.6em; }
  .stg > .cum { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 1.6em; text-align: left; place-items: stretch; }
  .cum ol { width: 100%; list-style: none; margin: 0; padding: 0 4%; display: grid; align-content: center; gap: 0.9em; }
  .cum li { display: grid; grid-template-columns: 4.4em minmax(0, 1fr) 2.6em; gap: 0.8em; align-items: center; }
  .cum li b { font-family: var(--titre); text-transform: uppercase; font-size: 1.15em; }
  .cum li span { font-family: var(--mono); font-weight: 700; text-align: right; }
  .bar3 { height: 1.1em; border-radius: 0.3em; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
  .bar3 i { display: block; height: 100%; background: linear-gradient(90deg, var(--violet), var(--accent)); transform-origin: left; }
  .cum li:first-child .bar3 i { background: linear-gradient(90deg, #f0b030, #ffe08a); }
  .pts3 { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .pts3 li { padding: 6px 12px; border-radius: 99px; border: 1px solid var(--line-2); font-family: var(--titre); font-weight: 700; font-size: 14px; text-transform: uppercase; color: var(--muted); transition: background 0.3s, color 0.3s, border-color 0.3s; }
  .pts3 li.on { background: rgba(255, 255, 255, 0.1); color: var(--text); border-color: rgba(255, 255, 255, 0.35); }
  .pts3 li.now { background: var(--text); color: #000; }
</style>
