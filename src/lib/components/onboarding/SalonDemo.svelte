<script>
  import { onMount } from 'svelte';

  /** @type {{ phase: 'lobby' | 'round' | 'podium' }} */
  let { phase } = $props();

  const PLAYERS = [
    { name: 'Léa', color: '#e11d48', pts: 940 },
    { name: 'Max', color: '#2563eb', pts: 720 },
    { name: 'Inès', color: '#16a34a', pts: 610 },
  ];
  const SHAPES = [
    { s: '▲', c: '#e11d48' },
    { s: '◆', c: '#2563eb' },
    { s: '●', c: '#ca8a04' },
    { s: '■', c: '#16a34a' },
  ];
  const PICKS = [0, 0, 2];
  const BARS = Array.from({ length: 12 }, (_, k) => k);
  const QR = Array.from({ length: 49 }, (_, k) => (k * 7 + ((k * k) % 5)) % 3 !== 0);

  let tick = $state(0);

  onMount(() => {
    const id = setInterval(() => tick++, 600);
    return () => clearInterval(id);
  });

  // Une boucle de 10 temps par scène : les éléments apparaissent un à un puis tout recommence.
  const t = $derived(tick % 10);
  const joined = $derived(Math.min(3, Math.max(0, t - 1)));
  const timer = $derived(15 - t);
  const answered = $derived(Math.min(3, Math.max(0, t - 2)));
</script>

<div class="sd" aria-hidden="true">
  <div class="sd-tv">
    <div class="sd-tv-top"><b>ZIK Salon</b><span>{phase === 'lobby' ? 'Code 7F3K' : 'Manche 3 / 10'}</span></div>

    {#if phase === 'lobby'}
      <div class="sd-lobby">
        <div class="sd-qr">{#each QR as on, k (k)}<i class:on></i>{/each}</div>
        <div class="sd-joined">
          <span class="sd-label">Joueurs</span>
          {#each PLAYERS.slice(0, joined) as p (p.name)}
            <span class="sd-chip" style="--c:{p.color}">{p.name}</span>
          {/each}
        </div>
      </div>
    {:else if phase === 'round'}
      <div class="sd-round">
        <div class="sd-eq">{#each BARS as k (k)}<span style="--k:{k}"></span>{/each}</div>
        <div class="sd-timer">{timer}</div>
        <span class="sd-label">{answered} / 3 ont répondu</span>
      </div>
    {:else}
      {#key Math.floor(tick / 10)}
      <div class="sd-podium">
        {#each [1, 0, 2] as k (k)}
          <div class="sd-step" style="--h:{[70, 52, 38][k]}%;--c:{PLAYERS[k].color};--d:{k * 0.15}s">
            <span>{PLAYERS[k].name}</span>
            <i>{k + 1}</i>
          </div>
        {/each}
      </div>
      {/key}
    {/if}
  </div>

  <div class="sd-phones">
    {#each PLAYERS as p, k (p.name)}
      <div class="sd-phone" style="--c:{p.color}">
        {#if phase === 'lobby'}
          <span class="sd-ph-name">{k < joined ? p.name : p.name.slice(0, Math.max(0, t - k))}</span>
          {#if k < joined}<span class="sd-ph-ok">✓</span>{/if}
        {:else if phase === 'round'}
          <div class="sd-shapes">
            {#each SHAPES as sh, j (j)}
              <span style="--c:{sh.c}" class:picked={k < answered && j === PICKS[k]} class:faded={k < answered && j !== PICKS[k]}>{sh.s}</span>
            {/each}
          </div>
        {:else}
          <span class="sd-ph-rank">{k + 1}<sup>{k ? 'e' : 'er'}</sup></span>
          <span class="sd-ph-pts">{p.pts}</span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .sd {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 16px;
  }
  .sd-tv {
    flex: 1;
    min-width: 0;
    aspect-ratio: 16 / 10;
    display: flex;
    flex-direction: column;
    padding: 8px 10px;
    border-radius: 10px;
    background: #0b0b14;
    border: 3px solid #2a2a38;
    box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.25);
    color: #fff;
    overflow: hidden;
  }
  .sd-tv-top {
    display: flex;
    justify-content: space-between;
    font-size: 0.62rem;
    color: rgb(255 255 255 / 0.6);
  }
  .sd-tv-top b {
    color: var(--accent);
  }
  .sd-label {
    font-size: 0.6rem;
    color: rgb(255 255 255 / 0.6);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .sd-lobby {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .sd-qr {
    flex-shrink: 0;
    width: 62px;
    height: 62px;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    padding: 4px;
    background: #fff;
    border-radius: 4px;
  }
  .sd-qr i.on {
    background: #000;
  }
  .sd-joined {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
  .sd-chip {
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--c);
    font-size: 0.68rem;
    font-weight: 700;
    animation: sd-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .sd-round {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }
  .sd-eq {
    display: flex;
    gap: 2px;
    height: 18px;
    align-items: flex-end;
  }
  .sd-eq span {
    width: 4px;
    height: 100%;
    background: var(--accent);
    transform-origin: bottom;
    animation: sd-bar 0.8s ease-in-out infinite alternate;
    animation-delay: calc(var(--k) * -0.11s);
  }
  .sd-timer {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.9rem;
    line-height: 1;
  }

  .sd-podium {
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 6px;
  }
  .sd-step {
    width: 28%;
    height: var(--h);
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 4px 4px 0 0;
    background: var(--c);
    transform-origin: bottom;
    animation: sd-rise 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: var(--d);
  }
  .sd-step span {
    margin-top: -16px;
    font-size: 0.64rem;
    font-weight: 700;
  }
  .sd-step i {
    font-style: normal;
    font-weight: 900;
    font-size: 0.9rem;
  }

  .sd-phones {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sd-phone {
    width: 74px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 6px;
    border-radius: 8px;
    background: #111;
    border: 2px solid #333;
    border-left: 4px solid var(--c);
    color: #fff;
    font-size: 0.7rem;
  }
  .sd-ph-name {
    font-weight: 600;
    min-width: 1ch;
  }
  .sd-ph-ok {
    color: #22c55e;
    font-weight: 800;
    animation: sd-pop 0.4s ease;
  }
  .sd-shapes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    width: 100%;
  }
  .sd-shapes span {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 12px;
    border-radius: 2px;
    background: var(--c);
    font-size: 0.5rem;
    transition: transform 0.2s, opacity 0.2s;
  }
  .sd-shapes .picked {
    transform: scale(1.15);
    box-shadow: 0 0 0 1.5px #fff;
  }
  .sd-shapes .faded {
    opacity: 0.25;
  }
  .sd-ph-rank {
    font-weight: 900;
    color: var(--c);
  }
  .sd-ph-pts {
    font-variant-numeric: tabular-nums;
  }

  @keyframes sd-pop {
    from { transform: scale(0.3); opacity: 0; }
  }
  @keyframes sd-bar {
    from { transform: scaleY(0.2); }
    to { transform: scaleY(1); }
  }
  @keyframes sd-rise {
    from { transform: scaleY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .sd-eq span, .sd-step, .sd-chip { animation: none; }
  }
</style>
