<script module>
  import { ease, seg, stage } from '$lib/components/soiree/soireePins.js';

  // [classe, pseudo, apparition, fin du compteur, points, départ du compteur, hauteur]
  const PLACES = [['p2', 'Karim', 0.34, 0.46, 88, 0, 62], ['p1', 'Léa', 0.78, 0.9, 93, 89, 80], ['p3', 'Zoé', 0.14, 0.26, 79, 0, 46]];
  const TITRES = ['Le podium de la soirée', 'Et la victoire revient à…', 'Léa'];

  export function render(p) {
    const t = stage(p, [0.56, 0.78]);
    return {
      places: PLACES.map(([c, n, a, b, s, f, h]) => ({ c, n, h, on: p >= a, s: Math.round(f + (s - f) * ease(seg(p, a, b))) })),
      titre: TITRES[t],
      gagnant: t === 2,
      tambour: t === 1,
      reste: p >= 0.9,
      beat: t,
    };
  }
</script>

<script>
  import { getContext } from 'svelte';
  import Pin from '$lib/components/soiree/Pin.svelte';
  import { PINS } from '$lib/components/soiree/soireeBeats.js';
  import { launchConfetti } from '$lib/components/game/confetti.js';

  const RESTE = [['Hugo', 66], ['Inès', 58], ['Sarah', 51], ['Malik', 47], ['Tom', 40], ['Nina', 33], ['Yanis', 29]];
  const pins = getContext('soiree-pins');

  let p = $state(1);
  let box;
  const s = $derived(render(p));

  const gagnant = $derived(s.gagnant);
  let avant = true;
  $effect(() => {
    const boom = gagnant && !avant && pins?.live;
    avant = gagnant;
    if (boom) launchConfetti(110, box);
  });
</script>

<Pin id="podium" len={1.7} {...PINS.podium} beat={s.beat} onprogress={(v) => (p = v)}>
  <div class="dev duo" aria-hidden="true" bind:this={box}>
    <div class="tv2">
      <div class="scr one fin">
        <div>
          <p class="kk">Fin de la soirée · 3 parties</p>
          <div class="fin-t" class:nm2={s.gagnant}>{s.titre}</div>
          <div class="drum" class:on={s.tambour}><i></i><i></i><i></i><i></i><span>Roulement de tambour</span></div>
        </div>
        <div class="fin-p">
          {#each s.places as x (x.c)}
            <div class="plc {x.c}" class:on={x.on}>
              {#if x.c === 'p1'}<svg class="crown" viewBox="0 0 64 40"><path d="M4 36 L8 8 L22 22 L32 4 L42 22 L56 8 L60 36 Z" /></svg>{/if}
              <span class="n">{x.n}</span><span class="s">{x.s} pts</span>
              <div class="blk" style:--h="{x.h}%">{x.c.slice(1)}</div>
            </div>
          {/each}
        </div>
        <ol class="fin-r" class:on={s.reste}>
          {#each RESTE as [n, pts], i (n)}<li>{i + 4} <b>{n}</b> {pts}</li>{/each}
        </ol>
      </div>
    </div>
    <!-- Téléphone au podium de soirée (PlayEvening) : regarder la TV, et sa place -->
    <div class="ph">
      <div class="phs fin-ph">
        <p class="k">Fin de la soirée · 3 parties</p>
        <div class="big">Regarde la TV&nbsp;!</div>
        <div class="place">1<sup>re</sup></div>
        <p class="hint">Tu termines à la 1re place de la soirée.</p>
      </div>
    </div>
  </div>
</Pin>

<style>
  .fin { grid-template-rows: auto minmax(0, 1fr) auto; text-align: center; gap: 1.6cqw; }
  .fin-t { font-family: var(--titre); font-weight: 900; text-transform: uppercase; font-size: 2.8em; line-height: 0.95; margin-top: 0.15em; }
  .fin-t.nm2 { color: var(--gold); font-size: 3.6em; }
  .drum { display: inline-flex; gap: 0.25em; align-items: end; height: 1.2em; margin-top: 0.3em; opacity: 0; transition: opacity 0.3s; }
  .drum.on { opacity: 1; }
  .drum i { width: 0.3em; height: 100%; border-radius: 0.1em; background: var(--gold); transform-origin: bottom; animation: eq 0.45s ease-in-out infinite alternate; animation-play-state: paused; }
  .drum.on i { animation-play-state: running; }
  .drum i:nth-child(2) { animation-delay: -0.15s; }
  .drum i:nth-child(3) { animation-delay: -0.3s; }
  .drum i:nth-child(4) { animation-delay: -0.1s; }
  .drum span { font-family: var(--mono); font-size: 0.62em; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); margin-left: 0.5em; align-self: center; }
  @keyframes eq { from { transform: scaleY(0.25); } to { transform: scaleY(1); } }
  .fin-p { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.6cqw; align-items: end; width: 70%; margin: 0 auto; height: 100%; min-height: 0; }
  .plc { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: stretch; gap: 0.2em; opacity: 0; transform: translateY(18%); transition: opacity 0.4s, transform 0.6s cubic-bezier(0.2, 1.3, 0.4, 1); }
  .plc.on { opacity: 1; transform: none; }
  .n { font-family: var(--titre); font-weight: 800; text-transform: uppercase; font-size: 1.3em; line-height: 1; }
  .s { font-family: var(--mono); font-size: 0.8em; color: var(--muted); }
  .blk { height: var(--h); display: grid; place-items: start center; padding-top: 0.3em; border-radius: 0.3em 0.3em 0 0; font-family: var(--titre); font-weight: 900; font-size: 1.6em; color: #111; }
  .p1 .blk { background: linear-gradient(#ffe08a, var(--gold)); }
  .p2 .blk { background: linear-gradient(#f0f0f6, var(--silver)); }
  .p3 .blk { background: linear-gradient(#f0b07a, var(--bronze)); }
  .p1 .n { color: var(--gold); font-size: 1.6em; }
  .crown { width: 2.2em; margin: 0 auto 0.1em; fill: var(--gold); }
  .fin-r { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.3em 0.6em; font-size: 0.78em; color: var(--muted); opacity: 0; transition: opacity 0.4s; }
  .fin-r.on { opacity: 1; }
  .fin-r b { color: var(--text); font-weight: 600; }
  .phs.fin-ph { justify-content: center; text-align: center; background: radial-gradient(ellipse 90% 50% at 50% 100%, rgb(var(--accent-rgb) / 0.2), transparent 70%), #050506; }
  .place { font-family: var(--titre); font-weight: 900; font-size: 4.4em; line-height: 1; color: var(--gold); text-shadow: 0 0 0.4em color-mix(in srgb, var(--gold) 50%, transparent); }
  .place sup { font-size: 0.35em; }
  .fin-ph .big { font-size: 1.6em; }
</style>
