<script module>
  import { ease, seg, stage } from '$lib/components/soiree/soireePins.js';

  // [pseudo, points, a répondu à] (-1 = décroche, 2 = jamais)
  const PL = [['Léa', 22, 0.04], ['Karim', 21, 0.1], ['Zoé', 20, 0.16], ['Hugo', 17, -1], ['Inès', 14, 2], ['Sarah', 10, 2]];
  const MOTS = { ok: 'a répondu', off: 'déconnecté', wait: 'en attente' };

  export function render(p) {
    const vol = Math.round(40 + 35 * ease(seg(p, 0.68, 0.84)));
    return {
      players: PL.map(([n, s, at], i) => {
        const st = at < 0 ? (p >= 0.18 ? 'off' : 'wait') : p >= at ? 'ok' : 'wait';
        return { n, st, mot: MOTS[st], s: i === 4 && p >= 0.9 ? s + 1 : s, plus: i === 4 && p > 0.88 && p < 0.92 };
      }),
      paused: p >= 0.26 && p < 0.44,
      press: (p > 0.24 && p < 0.27) || (p > 0.42 && p < 0.45),
      t: 18 - Math.floor(seg(p, 0, 0.26) * 3) - Math.floor(seg(p, 0.44, 1) * 9),
      shown: p >= 0.52,
      vol,
      chip: p >= 0.66 && p < 0.9,
      beat: stage(p, [0.22, 0.47, 0.66]),
    };
  }
</script>

<script>
  import Pin from '$lib/components/soiree/Pin.svelte';
  import { PINS } from '$lib/components/soiree/soireeBeats.js';

  let p = $state(0.6);
  const s = $derived(render(p));
</script>

