<script>
  import { getContext } from "svelte";
  import { MAX_ATTEMPTS, waveformForDate } from "$lib/zikle/shared.js";

  let { data } = $props();

  const _ctx = getContext("zik");
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);
  const openAuthModal = _ctx.openAuthModal;

  const MINI_BARS = 72;
  const STORAGE_KEY = "zikle_history";
  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // date -> { won, attempts } pour les jours déjà terminés
  let played = $state({});
  let loadedFor = null;

  function prettyDate(d) {
    return dateFmt.format(new Date(`${d}T12:00:00Z`));
  }

  // Comme pour le jeu, on attend authReady : avant, `user` vaut toujours null
  // et on lirait l'historique invité pour un compte connecté.
  $effect(() => {
    if (!authReady) return;
    const key = user ? user.id : "guest";
    if (loadedFor === key) return;
    loadedFor = key;
    loadPlayed();
  });

  async function loadPlayed() {
    if (user) {
      const { data: rows } = await sb
        .from("daily_results")
        .select("date, won, attempts")
        .limit(500);
      played = Object.fromEntries(
        (rows || []).map((r) => [r.date, { won: r.won, attempts: r.attempts }]),
      );
      return;
    }
    try {
      const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      played = Object.fromEntries(
        Object.entries(hist).map(([d, v]) => [
          d,
          { won: v.won, attempts: v.attempts?.length ?? 0 },
        ]),
      );
    } catch {
      played = {};
    }
  }
</script>

<svelte:head>
  <title>Archives Zikle — Rejoue les jours passés | ZIK</title>
  <meta name="description" content="Retrouve tous les Zikle passés : un extrait audio, six essais, un titre par jour. Rejoue les jours précédents avec ton compte ZIK." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle/archives" />
  <meta property="og:title" content="Archives Zikle" />
  <meta property="og:description" content="Rejoue les Zikle des jours précédents." />
  <meta property="og:url" content="https://www.zik-music.fr/zikle/archives" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />
</svelte:head>

<main class="za">
  <div class="za-glow" aria-hidden="true"></div>

  <div class="za-inner">
  <header class="za-head">
    <p class="za-kicker">Zikle</p>
    <h1 class="za-title">Les archives</h1>
    <div class="za-meta">
      <span class="za-count">{data.days.length}</span>
      <span class="za-count-lbl">{data.days.length > 1 ? "jours passés" : "jour passé"}</span>
      <span class="za-rule" aria-hidden="true"></span>
      <a class="za-today" href="/zikle">Jouer aujourd'hui</a>
    </div>
  </header>

  {#if authReady && !user}
    <p class="za-notice">
      Les jours passés demandent un compte.
      <button onclick={() => openAuthModal("login")}>Se connecter</button>
    </p>
  {/if}

  {#if !data.days.length}
    <div class="za-empty">
      <p class="za-empty-title">Rien à rejouer pour l'instant</p>
      <p class="za-empty-txt">Le premier Zikle archivé apparaîtra ici demain.</p>
      <a class="za-empty-cta" href="/zikle">Jouer le Zikle du jour</a>
    </div>
  {:else}
    <ol class="za-list">
      {#each data.days as day, i (day.date)}
        {@const done = played[day.date]}
        <li style="--i: {Math.min(i, 14)}">
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
                {done.won ? `${done.attempts}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`}
              </span>
            {/if}
            <span class="za-date">{prettyDate(day.date)}</span>
            <span class="za-go" aria-hidden="true">{done ? "↻" : "→"}</span>
          </a>
        </li>
      {/each}
    </ol>
  {/if}
  </div>
</main>

<style>
  /* Le body du site est en flex column : des marges auto latérales ici
     annuleraient l'étirement et la page se réduirait à la largeur du contenu.
     On garde donc .za pleine largeur et on centre via .za-inner. */
  .za {
    position: relative;
    min-height: calc(100dvh - var(--nav-h));
    margin-top: var(--nav-h);
    padding: clamp(32px, 7vh, 72px) 20px 90px;
  }
  .za-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
  }
  .za-glow {
    position: absolute;
    top: 0;
    left: 50%;
    width: min(120vw, 900px);
    aspect-ratio: 1;
    transform: translate(-50%, -40%);
    background: radial-gradient(circle, rgb(var(--accent-rgb) / 0.08), transparent 62%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── En-tête ── */
  .za-head {
    position: relative;
    z-index: 1;
    margin-bottom: clamp(24px, 4vh, 40px);
    animation: za-in 0.5s ease both;
  }
  .za-kicker {
    margin: 0 0 4px;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .za-title {
    margin: 0 0 16px;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: clamp(2.6rem, 10vw, 5rem);
    line-height: 0.9;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--text);
  }
  .za-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .za-count {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--accent);
  }
  .za-count-lbl,
  .za-today {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    font-size: 0.68rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--dim);
    white-space: nowrap;
  }
  .za-rule {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--border2), transparent);
  }
  .za-today {
    color: var(--mid);
    border-bottom: 1px solid var(--border2);
    padding-bottom: 1px;
    transition: color 0.15s;
  }
  .za-today:hover {
    color: var(--accent);
  }

  /* ── Bandeau compte requis ── */
  .za-notice {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0 0 18px;
    padding: 11px 16px;
    background: rgb(var(--accent-rgb) / 0.06);
    border-left: 3px solid var(--accent);
    font-size: 0.86rem;
    color: var(--mid);
    animation: za-in 0.5s 0.08s ease both;
  }
  .za-notice button {
    -webkit-appearance: none;
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    border-bottom: 1px solid rgb(var(--accent-rgb) / 0.5);
  }

  /* ── Liste ── */
  .za-list {
    position: relative;
    z-index: 1;
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .za-list li {
    animation: za-slide 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.1s + var(--i) * 0.04s);
  }

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

  /* Jour déjà terminé : la ligne reste lisible mais se distingue au premier coup d'œil */
  .za-badge {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.7rem;
    padding: 3px 7px;
    background: rgb(248 113 113 / 0.15);
    color: var(--danger);
    white-space: nowrap;
  }
  .za-badge-win {
    background: rgb(var(--accent-rgb) / 0.18);
    color: var(--accent);
  }
  .za-done {
    border-left-color: var(--danger);
  }
  .za-done-win {
    border-left-color: var(--accent);
  }
  .za-done .za-wave span {
    background: rgb(var(--c-glass) / 0.07);
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

  /* ── Vide ── */
  .za-empty {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: clamp(40px, 10vh, 90px) 20px;
    border: 1px dashed var(--border2);
    animation: za-in 0.5s 0.1s ease both;
  }
  .za-empty-title {
    margin: 0 0 8px;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text);
  }
  .za-empty-txt {
    margin: 0 0 22px;
    color: var(--mid);
    font-size: 0.9rem;
  }
  .za-empty-cta {
    display: inline-block;
    padding: 12px 28px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    box-shadow: 0 6px 30px rgb(var(--accent-rgb) / 0.32);
    transition: filter 0.15s;
  }
  .za-empty-cta:hover {
    filter: brightness(1.08);
  }

  @keyframes za-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes za-slide {
    from {
      opacity: 0;
      transform: translateX(-12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
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
  @media (max-width: 768px) {
    .za {
      padding-bottom: 110px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .za-head,
    .za-notice,
    .za-list li,
    .za-empty {
      animation: none !important;
    }
    .za-item,
    .za-wave span,
    .za-go,
    .za-n,
    .za-date {
      transition: none !important;
    }
  }
</style>
