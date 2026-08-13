<script>
  import { dicebear } from '$lib/utils.js';
  import ChallengeIcon from '$lib/components/ChallengeIcon.svelte';

  let { data } = $props();
  const weeks = data.weeks ?? [];

  const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  function prettyRange(start, end) {
    return `${dateFmt.format(new Date(`${start}T12:00:00Z`))} — ${dateFmt.format(new Date(`${end}T12:00:00Z`))}`;
  }
</script>

<svelte:head>
  <title>Archives du défi communautaire | ZIK</title>
  <meta name="description" content="Retrouve tous les défis communautaires hebdomadaires passés de ZIK : objectif, résultat et classement des contributeurs." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/defi/archives" />
</svelte:head>

<main class="da">
  <div class="da-glow" aria-hidden="true"></div>

  <div class="da-inner">
    <header class="da-head">
      <p class="da-kicker">Défi communautaire</p>
      <h1 class="da-title">Les archives</h1>
      <div class="da-meta">
        <span class="da-count">{weeks.length}</span>
        <span class="da-count-lbl">{weeks.length > 1 ? 'défis passés' : 'défi passé'}</span>
        <span class="da-rule" aria-hidden="true"></span>
        <a class="da-today" href="/defi">Défi en cours</a>
      </div>
    </header>

    {#if !weeks.length}
      <div class="da-empty">
        <p class="da-empty-title">Rien à afficher pour l'instant</p>
        <p class="da-empty-txt">Le premier défi hebdomadaire n'a pas encore été clôturé.</p>
        <a class="da-empty-cta" href="/defi">Voir le défi en cours</a>
      </div>
    {:else}
      <ol class="da-list">
        {#each weeks as w, i (w.id)}
          <li style="--i: {Math.min(i, 14)}">
            <a class="da-item" class:da-success={w.status === 'success'} href="/defi/archives/{w.week_start}">
              <span class="da-badge" class:da-badge-success={w.status === 'success'}>
                <span class="da-badge-icon">{w.status === 'success' ? '✓' : '✗'}</span>
                <span class="da-badge-lbl">{w.status === 'success' ? 'Réussi' : 'Échoué'}</span>
              </span>
              <span class="da-type"><ChallengeIcon type={w.type} /> {w.label}</span>
              <span class="da-range">{prettyRange(w.week_start, w.week_end)}</span>
              {#if w.top_contributor}
                <span class="da-top">
                  <img class="da-top-avatar" src={w.top_contributor.avatar_url || dicebear(w.top_contributor.username)} alt="" width="22" height="22" loading="lazy" />
                  <span class="da-top-name">{w.top_contributor.username}</span>
                </span>
              {/if}
              <span class="da-go" aria-hidden="true">→</span>
            </a>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</main>

<style>
  .da {
    position: relative;
    min-height: calc(100dvh - var(--nav-h));
    margin-top: var(--nav-h);
    padding: clamp(32px, 7vh, 72px) 20px 90px;
  }
  .da-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
  }
  .da-glow {
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

  .da-head { margin-bottom: clamp(24px, 4vh, 40px); }
  .da-kicker {
    margin: 0 0 4px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .da-title {
    margin: 0 0 16px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.6rem, 10vw, 5rem);
    line-height: 0.9;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--text);
  }
  .da-meta { display: flex; align-items: center; gap: 10px; }
  .da-count {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--accent);
  }
  .da-count-lbl, .da-today {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.68rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--dim);
    white-space: nowrap;
  }
  .da-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border2), transparent); }
  .da-today {
    color: var(--mid);
    border-bottom: 1px solid var(--border2);
    padding-bottom: 1px;
    transition: color 0.15s;
  }
  .da-today:hover { color: var(--accent); }

  .da-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .da-list li {
    animation: da-slide 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.1s + var(--i) * 0.04s);
  }
  .da-item {
    display: grid;
    grid-template-columns: auto auto 1fr auto auto;
    align-items: center;
    gap: 16px;
    padding: 14px 18px;
    background: rgb(var(--c-glass) / 0.03);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border2);
    text-decoration: none;
    transition: background 0.2s, border-color 0.2s, transform 0.2s;
  }
  .da-item:hover {
    background: rgb(var(--accent-rgb) / 0.07);
    border-left-color: var(--accent);
    transform: translateX(3px);
  }
  .da-success { border-left-color: rgb(var(--accent-rgb) / 0.4); }

  .da-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.72rem;
    padding: 5px 10px;
    background: rgb(248 113 113 / 0.2);
    color: var(--danger);
    white-space: nowrap;
    border: 1px solid rgb(248 113 113 / 0.4);
  }
  .da-badge-success {
    background: rgb(var(--accent-rgb) / 0.2);
    color: var(--accent);
    border-color: rgb(var(--accent-rgb) / 0.4);
  }
  .da-type {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .da-type :global(svg) { flex-shrink: 0; color: var(--accent); }
  .da-range {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dim);
    white-space: nowrap;
  }
  .da-top { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .da-top-avatar { border-radius: 50%; flex-shrink: 0; }
  .da-top-name { font-size: 0.82rem; color: var(--mid); }
  .da-go {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 1rem;
    color: var(--dim);
    transition: color 0.2s, transform 0.2s;
  }
  .da-item:hover .da-go { color: var(--accent); transform: translateX(3px); }

  .da-empty {
    text-align: center;
    padding: clamp(40px, 10vh, 90px) 20px;
    border: 1px dashed var(--border2);
  }
  .da-empty-title {
    margin: 0 0 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text);
  }
  .da-empty-txt { margin: 0 0 22px; color: var(--mid); font-size: 0.9rem; }
  .da-empty-cta {
    display: inline-block;
    padding: 12px 28px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  @keyframes da-slide {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @media (max-width: 700px) {
    .da-item {
      grid-template-columns: auto 1fr auto;
      gap: 10px;
    }
    .da-range { grid-column: 1 / -1; order: 4; }
    .da-top { display: none; }
  }
  @media (max-width: 768px) {
    .da { padding-bottom: 110px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .da-list li { animation: none !important; }
    .da-item { transition: none !important; }
  }
</style>
