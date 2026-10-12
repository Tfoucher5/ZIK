<script>
  let { count } = $props();
</script>

<header class="za-head">
  <p class="za-kicker">Zikle</p>
  <h1 class="za-title">Les archives</h1>
  <div class="za-meta">
    <span class="za-count">{count}</span>
    <span class="za-count-lbl">{count > 1 ? "jours passés" : "jour passé"}</span>
    <span class="za-rule" aria-hidden="true"></span>
    <a class="za-today" href="/zikle">Jouer aujourd'hui</a>
  </div>
</header>

<style>
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

  @media (prefers-reduced-motion: reduce) {
    .za-head {
      animation: none !important;
    }
  }
</style>
