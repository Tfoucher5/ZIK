<!-- Une scène de l'immeuble : film calé sur le scroll, légendes, flash et son -->
<script>
  import ScrubVideo from '$lib/components/ui/ScrubVideo.svelte';
  import { clamp } from '$lib/components/ui/scrub.js';
  import { media, flashAt } from '$lib/components/accueil/scenes.js';

  /**
   * @type {{
   *   cfg: typeof import('./scenes.js').PORTE,
   *   son?: ReturnType<typeof import('./son.js').createSon>,
   *   labelledby: string,
   *   priority?: boolean,
   *   dernier?: boolean,
   *   hero?: import('svelte').Snippet<[number]>,
   *   decor?: import('svelte').Snippet<[number]>,
   * }}
   */
  let { cfg, son, labelledby, priority = false, dernier = false, hero, decor } = $props();

  let el;
  let p = $state(0);
  let dinged = false;

  function frame(sp) {
    p = sp;
    if (sp < cfg.ding - 0.03) dinged = false;
    if (!son?.on) return;
    const r = el.getBoundingClientRect();
    const H = innerHeight;
    const dedans = r.top < H * 0.5 && (dernier || r.bottom > H * 0.5);
    if (!dedans) return;
    son.ouvre(cfg.open(sp), clamp((r.bottom - H * 0.2) / (H * 0.8)));
    if (sp >= cfg.ding && !dinged) {
      dinged = true;
      son.ding();
    }
  }
</script>

