<!-- Scène 1 : la porte du bar (ZIK Soirée). La lumière derrière le verre bat au tempo tant qu'on est dehors -->
<script>
  import Film from '$lib/components/accueil/Film.svelte';
  import Hero from '$lib/components/accueil/Hero.svelte';
  import { PORTE, glassSpot } from '$lib/components/accueil/scenes.js';

  let { son } = $props();

  let spot = $state(null);

  $effect(() => {
    const place = () => (spot = glassSpot(innerWidth, innerHeight, matchMedia('(orientation: portrait)').matches));
    place();
    addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  });
</script>

<Film cfg={PORTE} {son} labelledby="h1" priority>
  {#snippet decor(p)}
    {#if spot}
      <div
        class="pouls"
        class:off={p > 0.02}
        aria-hidden="true"
        style:--dx="{spot.x}px"
        style:--dy="{spot.y}px"
        style:--dw="{spot.w}px"
      ></div>
    {/if}
  {/snippet}
  {#snippet hero(p)}<Hero on={p < 0.05} />{/snippet}
</Film>

<style>
  .pouls {
    position: absolute;
    z-index: 1;
    left: var(--dx);
    top: var(--dy);
    width: var(--dw);
    aspect-ratio: 1.15;
    translate: -50% -50%;
    border-radius: 50%;
    pointer-events: none;
    mix-blend-mode: screen;
    background: radial-gradient(closest-side, rgba(255, 190, 110, 0.5), rgba(255, 150, 70, 0.18) 55%, transparent);
    opacity: 0;
    animation: pouls 0.5085s cubic-bezier(0.1, 0.7, 0.3, 1) infinite;
  }
  .pouls.off {
    visibility: hidden;
    animation-play-state: paused;
  }
  @keyframes pouls {
    0% {
      opacity: 0.95;
      transform: scale(1.06);
    }
    100% {
      opacity: 0.1;
      transform: scale(0.96);
    }
  }
</style>
