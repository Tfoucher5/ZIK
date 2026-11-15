<!-- Le déroulé : la ligne se remplit, les étapes s'allument (épinglé dès 900px) -->
<script module>
  /** `stops` : position de chaque étape sur la ligne, de 0 à 1. */
  export function render(p, stops) {
    return { on: stops.map((x) => p >= x - 0.002), fill: p };
  }
</script>

<script>
  import { getContext } from 'svelte';
  import { FRISE } from '$lib/components/soiree/soireeContent.js';

  const pins = getContext('soiree-pins');
  let p = $state(1);
  let el, ol;
  let stops = $state(FRISE.map((_, i) => i / (FRISE.length - 1)));
  let rail = $state({ w: '', h: '' });
  let desk = $state(false);
  const s = $derived(render(p, stops));

  $effect(() => pins?.add({ el, len: 0.85, loose: ol, set: (v) => (p = v) }));

  // La ligne s'arrête sur la dernière pastille, quelle que soit la hauteur des textes
  $effect(() => {
    const mq = matchMedia('(min-width: 900px)');
    const measure = () => {
      desk = mq.matches;
      const li = [...ol.children];
      const pos = (l) => (desk ? l.offsetLeft : l.offsetTop);
      const end = pos(li[li.length - 1]) || 1;
      stops = li.map((l) => pos(l) / end);
      rail = desk ? { w: end + 'px', h: '' } : { w: '', h: end + 'px' };
    };
    const ro = new ResizeObserver(measure);
    ro.observe(ol);
    return () => ro.disconnect();
  });
</script>

<section id="deroule" data-bg="deroule" aria-labelledby="deroule-t" bind:this={el}>
  <div class="wrap fz-in">
    <div class="head rv">
      <span class="label"><i></i>Le déroulé</span>
      <h2 class="grad" id="deroule-t">Une soirée ZIK</h2>
      <p>Deux minutes pour lancer, environ six minutes par partie, et on rejoue autant qu'on veut avec les mêmes joueurs.</p>
    </div>
    <div class="fz-box">
      <div class="fz-rail" aria-hidden="true" style:width={rail.w} style:height={rail.h}>
        <i style:transform={desk ? `scaleX(${s.fill})` : `scaleY(${s.fill})`}></i>
      </div>
      <ol class="fz" bind:this={ol}>
        {#each FRISE as f, i (f.t)}
          <li class:on={s.on[i]}>
            <b>{f.b}</b>
            <h3>{f.t}{#if f.pro}<span class="pro-tag">ZIK Pro</span>{/if}</h3>
            <p>{f.p}</p>
          </li>
        {/each}
      </ol>
    </div>
  </div>
</section>

<style>
  section { overflow-x: clip; }
  .fz-box { position: relative; }
  .fz { list-style: none; margin: 0; padding: 0 0 0 34px; display: grid; gap: 26px; }
  .fz li { position: relative; opacity: 0.4; transition: opacity 0.4s; }
  .fz li.on { opacity: 1; }
  .fz li::before { content: ''; position: absolute; left: -34px; top: 4px; width: 16px; height: 16px; border-radius: 50%; background: var(--bg); border: 2px solid var(--line-2); transition: background 0.3s, border-color 0.3s, transform 0.3s; }
  .fz li.on::before { background: var(--accent); border-color: var(--accent); transform: scale(1.15); }
  .fz b { font-family: var(--mono); font-size: 13px; color: var(--accent-tint); letter-spacing: 0.04em; }
  .fz h3 { font-weight: 800; font-size: 1.6rem; margin-top: 4px; }
  .fz p { color: var(--muted); font-size: 15px; margin-top: 4px; }
  .fz-rail { position: absolute; left: 7px; top: 8px; width: 2px; height: calc(100% - 16px); background: var(--line-2); }
  .fz-rail i { position: absolute; inset: 0; background: linear-gradient(var(--violet), var(--accent)); transform-origin: top; }
  :global(html.rm) .fz li { opacity: 1; }
  :global(html.rm) .fz-rail i { transform: none !important; }
  @media (min-width: 900px) {
    .fz-in { min-height: 100svh; display: grid; align-content: center; padding-block: 110px 60px; }
    .fz { padding: 34px 0 0; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 18px; }
    .fz li::before { left: 0; top: -34px; }
    .fz h3 { font-size: 1.4rem; }
    .fz p { font-size: 14px; }
    .fz-rail { left: 8px; top: 7px; height: 2px; width: calc(100% - 16px); }
    .fz-rail i { transform-origin: left; background: linear-gradient(90deg, var(--violet), var(--accent)); }
  }
</style>
