<script module>
  import { seg, stage, typed } from '#lib/components/soiree/soireePins.js';

  export function render(p) {
    const m = stage(p, [0.34, 0.67]);
    const lp = seg(p, m / 3, (m + 1) / 3);
    const t = 30 - Math.floor(lp * 14);
    const free = m === 0;
    const choisi = m > 1 || (m === 1 && lp >= 0.3);
    const revele = m > 1 || (m === 1 && lp >= 0.6);
    const buzz = m === 2 && lp >= 0.3;
    const juste = m === 2 && lp >= 0.66;
    return {
      m,
      t,
      txt: free ? (lp < 0.45 ? typed(lp, 'daft punk', 0.08, 0.38) : typed(lp, 'one more time', 0.5, 0.82)) : '',
      A: !free || lp >= 0.45,
      T: !free || lp >= 0.88,
      choix: [0, 1, 2, 3].map((i) => (revele ? (i ? 'no' : 'good') : choisi && i ? 'dim' : '')),
      lock: choisi && !revele,
      press: m === 2 && lp >= 0.26 && lp < 0.36,
      buzz,
      juste,
      regie: m === 2 && lp >= 0.58,
    };
  }
</script>

<script>
  import Pin from '#lib/components/soiree/Pin.svelte';
  import { PINS } from '#lib/components/soiree/soireeBeats.js';

  const MODES = ['Texte libre', '4 choix', 'Buzzer'];
  const CHOIX = ['Daft Punk · One More Time', 'Justice · D.A.N.C.E.', 'Cassius · 1999', 'Air · Sexy Boy'];

  let p = $state(0.62);
  const s = $derived(render(p));
</script>

<Pin id="reponses" len={1.7} {...PINS.reponses} beat={s.m} onprogress={(v) => (p = v)}>
  <div class="dev mono3" aria-hidden="true">
    <div class="segm">{#each MODES as l, i (l)}<span class:on={i === s.m}>{l}</span>{/each}</div>
    <div class="ph">
      <div class="phs">
        <div class="ptr"><span class="k">Manche <b>2</b> / 10</span><span class="ptm">{s.t}</span></div>
        <div class="pbar"><i style:transform="scaleX({s.t / 30})"></i></div>
        <div class="phl">
          <div class="lay" class:on={s.m === 0}>
            <div class="chips"><span class="chip" class:found={s.A}>Artiste</span><span class="chip" class:found={s.T}>Titre</span></div>
            <div class="guess">
              <div class="inp">{#if s.txt}{s.txt}{:else}<span class="hold">Artiste, titre, feat…</span>{/if}<i class="caret"></i></div>
              <span class="okb">OK</span>
            </div>
          </div>
          <div class="lay" class:on={s.m === 1}>
            <div class="qc">{#each CHOIX as c, i (c)}<span class="c{i} {s.choix[i]}">{c}</span>{/each}</div>
            <p class="hint lock" class:on={s.lock}>Réponse verrouillée</p>
          </div>
          <div class="lay bzl" class:on={s.m === 2}>
            <div class="bz" class:press={s.press} class:pris={s.buzz}>Buzz</div>
            <div class="bzm">
              <div class="big" class:on={s.buzz && !s.juste}>À toi ! Réponds à voix haute</div>
              <div class="big ok" class:on={s.juste}>Bien joué !</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="rgt" class:on={s.regie}><span>Régie</span><b>Bonne réponse · Léa</b></div>
  </div>
</Pin>

<style>
  .segm { display: flex; gap: 3px; padding: 4px; border-radius: 99px; background: rgba(15, 15, 23, 0.8); border: 1px solid var(--line-2); width: max-content; max-width: 100%; }
  .segm span { padding: 6px 11px; border-radius: 99px; font-family: var(--titre); font-weight: 700; font-size: 14px; text-transform: uppercase; color: var(--muted); white-space: nowrap; transition: background 0.3s, color 0.3s; }
  .segm span.on { background: var(--text); color: #000; }
  .dev .ph { aspect-ratio: 9 / 15; }
  .qc { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap: 0.4em; }
  .qc span { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 0.4em; min-height: 4.6em; padding: 0.55em; border-radius: 0.2em; background: var(--c); color: #111; font-weight: 700; font-size: 0.78em; line-height: 1.15; transition: opacity 0.3s, outline-color 0.3s; outline: 3px solid transparent; outline-offset: 2px; }
  .qc span::before { content: ''; width: 1.1em; height: 1.1em; background: #111; }
  .qc .c0 { --c: #ff4f9a; }
  .qc .c0::before { clip-path: polygon(50% 0, 100% 100%, 0 100%); }
  .qc .c1 { --c: #5bc0eb; }
  .qc .c1::before { clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
  .qc .c2 { --c: #f4e04d; }
  .qc .c2::before { border-radius: 50%; }
  .qc .c3 { --c: #3ddc84; }
  .qc span.dim { opacity: 0.3; }
  .qc span.no { opacity: 0.4; text-decoration: line-through; }
  .qc span.good { outline-color: var(--ok); }
  .qc span.good::after { content: '✓'; position: absolute; top: 0.3em; right: 0.45em; width: 1.4em; height: 1.4em; display: grid; place-items: center; border-radius: 50%; background: #0b0b10; color: var(--ok); }
  .lock { opacity: 0; transition: opacity 0.3s; }
  .lock.on { opacity: 1; }
  .bzl { justify-content: center; }
  .bz { width: 82%; aspect-ratio: 1; margin: 0.4em auto 0; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, #ff8af5, #ff00ff 50%, #8a0a8a); box-shadow: inset 0 -0.5em 1.2em rgba(0, 0, 0, 0.35), 0 0.4em 0 #5a055a; font-family: var(--titre); font-weight: 900; font-size: 1.7em; text-transform: uppercase; color: #fff; transition: transform 0.12s, box-shadow 0.12s, opacity 0.3s; }
  .bz.press { transform: translateY(0.3em) scale(0.95); box-shadow: inset 0 -0.3em 0.8em rgba(0, 0, 0, 0.35), 0 0.1em 0 #5a055a; }
  .bz.pris { opacity: 0.35; }
  .bzm { display: grid; text-align: center; }
  .bzm .big { grid-area: 1 / 1; font-size: 1.45em; opacity: 0; transition: opacity 0.3s; }
  .bzm .big.on { opacity: 1; }
  .bzm .ok { color: var(--ok); }
  .rgt { position: absolute; right: -6%; bottom: 4%; padding: 8px 12px; border-radius: 12px; background: #15151c; border: 1px solid var(--line-2); box-shadow: 0 20px 40px -10px #000; font-size: 13px; display: grid; gap: 2px; opacity: 0; transform: translateY(10px); transition: opacity 0.3s, transform 0.3s; z-index: 3; }
  .rgt.on { opacity: 1; transform: none; }
  .rgt span { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  .rgt b { font-family: var(--titre); text-transform: uppercase; color: var(--ok); font-size: 16px; }
  @media (min-width: 900px) {
    .rgt { right: -40%; }
  }
</style>
