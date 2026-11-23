<script>
  import { untrack } from 'svelte';

  /** sec : chiffre sur l'étiquette (null en pause) ; d, g : diamètre et pas des sillons. */
  let { sec = null, pause = false, d, g } = $props();

  let disc = $state();
  let affiche = $state(untrack(() => sec));
  let vu = untrack(() => sec);

  const calme = () => {
    try {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== false;
    } catch {
      return true;
    }
  };

  // Le geste est le décompte : le chiffre suivant est sur l'autre face
  $effect(() => {
    const n = sec;
    if (n === vu) return;
    const retourne = vu != null && n != null && n <= 3 && !pause && disc?.animate && !calme();
    vu = n;
    if (!retourne) {
      affiche = n;
      return;
    }
    try {
      disc
        .animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], {
          duration: 210,
          easing: 'cubic-bezier(.55,0,.9,.45)'
        })
        .finished.then(() => {
          affiche = vu;
          disc?.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], {
            duration: 420,
            easing: 'cubic-bezier(.2,.8,.2,1)'
          });
        })
        .catch(() => (affiche = vu));
    } catch {
      affiche = n;
    }
  });
</script>

<div class="flip" style:--d={d} style:--g={g} aria-hidden="true">
  <div class="disc" class:pause bind:this={disc}>
    <div class="lab">
      {#if pause || affiche == null}
        <span class="bars"><i></i><i></i></span>
      {:else}
        <span class="num" class:two={affiche > 9}>{affiche}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .flip {
    width: var(--d);
    aspect-ratio: 1;
    perspective: calc(var(--d) * 2.6);
    flex: none;
  }
  .disc {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background:
      radial-gradient(
        closest-side,
        transparent 97.4%,
        rgb(255 255 255 / 0.16) 98%,
        rgb(255 255 255 / 0.16) 99.2%,
        transparent 99.8%
      ),
      radial-gradient(
        closest-side,
        transparent 60.4%,
        rgb(0 0 0 / 0.75) 61%,
        transparent 61.8%,
        transparent 77.4%,
        rgb(0 0 0 / 0.75) 78%,
        transparent 78.8%,
        transparent 89.4%,
        rgb(0 0 0 / 0.75) 90%,
        transparent 90.8%
      ),
      repeating-radial-gradient(
        closest-side,
        rgb(255 255 255 / 0.075) 0 calc(var(--g) * 0.3),
        transparent calc(var(--g) * 0.3) var(--g)
      ),
      radial-gradient(closest-side, #14141c 0 43%, #08080c 43.6% 100%);
    box-shadow: 0 calc(var(--d) * 0.05) calc(var(--d) * 0.12) calc(var(--d) * -0.04) #000;
  }
  .disc::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 25deg,
      transparent 0 5%,
      rgb(255 255 255 / 0.15) 11%,
      transparent 18% 54%,
      rgb(255 255 255 / 0.1) 60%,
      transparent 67%
    );
    -webkit-mask: radial-gradient(closest-side, transparent 43%, #000 44% 97%, transparent 98%);
    mask: radial-gradient(closest-side, transparent 43%, #000 44% 97%, transparent 98%);
    animation: tourne 5.4s linear infinite;
  }
  .pause::before {
    animation-play-state: paused;
  }
  @keyframes tourne {
    to {
      rotate: 1turn;
    }
  }
  .lab {
    position: absolute;
    inset: 30.5%;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent);
    color: var(--bg);
    box-shadow: inset 0 0 0 calc(var(--d) * 0.007) rgb(0 0 0 / 0.28);
    transition: background 0.35s var(--out);
  }
  .pause .lab {
    background: var(--soft);
  }
  .num {
    font-family: var(--titre);
    font-weight: 900;
    font-size: calc(var(--d) * 0.36);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    translate: 0 -3%;
  }
  .num.two {
    font-size: calc(var(--d) * 0.3);
  }
  .bars {
    display: flex;
    gap: calc(var(--d) * 0.05);
  }
  .bars i {
    width: calc(var(--d) * 0.055);
    height: calc(var(--d) * 0.19);
    border-radius: calc(var(--d) * 0.008);
    background: var(--bg);
  }
  @media (prefers-reduced-motion: reduce) {
    .disc::before {
      animation: none;
    }
    .lab {
      transition: none;
    }
  }
</style>
