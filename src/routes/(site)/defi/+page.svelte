<script>
  import { getContext } from 'svelte';
  import { dicebear } from '$lib/utils.js';
  import ChallengeIcon from '$lib/components/ChallengeIcon.svelte';

  let { data } = $props();
  const challenge = data.challenge;
  const ranking = data.ranking ?? [];

  const _ctx = getContext('zik');
  const user = $derived(_ctx.user);

  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => { now = Date.now(); }, 60_000);
    return () => clearInterval(t);
  });

  const pct = $derived(
    challenge ? Math.min(100, Math.round((challenge.current_value / challenge.target) * 100)) : 0,
  );

  const timeLeft = $derived.by(() => {
    if (!challenge) return '';
    const end = new Date(`${challenge.week_end}T23:59:59+02:00`).getTime();
    const diffMs = end - now;
    if (diffMs <= 0) return 'Se termine bientôt';
    const days = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
    if (days > 0) return `${days}j ${hours}h restantes`;
    return `${hours}h restantes`;
  });
</script>

<svelte:head>
  <title>Défi communautaire de la semaine | ZIK</title>
  <meta name="description" content="Chaque semaine, toute la communauté ZIK vise un objectif collectif. Suis la progression en direct et le classement des joueurs qui contribuent le plus." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/defi" />
</svelte:head>

<main class="wd">
  <div class="wd-glow" aria-hidden="true"></div>

  <div class="wd-inner">
    <header class="wd-head">
      <p class="wd-kicker">Défi communautaire</p>
      <h1 class="wd-title">
        {#if challenge}<ChallengeIcon type={challenge.type} size={32} />{/if}
        {challenge ? challenge.label : 'Aucun défi en cours'}
      </h1>
      <p class="wd-desc">
        Chaque semaine, toute la communauté ZIK vise un objectif collectif. Pas besoin de gagner :
        chaque partie jouée et chaque bonne réponse compte pour tout le monde.
      </p>
      <div class="wd-meta">
        <a class="wd-archives-link" href="/defi/archives">Voir l'historique des défis →</a>
      </div>
    </header>

    {#if challenge}
      <section class="wd-card">
        <div class="wd-card-head">
          <span class="wd-countdown">{timeLeft}</span>
        </div>
        <div class="wd-bar-wrap">
          <div class="wd-bar"><div class="wd-bar-fill" style="width:{pct}%"></div></div>
          <span class="wd-bar-label">{challenge.current_value.toLocaleString('fr-FR')} / {challenge.target.toLocaleString('fr-FR')} {challenge.unit}</span>
        </div>
      </section>

      <section class="wd-ranking">
        <h2 class="wd-ranking-title">Classement des contributeurs</h2>
        {#if ranking.length}
          <ol class="wd-rank-list">
            {#each ranking as r, i (r.user_id ?? i)}
              <li class="wd-rank-row" class:wd-me={user && r.user_id === user.id}>
                <span class="wd-rank-n">{i + 1}</span>
                <img class="wd-rank-avatar" src={r.profiles?.avatar_url || dicebear(r.profiles?.username ?? '?')} alt="" width="32" height="32" loading="lazy" />
                <span class="wd-rank-name">{r.profiles?.username ?? 'Joueur'}</span>
                <span class="wd-rank-amount">{r.amount.toLocaleString('fr-FR')}</span>
              </li>
            {/each}
          </ol>
        {:else}
          <p class="wd-rank-empty">Personne n'a encore contribué cette semaine. Joue une partie ou un Zikle pour être le premier !</p>
        {/if}
      </section>
    {:else}
      <div class="wd-empty">
        <p class="wd-empty-txt">Aucun défi actif pour le moment.</p>
        <a class="wd-empty-cta" href="/defi/archives">Voir les défis passés</a>
      </div>
    {/if}
  </div>
</main>

<style>
  .wd {
    position: relative;
    min-height: calc(100dvh - var(--nav-h));
    margin-top: var(--nav-h);
    padding: clamp(32px, 7vh, 72px) 20px 90px;
  }
  .wd-glow {
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
  .wd-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
  }

  .wd-head { margin-bottom: 28px; }
  .wd-kicker {
    margin: 0 0 4px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .wd-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 14px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2rem, 7vw, 3.2rem);
    line-height: 1;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--text);
  }
  .wd-title :global(svg) { flex-shrink: 0; color: var(--accent); }
  .wd-desc {
    margin: 0 0 16px;
    color: var(--mid);
    font-size: 0.92rem;
    line-height: 1.6;
    max-width: 58ch;
  }
  .wd-archives-link {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.74rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
    border-bottom: 1px solid var(--border2);
    padding-bottom: 1px;
    transition: color 0.15s;
  }
  .wd-archives-link:hover { color: var(--accent); }

  .wd-card {
    border: 1px solid rgb(var(--accent-rgb) / 0.3);
    background:
      radial-gradient(ellipse at 100% 0%, rgb(var(--accent-rgb) / 0.08) 0%, transparent 55%),
      var(--bg2);
    padding: 24px 24px 20px;
    margin-bottom: 32px;
    position: relative;
  }
  .wd-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent);
  }
  .wd-card-head { display: flex; justify-content: flex-end; margin-bottom: 10px; }
  .wd-countdown {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--dim);
  }
  .wd-bar-wrap { display: flex; flex-direction: column; gap: 8px; }
  .wd-bar {
    height: 10px;
    background: rgb(var(--c-glass) / 0.08);
    border: 1px solid rgb(var(--c-glass) / 0.1);
    overflow: hidden;
  }
  .wd-bar-fill { height: 100%; background: var(--accent); transition: width 0.6s ease; }
  .wd-bar-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.78rem;
    letter-spacing: 0.05em;
    color: var(--mid);
  }

  .wd-ranking-title {
    margin: 0 0 14px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--text);
  }
  .wd-rank-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .wd-rank-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    background: rgb(var(--c-glass) / 0.03);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border2);
  }
  .wd-rank-row.wd-me {
    border-left-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.06);
  }
  .wd-rank-n {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--dim);
    width: 22px;
    flex-shrink: 0;
  }
  .wd-rank-avatar { border-radius: 50%; flex-shrink: 0; }
  .wd-rank-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.9rem; }
  .wd-rank-amount {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    color: var(--accent);
  }
  .wd-rank-empty { color: var(--mid); font-size: 0.9rem; }

  .wd-empty {
    text-align: center;
    padding: clamp(40px, 10vh, 80px) 20px;
    border: 1px dashed var(--border2);
  }
  .wd-empty-txt { margin: 0 0 18px; color: var(--mid); }
  .wd-empty-cta {
    display: inline-block;
    padding: 11px 26px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.76rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  @media (max-width: 768px) {
    .wd { padding-bottom: 110px; }
  }
</style>
