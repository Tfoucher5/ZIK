<script module>
  import { seg, stage } from '$lib/components/soiree/soireePins.js';

  const B = [['Léa', 22], ['Karim', 21], ['Zoé', 20], ['Hugo', 17], ['Inès', 14], ['Sarah', 10], ['Malik', 9], ['Tom', 5]];

  export function render(p) {
    const coupe = (p >= 0.06 && p < 0.22) || (p >= 0.34 && p < 0.58);
    const wifi = coupe && p < 0.22;
    return {
      wifi,
      rows: B.map(([n, s], i) => ({ n, s, off: i === 2 && coupe })),
      lay: stage(p, [0.34, 0.44, 0.58, 0.68]),
      ask: p > 0.4 && p < 0.44,
      regie: p >= 0.46 && p < 0.6,
      rendre: p > 0.54 && p < 0.58,
      panne: p >= 0.72 && p < 0.92,
      t: 22 - Math.floor(seg(p, 0, 0.72) * 6) - Math.floor(seg(p, 0.92, 1) * 2),
      beat: stage(p, [0.34, 0.68]),
    };
  }
</script>

<script>
  import Pin from '$lib/components/soiree/Pin.svelte';
  import { PINS } from '$lib/components/soiree/soireeBeats.js';
  import { pad } from '$lib/components/soiree/soireePins.js';

  let p = $state(0.5);
  const s = $derived(render(p));
</script>

<Pin id="tient" len={1.5} {...PINS.tient} beat={s.beat} onprogress={(v) => (p = v)}>
  <div class="dev duo" aria-hidden="true">
    <div class="tv2">
      <div class="scr">
        <div class="stg">
          <div class="lay" class:on={!s.panne}>
            <div class="mid"><p class="kk">Manche <b>5</b> / 10</p><div class="tmr">{s.t}</div><p class="ans"><b>5</b> / 8 ont répondu</p></div>
          </div>
          <div class="lay outg" class:on={s.panne}>
            <p class="kk">Petite pause technique</p>
            <h4>La musique ne répond pas</h4>
            <p>On réessaie tout seul, la partie reprend dès que ça revient. Personne ne perd ses points.</p>
          </div>
        </div>
        <aside class="brd">
          <div class="brd-h"><span>Classement</span><span>8</span></div>
          <ol class="rows">
            {#each s.rows as r, i (r.n)}
              <li class="row" class:off={r.off} style:--y={i}>
                <span class="rk">{pad(i + 1)}</span><span class="nm">{r.n}</span><span class="pt"><span>{r.s}</span></span>
              </li>
            {/each}
          </ol>
        </aside>
      </div>
    </div>
    <div class="ph">
      <div class="phs">
        <div class="phl">
          <div class="lay" class:on={s.lay === 0}>
            <div class="net2" class:lost={s.wifi}>
              <svg class="wifi" viewBox="0 0 24 24"><path class="w3" d="M2 9a15 15 0 0 1 20 0" /><path class="w2" d="M5.5 12.5a10 10 0 0 1 13 0" /><path d="M9 16a5 5 0 0 1 6 0" /><circle cx="12" cy="19.5" r="1" /></svg>
              <span class="k">{s.wifi ? 'Reconnexion…' : 'Connecté'}</span>
            </div>
            <div class="big">C'est bon,<br />tu es dedans.</div>
            <div class="chips"><span class="chip found">Zoé · 20 pts</span></div>
          </div>
          <div class="lay" class:on={s.lay === 1}>
            <p class="k">ZIK Soirée</p>
            <div class="big moyen">Ce pseudo joue déjà</div>
            <p class="hint">Si c'est toi sur un autre téléphone, demande à l'hôte de te rendre ta place.</p>
            <div class="pbtn" class:press={s.ask}>Demander ma place à l'hôte</div>
          </div>
          <div class="lay" class:on={s.lay === 2}>
            <p class="k">ZIK Soirée</p>
            <div class="big">Zoé,<br />c'est toi ?</div>
            <p class="hint">L'hôte doit confirmer sur la régie. Ta place et tes points t'attendent.</p>
            <span class="dots3"><i></i><i></i><i></i></span>
          </div>
          <div class="lay" class:on={s.lay === 3}>
            <p class="k"><b>●</b> Connecté</p>
            <div class="big">Re-bonjour</div>
            <p class="hint">Reprends ta place dans la partie.</p>
            <div class="chips"><span class="chip found">Zoé · 20 pts</span></div>
          </div>
          <div class="lay attente" class:on={s.lay === 4}>
            <span class="dots3"><i></i><i></i><i></i></span>
            <p class="hint">La musique arrive sur la TV…</p>
          </div>
        </div>
      </div>
    </div>
    <div class="rgc" class:on={s.regie}>
      <span class="kk">Régie</span>
      <p><b>Zoé</b> veut reprendre sa place depuis un autre téléphone. C'est bien cette personne ?</p>
      <div><span class="m" class:press={s.rendre}>Rendre sa place</span><span>Refuser</span></div>
    </div>
  </div>
</Pin>

<style>
  .mid { display: grid; justify-items: center; }
  .mid b, .ans b { color: var(--text); }
  .ans { margin: 0; color: var(--muted); }
  .ans b { font-family: var(--mono); }
  .lay.outg { gap: 0.5em; padding: 0 6%; }
  .outg h4 { font-size: 2.6em; font-weight: 900; }
  .outg p:not(.kk) { margin: 0; color: var(--soft); font-size: 0.9em; max-width: 30em; }
  .net2 { display: flex; align-items: center; gap: 0.5em; color: var(--ok); transition: color 0.3s; }
  .net2 .k { color: inherit; }
  .net2.lost { color: var(--warn); }
  .net2.lost .w2, .net2.lost .w3 { opacity: 0.2; }
  .wifi { width: 1.4em; height: 1.4em; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; }
  .moyen { font-size: 1.5em; }
  .lay.attente { justify-content: center; text-align: center; align-items: center; }
  .rgc { position: absolute; left: 0; top: 0; z-index: 3; width: min(62%, 300px); padding: 12px; border-radius: 14px; background: #17171f; border: 1px solid var(--line-2); box-shadow: 0 30px 60px -15px #000; display: grid; gap: 10px; font-size: 13px; line-height: 1.35; opacity: 0; transform: translateY(-10px); transition: opacity 0.3s, transform 0.3s; }
  .rgc.on { opacity: 1; transform: none; }
  .rgc .kk { font-size: 10px; text-align: left; }
  .rgc p { margin: 0; }
  .rgc div { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .rgc div span { padding: 7px 4px; border-radius: 8px; border: 1px solid var(--line-2); text-align: center; font-family: var(--titre); font-weight: 700; text-transform: uppercase; font-size: 13px; transition: transform 0.12s, background 0.2s; }
  .rgc div span.m { background: var(--accent); color: #000; border-color: transparent; }
  @media (min-width: 900px) {
    .rgc { left: -4%; top: 6%; }
  }
</style>
