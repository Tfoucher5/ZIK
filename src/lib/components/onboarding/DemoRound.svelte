<script>
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';

  const ANSWERS = ['Daft Punk - One More Time', 'Aya Nakamura - Djadja', 'Queen - Bohemian Rhapsody'];
  const POINTS = [120, 95, 140];
  const BARS = Array.from({ length: 16 }, (_, k) => k);

  let round = $state(0);
  let typed = $state('');
  let win = $state(false);
  let players = $state([
    { name: 'Léa', score: 210 },
    { name: 'Max', score: 150 },
    { name: 'Toi', score: 90, me: true },
  ]);

  const ranked = $derived([...players].sort((a, b) => b.score - a.score));

  onMount(() => {
    let alive = true;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      while (alive) {
        const answer = ANSWERS[round % ANSWERS.length];
        await wait(700);
        for (const ch of answer) {
          if (!alive) return;
          typed += ch;
          await wait(55);
        }
        await wait(250);
        win = true;
        players = players.map((p) => (p.me ? { ...p, score: p.score + POINTS[round % POINTS.length] } : { ...p, score: p.score + 20 }));
        await wait(1900);
        win = false;
        typed = '';
        round++;
        if (round % ANSWERS.length === 0) players = players.map((p) => ({ ...p, score: p.me ? 90 : p.score - 60 }));
      }
    })();
    return () => (alive = false);
  });
</script>

<div class="dm" aria-hidden="true">
  <div class="dm-stage">
    <div class="dm-head">
      <span>Manche {(round % ANSWERS.length) + 3} / 10</span>
      <svg class="dm-timer" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" />
        {#key round}<circle class="dm-timer-arc" cx="18" cy="18" r="15" />{/key}
      </svg>
    </div>
    <div class="dm-eq" class:paused={win}>
      {#each BARS as k (k)}
        <span style="--k:{k}"></span>
      {/each}
    </div>
    <div class="dm-input" class:ok={win}>
      {typed}<span class="dm-caret"></span>
      {#if win}<span class="dm-pts">+{POINTS[round % POINTS.length]}</span>{/if}
    </div>
  </div>
  <ol class="dm-board">
    {#each ranked as p, k (p.name)}
      <li class:me={p.me} animate:flip={{ duration: 450 }}>
        <span class="dm-rank">{k + 1}</span>{p.name}<b>{p.score}</b>
      </li>
    {/each}
  </ol>
</div>

<style>
  .dm {
    display: grid;
    grid-template-columns: 1fr 112px;
    gap: 10px;
    margin-top: 16px;
  }
  .dm-stage {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 12px;
    min-width: 0;
  }
  .dm-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .dm-timer {
    width: 20px;
    height: 20px;
    transform: rotate(-90deg);
  }
  .dm-timer circle {
    fill: none;
    stroke: var(--border2);
    stroke-width: 4;
  }
  .dm-timer .dm-timer-arc {
    stroke: var(--accent);
    stroke-dasharray: 94.25;
    animation: dm-count 3.4s linear forwards;
  }

  .dm-eq {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 34px;
    margin: 8px 0;
  }
  .dm-eq span {
    flex: 1;
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(var(--accent), var(--accent2));
    transform-origin: bottom;
    animation: dm-bar 0.9s ease-in-out infinite alternate;
    animation-delay: calc(var(--k) * -0.13s);
  }
  .dm-eq.paused span {
    animation-play-state: paused;
    opacity: 0.4;
  }

  .dm-input {
    position: relative;
    height: 30px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--border2);
    background: var(--bg);
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    transition: border-color 0.2s, background 0.2s;
  }
  .dm-input.ok {
    border-color: var(--success);
    background: rgb(34 197 94 / 0.12);
  }
  .dm-caret {
    width: 1.5px;
    height: 14px;
    margin-left: 1px;
    background: var(--text);
    animation: dm-blink 1s steps(1) infinite;
  }
  .dm-pts {
    position: absolute;
    right: 8px;
    font-weight: 800;
    color: var(--success);
    animation: dm-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .dm-board {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .dm-board li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 8px;
    background: var(--surface2);
    font-size: 0.75rem;
  }
  .dm-board li.me {
    background: rgb(var(--accent-rgb) / 0.18);
    outline: 1px solid rgb(var(--accent-rgb) / 0.5);
  }
  .dm-board b {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }
  .dm-rank {
    color: var(--dim);
    font-weight: 700;
  }

  @keyframes dm-bar {
    from { transform: scaleY(0.15); }
    to { transform: scaleY(1); }
  }
  @keyframes dm-count {
    to { stroke-dashoffset: 94.25; }
  }
  @keyframes dm-blink {
    50% { opacity: 0; }
  }
  @keyframes dm-pop {
    from { transform: scale(0.3); opacity: 0; }
  }

  @media (max-width: 400px) {
    .dm { grid-template-columns: 1fr; }
    .dm-board { flex-direction: row; }
    .dm-board li { flex: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dm-eq span { animation: none; transform: scaleY(0.6); }
  }
</style>
