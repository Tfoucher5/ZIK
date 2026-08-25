<script>
  import { getContext } from 'svelte';
  import { dicebear } from '$lib/utils.js';
  import ChallengeIcon from '$lib/components/ChallengeIcon.svelte';

  let { data } = $props();
  const week = data.week;
  const ranking = week.ranking ?? [];

  const _ctx = getContext('zik');
  const user = $derived(_ctx.user);

  const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const range = `${dateFmt.format(new Date(`${week.week_start}T12:00:00Z`))} — ${dateFmt.format(new Date(`${week.week_end}T12:00:00Z`))}`;

  const pct = Math.min(100, Math.round((week.current_value / week.target) * 100));

  const statusLabel = { success: 'Réussi', failed: 'Échoué', active: 'En cours' }[week.status] ?? week.status;
</script>

<svelte:head>
  <title>Défi du {range} — Archives | ZIK</title>
  <meta name="description" content="Défi communautaire {week.label} du {range} : {statusLabel}. Retrouve le classement complet des contributeurs." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/defi/archives/{week.week_start}" />
</svelte:head>

<main class="dw">
  <div class="dw-glow" aria-hidden="true"></div>

  <div class="dw-inner">
    <a class="dw-back" href="/defi/archives">← Archives</a>

    <header class="dw-head">
      <span class="dw-status" class:dw-status-success={week.status === 'success'}>{statusLabel}</span>
      <h1 class="dw-title"><ChallengeIcon type={week.type} size={30} /> {week.label}</h1>
      <p class="dw-range">{range}</p>
    </header>

    <section class="dw-card">
      <div class="dw-bar-wrap">
        <div class="dw-bar"><div class="dw-bar-fill" style="width:{pct}%"></div></div>
        <span class="dw-bar-label">{week.current_value.toLocaleString('fr-FR')} / {week.target.toLocaleString('fr-FR')} {week.unit}</span>
      </div>
    </section>

    <section class="dw-ranking">
      <h2 class="dw-ranking-title">Classement des contributeurs</h2>
      {#if ranking.length}
        <ol class="dw-rank-list">
          {#each ranking as r, i (r.user_id ?? i)}
            <li class="dw-rank-row" class:dw-me={user && r.user_id === user.id} class:dw-first={i === 0}>
              <span class="dw-rank-n">{i + 1}</span>
              <img class="dw-rank-avatar" src={r.profiles?.avatar_url || dicebear(r.profiles?.username ?? '?')} alt="" width="32" height="32" loading="lazy" />
              <span class="dw-rank-name">{r.profiles?.username ?? 'Joueur'}</span>
              <span class="dw-rank-amount">{r.amount.toLocaleString('fr-FR')}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="dw-rank-empty">Personne n'a contribué cette semaine-là.</p>
      {/if}
    </section>
  </div>
</main>

<style>
  .dw {
    position: relative;
    min-height: calc(100dvh - var(--nav-h));
    margin-top: var(--nav-h);
    padding: clamp(32px, 7vh, 72px) 20px 90px;
  }
  .dw-glow {
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
  .dw-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
  }

  .dw-back {
    display: inline-block;
    margin-bottom: 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
    transition: color 0.15s;
  }
  .dw-back:hover { color: var(--accent); }

  .dw-head { margin-bottom: 28px; }
  .dw-status {
    display: inline-block;
    margin-bottom: 10px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.72rem;
    padding: 5px 10px;
    background: rgb(248 113 113 / 0.2);
    color: var(--danger);
    border: 1px solid rgb(248 113 113 / 0.4);
  }
  .dw-status-success {
    background: rgb(var(--accent-rgb) / 0.2);
    color: var(--accent);
    border-color: rgb(var(--accent-rgb) / 0.4);
  }
  .dw-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2rem, 7vw, 3.2rem);
    line-height: 1;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--text);
  }
  .dw-title :global(svg) { flex-shrink: 0; color: var(--accent); }
  .dw-range {
    margin: 0;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dim);
  }

  .dw-card {
    border: 1px solid rgb(var(--accent-rgb) / 0.3);
    background:
      radial-gradient(ellipse at 100% 0%, rgb(var(--accent-rgb) / 0.08) 0%, transparent 55%),
      var(--bg2);
    padding: 24px;
    margin-bottom: 32px;
    position: relative;
  }
  .dw-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent);
  }
  .dw-bar-wrap { display: flex; flex-direction: column; gap: 8px; }
  .dw-bar {
    height: 10px;
    background: rgb(var(--c-glass) / 0.08);
    border: 1px solid rgb(var(--c-glass) / 0.1);
    overflow: hidden;
  }
  .dw-bar-fill { height: 100%; background: var(--accent); transition: width 0.6s ease; }
  .dw-bar-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.78rem;
    letter-spacing: 0.05em;
    color: var(--mid);
  }

  .dw-ranking-title {
    margin: 0 0 14px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--text);
  }
  .dw-rank-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .dw-rank-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    background: rgb(var(--c-glass) / 0.03);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border2);
  }
  .dw-rank-row.dw-first { border-left-color: var(--accent); }
  .dw-rank-row.dw-me {
    border-left-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.06);
  }
  .dw-rank-n {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--dim);
    width: 22px;
    flex-shrink: 0;
  }
  .dw-rank-avatar { border-radius: 50%; flex-shrink: 0; }
  .dw-rank-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.9rem; }
  .dw-rank-amount {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    color: var(--accent);
  }
  .dw-rank-empty { color: var(--mid); font-size: 0.9rem; }

  @media (max-width: 768px) {
    .dw { padding-bottom: 110px; }
  }
</style>