<section class="sc" class:cap={!hero || p >= 0.05} aria-labelledby={labelledby} bind:this={el}>
  <ScrubVideo
    sources={{ portrait: media(cfg.film, 'portrait', 'mp4'), paysage: media(cfg.film, 'paysage', 'mp4') }}
    poster={{ portrait: media(cfg.film, 'portrait', 'webp'), paysage: media(cfg.film, 'paysage', 'webp') }}
    alt={cfg.alt}
    len={cfg.len}
    {priority}
    onprogress={frame}
  >
    <p class="sr">{cfg.sr}</p>
    {@render decor?.(p)}
    <div class="flash {cfg.film}" aria-hidden="true" style:opacity={flashAt(p, cfg)}></div>
    <div class="scrim" aria-hidden="true"></div>
    {@render hero?.(p)}
    {#each cfg.caps as c (c.from)}
      <div class="ov cap-ov" class:big={c.big} class:on={p >= c.from && p < c.to}>
        <h2 id={c.id}>{c.h}</h2>
        <p>{c.p}</p>
        {#if c.cta}<a class="btn-main" href={c.cta[0]}>{c.cta[1]}</a>{/if}
        {#if c.note}<span class="note" class:ok={c.ok}>{c.note}</span>{/if}
      </div>
    {/each}
    <div class="bar" aria-hidden="true"><i style:transform="scaleX({p})"></i></div>
  </ScrubVideo>
</section>

<style>
  .sc {
    position: relative;
    background: #060409;
  }
  .sc :global(.sticky::after) {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0, 0, 0, 0.55));
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .flash,
  .scrim {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }
  .flash {
    opacity: 0;
    background: radial-gradient(90% 70% at 50% 42%, #fff, rgba(255, 150, 255, 0.75) 45%, rgba(255, 0, 255, 0.2) 80%);
    will-change: opacity;
  }
  .flash.etages {
    background: radial-gradient(90% 70% at 50% 45%, rgba(190, 255, 215, 0.9), rgba(61, 220, 132, 0.4) 50%, transparent 80%);
  }
  .scrim {
    background: linear-gradient(
      180deg,
      rgba(6, 4, 9, 0.97) 0%,
      rgba(6, 4, 9, 0.93) 24%,
      transparent 37%,
      transparent 66%,
      rgba(6, 4, 9, 0.9) 80%,
      rgba(6, 4, 9, 0.97) 100%
    );
  }
  .cap .scrim {
    background: linear-gradient(180deg, rgba(6, 4, 9, 0.5) 0%, transparent 14%, transparent 56%, rgba(6, 4, 9, 0.94) 80%);
  }
  :where(.sc) :global(.ov) {
    position: absolute;
    z-index: 2;
    left: 0;
    right: 0;
    padding-inline: var(--gut);
    opacity: 0;
    pointer-events: none;
    transform: translateY(18px);
    transition:
      opacity 0.45s var(--out),
      transform 0.45s var(--out);
  }
  :where(.sc) :global(.ov.on) {
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }
  :where(.sc) :global(.ov:not(.on) :is(a, button)) {
    visibility: hidden;
  }
  .cap-ov {
    bottom: calc(30px + env(safe-area-inset-bottom, 0px));
    display: grid;
    gap: 10px;
    justify-items: start;
  }
  .cap-ov > * {
    max-width: 520px;
  }
  .cap-ov h2 {
    font-weight: 900;
    font-size: clamp(2.6rem, 11vw, 4.6rem);
  }
  .cap-ov p {
    color: #dfe0ea;
    font-size: 1.02rem;
  }
  .cap-ov .btn-main {
    margin-top: 6px;
  }
  .big h2 {
    font-size: clamp(4.6rem, 25vw, 9.5rem);
    line-height: 0.8;
    transform-origin: 0 100%;
  }
  .big.on h2 {
    animation: trouve 0.55s var(--pop) both;
  }
  @keyframes trouve {
    from {
      transform: scale(0.7) rotate(-3deg);
      opacity: 0;
    }
  }
  .note {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .note.ok {
    color: var(--ok);
    font-weight: 700;
  }
  .bar {
    position: absolute;
    z-index: 2;
    left: var(--gut);
    right: var(--gut);
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    height: 2px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.14);
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.4s;
  }
  .cap .bar {
    opacity: 1;
  }
  .bar i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--violet), var(--accent));
    transform-origin: 0 50%;
    transform: scaleX(0);
    will-change: transform;
  }

  /* Sans mouvement : l'affiche en image, toutes les étapes lisibles à la suite */
  :global(html.rm) .sc :global(.sticky) {
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: calc(var(--top) + 30px) var(--gut) 40px;
  }
  :global(html.rm) .sc :global(.sticky::after),
  :global(html.rm) .scrim,
  :global(html.rm) .flash,
  :global(html.rm) .bar {
    display: none;
  }
  :global(html.rm) .sc :global(picture) {
    order: 1;
  }
  :global(html.rm) .sc :global(picture img) {
    max-height: 78svh;
    object-fit: cover;
    border-radius: 18px;
  }
  :global(html.rm) :where(.sc) :global(.ov) {
    position: relative;
    inset: auto;
    opacity: 1;
    pointer-events: auto;
    transform: none;
    translate: none;
    width: auto;
    padding: 0;
    order: 2;
  }
  :global(html.rm) :where(.sc) :global(.ov :is(a, button)) {
    visibility: visible;
  }

  @media (min-width: 900px) {
    .scrim,
    .cap .scrim {
      background:
        linear-gradient(90deg, rgba(6, 4, 9, 0.95) 0%, rgba(6, 4, 9, 0.82) 30%, rgba(6, 4, 9, 0.4) 46%, transparent 60%),
        linear-gradient(180deg, transparent 75%, rgba(6, 4, 9, 0.7));
    }
    .cap-ov {
      top: 50%;
      bottom: auto;
      translate: 0 -50%;
      right: auto;
      width: min(480px, 40vw);
      padding-right: 0;
    }
    .cap-ov h2 {
      font-size: clamp(3rem, 5vw, 4.8rem);
    }
    .big h2 {
      font-size: clamp(6rem, 11vw, 10rem);
    }
    .cap-ov p {
      font-size: 1.15rem;
    }
  }
</style>
