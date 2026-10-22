<script module>
  const MINI_BARS = 72;
  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
</script>

<script>
  import { waveformForDate } from "$lib/shared/zikle/shared.js";
  import { scoreLabel } from "./history.js";

  // done : { won, attempts } quand le jour est déjà terminé
  let { day, done } = $props();
</script>

<a
  class="za-item"
  class:za-done={done}
  class:za-done-win={done?.won}
  href="/zikle/archives/{day.date}"
>
  <span class="za-n">#{day.dayNumber}</span>
  <span class="za-wave" aria-hidden="true">
    {#each waveformForDate(day.date, MINI_BARS) as h, b (b)}
      <span style="--h: {h}; --b: {b}"></span>
    {/each}
  </span>
  {#if done}
    <span class="za-badge" class:za-badge-win={done.won}>
      <span class="za-badge-icon">{done.won ? "✓" : "✗"}</span>
      <span class="za-badge-score">{scoreLabel(done.won, done.attempts)}</span>
    </span>
  {/if}
  <span class="za-date">{dateFmt.format(new Date(`${day.date}T12:00:00Z`))}</span>
  <span class="za-go" aria-hidden="true">{done ? "↻" : "→"}</span>
</a>

<style>
  .za-item {
    display: grid;
    grid-template-columns: auto 1fr auto auto auto;
    align-items: center;
    gap: 18px;
    padding: 14px 18px;
    background: rgb(var(--c-glass) / 0.03);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border2);
    text-decoration: none;
    transition:
      background 0.2s,
      border-color 0.2s,
      transform 0.2s;
  }
  .za-item:hover {
    background: rgb(var(--accent-rgb) / 0.07);
    border-left-color: var(--accent);
    transform: translateX(3px);
  }
  .za-item:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .za-n {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.94rem;
    color: var(--mid);
    transition: color 0.2s;
  }
  .za-item:hover .za-n {
    color: var(--accent);
  }

  /* Chaque jour a sa propre onde, dérivée de sa date — même dessin que dans le jeu. */
  .za-wave {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 36px;
    min-width: 0;
  }
  .za-wave span {
    flex: 1;
    min-width: 1px;
    height: calc(var(--h) * 100%);
    background: rgb(var(--c-glass) / 0.13);
    transition:
      background 0.3s,
      transform 0.3s;
    transition-delay: calc(var(--b) * 5ms);
  }
  .za-item:hover .za-wave span {
    background: rgb(var(--accent-rgb) / 0.6);
    transform: scaleY(1.15);
  }

  /* Jour déjà terminé */
  .za-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.75rem;
    padding: 5px 10px;
    background: rgb(248 113 113 / 0.2);
    color: var(--danger);
    white-space: nowrap;
    border: 1px solid rgb(248 113 113 / 0.4);
  }
  .za-badge-icon {
    font-size: 0.85rem;
    font-family: inherit;
  }
  .za-badge-score {
    font-family: inherit;
  }
  .za-badge-win {
    background: rgb(var(--accent-rgb) / 0.2);
    color: var(--accent);
    border-color: rgb(var(--accent-rgb) / 0.4);
  }
  .za-done {
    background: rgb(248 113 113 / 0.06);
    border-left-color: var(--danger);
    border-left-width: 4px;
  }
  .za-done-win {
    background: rgb(var(--accent-rgb) / 0.06);
    border-left-color: var(--accent);
    border-left-width: 4px;
  }
  .za-done .za-wave span {
    background: rgb(248 113 113 / 0.35);
  }
  .za-done-win .za-wave span {
    background: rgb(var(--accent-rgb) / 0.35);
  }

  .za-date {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--dim);
    white-space: nowrap;
    transition: color 0.2s;
  }
  .za-item:hover .za-date {
    color: var(--text);
  }

  .za-go {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 1rem;
    color: var(--dim);
    transition:
      color 0.2s,
      transform 0.2s;
  }
  .za-item:hover .za-go {
    color: var(--accent);
    transform: translateX(3px);
  }

  @media (max-width: 620px) {
    .za-item {
      grid-template-columns: auto 1fr auto auto;
      gap: 10px;
      padding: 12px 14px;
    }
    /* L'onde passe en pleine largeur sous l'en-tête de ligne sur petit écran. */
    .za-wave {
      grid-column: 1 / -1;
      grid-row: 2;
      height: 24px;
    }
    .za-date {
      font-size: 0.74rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .za-item,
    .za-wave span,
    .za-go,
    .za-n,
    .za-date {
      transition: none !important;
    }
  }
</style>