<Pin id="regie" len={1.7} {...PINS.regie} beat={s.beat} onprogress={(v) => (p = v)}>
  <div class="dev rgd" aria-hidden="true">
    <div class="tv2">
      <div class="scr one">
        <div class="stg">
          <div class="mid"><p class="kk">Manche <b>4</b> / 10</p><div class="tmr">{s.t}</div></div>
          <div class="pz" class:on={s.paused}><div class="pz-i"><i></i><i></i></div><b>Pause</b></div>
          <div class="vchip" class:on={s.chip}>Volume {s.vol} %</div>
        </div>
      </div>
    </div>
    <div class="tab">
      <div class="tab-s">
        <div class="tab-h"><span>Régie · <b>KZ4P2M</b></span><span>Manche <b>4</b> / 10 · <b>{s.t}</b> s</span></div>
        <div class="col">
          <div class="rp2">
            <div class="ra2">
              <div class="mcv"><i class:cache={s.shown}></i></div>
              <div class="raz">
                <b class="mask" class:cache={s.shown}>▒▒▒▒ ▒▒▒▒ · ▒▒▒ ▒▒▒▒</b><b class="real" class:cache={!s.shown}>Daft Punk · One More Time</b>
                <div class="ra-sub"><span class="vb" class:cache={s.shown}>Afficher la réponse</span><span class:cache={!s.shown}>Visible sur cet écran uniquement</span></div>
              </div>
            </div>
            <div class="sig2">Signaler<span>Mauvaise version</span><span>Pas de son</span></div>
          </div>
          <div class="rbs">
            <div class="rb m" class:press={s.press}><span class:cache={s.paused}>Pause</span><span class:cache={!s.paused}>Reprendre</span></div>
            <div class="rb">Manche suivante</div>
            <div class="rb">⋯</div>
          </div>
          <div class="vol2">
            <span>Volume TV</span>
            <div class="trk2"><i style:transform="scaleX({s.vol / 100})"></i><span class="kn" style:transform="translateX({s.vol}%)"><b></b></span></div>
            <span>{s.vol} %</span>
          </div>
        </div>
        <div class="col">
          <div class="rp2">
            <span class="kk">Joueurs · 6</span>
            <div class="pls">
              {#each s.players as x (x.n)}
                <div class="pl">
                  <b>{x.n}</b><em class={x.st}>{x.mot}</em>
                  <span class="sc"><i>−</i><span>{x.s}</span><i class:press={x.plus}>+</i></span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</Pin>

<style>
  .mid { display: grid; justify-items: center; }
  .mid b { color: var(--text); }
  .mid .tmr { font-size: 7em; }
  .rgd { width: min(100%, 470px); justify-self: center; align-self: center; justify-items: stretch; }
  .rgd > .tv2 { width: 58%; justify-self: end; margin-bottom: -5%; }
  .rgd .scr { font-size: 4.4cqw; }
  .cache { opacity: 0; }
  .pz { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 0.3em; background: rgba(5, 5, 7, 0.78); opacity: 0; transition: opacity 0.3s; }
  .pz.on, .vchip.on { opacity: 1; }
  .pz b { font-family: var(--titre); font-weight: 900; font-size: 3.4em; text-transform: uppercase; line-height: 0.9; }
  .pz-i { display: flex; gap: 0.35em; }
  .pz-i i { width: 0.55em; height: 1.8em; border-radius: 0.15em; background: var(--text); }
  .vchip { position: absolute; top: 4%; right: 4%; padding: 0.2em 0.6em; border-radius: 99px; background: rgba(255, 255, 255, 0.12); font-family: var(--mono); font-size: 0.8em; opacity: 0; transition: opacity 0.3s; }
  .tab { position: relative; z-index: 2; width: 100%; border-radius: 18px; padding: 9px; background: #17171f; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 40px 80px -30px #000; container-type: inline-size; }
  .tab-s { border-radius: 11px; background: linear-gradient(180deg, #0e0e16, #07070b); padding: 3.6cqw; display: grid; gap: 2.4cqw; font-size: 3.6cqw; line-height: 1.3; }
  .tab-h { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--mono); font-size: 0.8em; color: var(--muted); }
  .tab-h b { color: var(--text); }
  .col { display: grid; gap: 2.4cqw; align-content: start; min-width: 0; }
  .rp2 { min-width: 0; display: grid; gap: 0.5em; align-content: start; padding: 0.7em; border-radius: 0.55em; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--line); }
  .ra2 { display: grid; grid-template-columns: 3.4em minmax(0, 1fr); gap: 0.7em; align-items: center; }
  .mcv { position: relative; aspect-ratio: 1; border-radius: 0.25em; overflow: hidden; background: conic-gradient(from 30deg, #ff00ff, #7b5cff, #2fb8ff, #3ddc84, #f4e04d, #ff4f9a, #ff00ff); }
  .mcv i { position: absolute; inset: 0; background: repeating-linear-gradient(45deg, #2a2a35 0 4px, #1a1a22 4px 8px); transition: opacity 0.5s; }
  .raz { display: grid; min-width: 0; }
  .raz > b, .ra-sub > span { grid-area: 1 / 1; transition: opacity 0.35s; }
  .mask { font-family: var(--mono); color: #6e7086; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; }
  .real { font-weight: 600; }
  .ra-sub { font-size: 0.76em; color: var(--muted); display: grid; }
  .vb { color: var(--accent-tint); }
  .sig2 { display: flex; flex-wrap: wrap; gap: 0.3em; align-items: center; font-size: 0.78em; color: var(--muted); }
  .sig2 span { padding: 0.15em 0.55em; border-radius: 99px; border: 1px solid var(--line-2); color: var(--soft); }
  .rbs { display: grid; grid-template-columns: 1.4fr 1.4fr 0.5fr; gap: 0.4em; }
  .rb { position: relative; display: grid; place-items: center; padding: 0.55em 0.3em; border-radius: 0.45em; border: 1px solid var(--line-2); text-align: center; font-family: var(--titre); font-weight: 700; text-transform: uppercase; transition: transform 0.12s, background 0.3s; }
  .rb.m { background: var(--accent); color: #000; border-color: transparent; }
  .rb > span { grid-area: 1 / 1; transition: opacity 0.2s; }
  .pls { display: grid; gap: 0.3em; }
  .pl { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 0.5em; align-items: center; padding: 0.28em 0.5em; border-radius: 0.35em; background: rgba(255, 255, 255, 0.03); font-size: 0.9em; }
  .pl > b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pl em { font-style: normal; font-size: 0.78em; color: var(--muted); }
  .pl em.ok { color: var(--ok); }
  .pl em.off { color: var(--warn); }
  .sc { display: inline-flex; gap: 0.35em; align-items: center; font-family: var(--mono); font-size: 0.85em; }
  .sc i { display: grid; place-items: center; width: 1.4em; height: 1.4em; border-radius: 0.3em; border: 1px solid var(--line-2); font-style: normal; color: var(--muted); transition: background 0.2s, transform 0.12s; }
  .sc i.press { background: var(--accent); color: #000; }
  .vol2 { display: grid; grid-template-columns: auto minmax(0, 1fr) 2.8em; gap: 0.6em; align-items: center; font-family: var(--mono); font-size: 0.8em; color: var(--muted); }
  .trk2 { position: relative; height: 4px; border-radius: 4px; background: rgba(255, 255, 255, 0.1); }
  .trk2 i { position: absolute; inset: 0; border-radius: 4px; background: linear-gradient(90deg, var(--violet), var(--accent)); transform-origin: left; }
  .kn { position: absolute; inset: 0; }
  .kn b { position: absolute; top: 50%; left: 0; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff; }
  @container (min-width: 520px) {
    .tab-s { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); font-size: 2.15cqw; gap: 1.6cqw; padding: 2.4cqw; }
    .tab-h { grid-column: 1 / -1; }
    .col { gap: 1.6cqw; }
  }
  @media (min-width: 900px) {
    .rgd { width: min(100%, calc((100svh - 150px) * 1.35)); grid-template-columns: minmax(0, 1fr) 36%; }
    .rgd > .tv2 { grid-column: 2; width: 100%; margin-bottom: -7%; }
    .rgd > .tab { grid-column: 1 / -1; }
  }
</style>
