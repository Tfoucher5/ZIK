<script>
  import { waveformForDate } from "$lib/zikle/shared.js";
  import { TOTAL } from "./session.svelte.js";

  let { date, unlocked, playing, progress, justUnlocked } = $props();

  const BARS = 72;
  const bars = $derived(waveformForDate(date, BARS));
  const unlockedRatio = $derived(unlocked / TOTAL);

  function fmtTime(s) {
    return `0:${String(Math.round(s)).padStart(2, "0")}`;
  }
</script>

<!-- Signature : la forme d'onde qui se déverrouille -->
<div class="zk-wave-block">
  <div class="zk-wave" class:zk-wave-unlocking={justUnlocked} class:zk-wave-live={playing}>
    {#each bars as h, i (i)}
      {@const pos = i / BARS}
      <span
        class="zk-bar"
        class:zk-bar-on={pos < unlockedRatio}
        class:zk-bar-played={playing && pos < unlockedRatio * progress}
        style="--h: {h}; --i: {i}"
      ></span>
    {/each}
    {#if playing}
      <span class="zk-playhead" style="left: {unlockedRatio * progress * 100}%"></span>
    {/if}
    <span class="zk-wave-edge" style="left: {unlockedRatio * 100}%" aria-hidden="true"></span>
  </div>
  <div class="zk-wave-scale">
    <span>{fmtTime(0)}</span>
    <span class="zk-wave-now">{fmtTime(unlocked)} débloqué</span>
    <span>{fmtTime(TOTAL)}</span>
  </div>
</div>

<style>
  .zk-wave-block {
    display: flex;
    flex-direction: column;
    gap: 7px;
    animation: zk-in 0.5s 0.35s ease both;
  }
  .zk-wave {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
    height: clamp(66px, 12vh, 118px);
    padding: 0 3px;
    background: rgb(var(--c-glass) / 0.02);
    border: 1px solid var(--border);
    border-radius: 2px;
    overflow: hidden;
  }
  .zk-bar {
    flex: 1;
    min-width: 0;
    height: calc(var(--h) * 100%);
    background: rgb(var(--c-glass) / 0.11);
    border-radius: 1px;
    transform-origin: center;
    animation: zk-grow 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.4s + var(--i) * 0.006s);
    transition:
      background 0.35s,
      box-shadow 0.35s;
  }
  .zk-bar-on {
    background: rgb(var(--accent-rgb) / 0.55);
  }
  .zk-bar-played {
    background: var(--accent);
    box-shadow: 0 0 10px rgb(var(--accent-rgb) / 0.7);
  }
  /* Danse des barres pendant la lecture : uniquement la zone débloquée. */
  .zk-wave-live .zk-bar-on {
    animation: zk-dance 0.62s ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * -0.045s);
  }
  .zk-wave-unlocking .zk-bar-on {
    animation: zk-unlock 0.9s ease both;
    animation-delay: calc(var(--i) * 0.008s);
  }

  .zk-playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--text);
    box-shadow: 0 0 12px rgb(var(--c-glass) / 0.8);
    pointer-events: none;
  }
  .zk-wave-edge {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: repeating-linear-gradient(
      to bottom,
      rgb(var(--accent-rgb) / 0.7) 0 4px,
      transparent 4px 8px
    );
    pointer-events: none;
    transition: left 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .zk-wave-scale {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--zk-mono);
    font-size: 0.62rem;
    color: var(--dim);
  }
  .zk-wave-now {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }

  @keyframes zk-grow {
    from {
      transform: scaleY(0.04);
      opacity: 0;
    }
    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }
  @keyframes zk-dance {
    from {
      transform: scaleY(0.72);
    }
    to {
      transform: scaleY(1.18);
    }
  }
  @keyframes zk-unlock {
    0% {
      background: var(--text);
      box-shadow: 0 0 18px rgb(var(--c-glass) / 0.9);
    }
    100% {
      background: rgb(var(--accent-rgb) / 0.55);
      box-shadow: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-bar,
    .zk-wave-block,
    .zk-wave-live .zk-bar-on,
    .zk-wave-unlocking .zk-bar-on {
      animation: none !important;
    }
  }
</style>
