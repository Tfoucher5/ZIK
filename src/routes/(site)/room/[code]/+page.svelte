<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import RoomJoinCard from '$lib/components/rooms/RoomJoinCard.svelte';
  import { modeRules } from '$lib/rooms/room-content.js';

  let { data } = $props();
  const { room, trackCount, artists, leaderboard } = data;
  const mode = modeRules(room.game_mode);

  const modeLabel = room.game_mode === 'qcm' ? 'Mode QCM (choix multiple)' : 'Mode Classique (saisie libre, classement ELO)';
  const officialLabel = room.is_official ? ' Room officielle.' : '';
  const desc = room.description
    ? `${room.description} ${modeLabel}.${officialLabel} Rejoins sur ZIK, le blind test multijoueur en ligne.`
    : `Rejoins la room "${room.name}" sur ZIK. ${modeLabel}.${officialLabel} Blind test musical multijoueur en ligne.`;
  const pageTitle = `${room.emoji} ${room.name} — ${room.game_mode === 'qcm' ? 'Blind Test QCM' : 'Blind Test Classique'} | ZIK`;
  const canonicalUrl = `https://www.zik-music.fr/room/${room.code}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Game",
    "name": `${room.name} — Blind Test ZIK`,
    "description": desc,
    "url": canonicalUrl,
    "genre": ["Music", "Quiz", "Trivia"],
    "isAccessibleForFree": true,
    "inLanguage": "fr-FR",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
    "applicationCategory": "GameApplication",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.zik-music.fr/" },
        { "@type": "ListItem", "position": 2, "name": "Rooms", "item": "https://www.zik-music.fr/rooms" },
        { "@type": "ListItem", "position": 3, "name": room.name, "item": canonicalUrl }
      ]
    }
  });

</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content="{desc} Gratuit, sans installation, directement dans le navigateur.">
  <meta name="robots" content={room.is_official ? 'index, follow' : 'noindex, follow'}>
  <link rel="canonical" href={canonicalUrl}>

  <meta property="og:title" content={pageTitle}>
  <meta property="og:description" content="{desc} Rejoins maintenant, c'est gratuit !">
  <meta property="og:url" content={canonicalUrl}>
  <meta property="og:type" content="website">

  <JsonLd json={jsonLd} />

</svelte:head>

<main class="room-landing">

  <!-- Retour -->
  <div class="room-back-wrap">
    <button class="btn-back" onclick={() => history.back()}>Retour</button>
  </div>

  <!-- Hero -->
  <div class="room-hero">
    <div class="room-hero-bg">
      <div class="orb o1"></div>
      <div class="orb o2"></div>
    </div>
    <div class="room-hero-content">
      <div class="room-badges">
        {#if room.is_official}
          <span class="room-badge-official">⭐ Room officielle</span>
        {/if}
        {#if room.game_mode === 'qcm'}
          <span class="room-badge-qcm">🎯 Mode QCM</span>
        {/if}
      </div>
      <div class="room-emoji">{room.emoji}</div>
      <h1 class="room-title">{room.name}</h1>
      {#if room.description}
        <p class="room-desc">{room.description}</p>
      {/if}
      <div class="room-meta">
        <span class="room-meta-chip">🎵 Blind Test</span>
        <span class="room-meta-chip">🌐 Multijoueur</span>
        <span class="room-meta-chip">⚡ Gratuit</span>
        {#if room.game_mode === 'qcm'}
          <span class="room-meta-chip room-meta-chip-qcm">🎯 QCM — Choix multiple</span>
        {:else}
          <span class="room-meta-chip">⌨️ Mode Classique</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Join card -->
  <div class="room-join-wrap">
    <RoomJoinCard gameMode={room.game_mode || 'classic'} getCode={async () => room.code}>
      <p class="room-back-link">
        <a href="/rooms">← Voir toutes les rooms</a>
      </p>
    </RoomJoinCard>
  </div>

  <section class="room-info">
    <div class="room-info-card">
      <h2>{mode.label}</h2>
      <p class="room-info-intro">{mode.intro}</p>
      <ul class="room-rules">
        {#each mode.rules as rule (rule)}
          <li>{rule}</li>
        {/each}
      </ul>
    </div>

    <div class="room-info-card">
      <h2>La partie en bref</h2>
      <dl class="room-specs">
        <div><dt>Manches</dt><dd>{room.max_rounds}</dd></div>
        <div><dt>Par manche</dt><dd>{room.round_duration} s</dd></div>
        {#if trackCount}
          <div><dt>Titres en jeu</dt><dd>{trackCount}</dd></div>
        {/if}
      </dl>
      <p class="room-info-foot">
        <a href="/docs">Comment ça marche ?</a>
      </p>
    </div>

    {#if artists.length}
      <div class="room-info-card">
        <h2>Artistes les plus présents</h2>
        <ul class="room-artists">
          {#each artists as a (a.artist)}
            <li><span class="ra-name">{a.artist}</span><span class="ra-count">{a.count}</span></li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if leaderboard.length}
      <div class="room-info-card">
        <h2>Classement de la semaine</h2>
        <ol class="room-lb">
          {#each leaderboard as p, i (p.username)}
            <li>
              <span class="lb-rank">{i + 1}</span>
              <span class="lb-name">{p.username}</span>
              <span class="lb-score">{p.weekly_score}</span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}
  </section>

</main>

<style>
  .room-landing {
    min-height: 100vh;
    padding-top: var(--nav-h, 64px);
  }
  .room-back-wrap {
    padding: 16px clamp(16px, 5vw, 80px) 0;
  }

  /* ── Hero ── */
  .room-hero {
    position: relative;
    overflow: hidden;
    padding: 60px clamp(16px, 5vw, 80px) 48px;
    text-align: center;
  }
  .room-hero-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .room-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 20px;
  }
  .room-badge-official {
    display: inline-block;
    background: rgba(250, 204, 21, 0.12);
    border: 1px solid rgba(250, 204, 21, 0.3);
    color: #fbbf24;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 50px;
    letter-spacing: 0.3px;
  }
  .room-badge-qcm {
    display: inline-block;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #4ade80;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 50px;
    letter-spacing: 0.3px;
  }
  .room-meta-chip-qcm {
    color: #4ade80;
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.2);
  }
  .room-emoji {
    font-size: 3.5rem;
    line-height: 1;
    margin-bottom: 16px;
  }
  .room-title {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 12px;
  }
  .room-desc {
    font-size: 1rem;
    color: var(--mid, #94a3b8);
    max-width: 500px;
    margin: 0 auto 20px;
    line-height: 1.6;
  }
  .room-meta {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .room-meta-chip {
    background: rgb(var(--c-glass) / 0.06);
    border: 1px solid rgb(var(--c-glass) / 0.1);
    border-radius: 50px;
    padding: 4px 12px;
    font-size: 0.78rem;
    color: var(--mid, #94a3b8);
  }

  /* ── Join card ── */
  .room-join-wrap {
    display: flex;
    justify-content: center;
    padding: 0 clamp(16px, 5vw, 80px) 48px;
  }
  .room-back-link {
    margin-top: 18px;
    font-size: 0.8rem;
  }
  .room-back-link a {
    color: var(--mid, #94a3b8);
    text-decoration: none;
  }
  .room-back-link a:hover { color: var(--text, #f1f5f9); }

  /* ── Fiche d'information ── */
  .room-info {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 clamp(16px, 5vw, 80px) 80px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    align-items: start;
  }
  .room-info-card {
    background: var(--surface, rgb(var(--c-glass) / 0.04));
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 16px;
    padding: 22px;
  }
  .room-info-card h2 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 12px;
    color: var(--text, #f1f5f9);
  }
  .room-info-intro {
    font-size: 0.9rem;
    color: var(--mid, #94a3b8);
    line-height: 1.6;
    margin: 0 0 12px;
  }
  .room-rules {
    margin: 0;
    padding-left: 18px;
    color: var(--mid, #94a3b8);
    font-size: 0.88rem;
    line-height: 1.7;
  }
  .room-specs {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .room-specs > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    padding-bottom: 6px;
  }
  .room-specs dt {
    color: var(--dim, #64748b);
    font-size: 0.85rem;
  }
  .room-specs dd {
    margin: 0;
    color: var(--text, #f1f5f9);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .room-info-foot {
    margin: 14px 0 0;
    font-size: 0.82rem;
  }
  .room-info-foot a {
    color: var(--accent);
    text-decoration: none;
  }
  .room-info-foot a:hover { text-decoration: underline; }

  .room-artists {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .room-artists li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.88rem;
  }
  .ra-name { color: var(--text, #f1f5f9); }
  .ra-count { color: var(--dim, #64748b); }

  .room-lb {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .room-lb li {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 10px;
    font-size: 0.88rem;
  }
  .lb-rank {
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
  }
  .lb-name {
    color: var(--text, #f1f5f9);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lb-score { color: var(--mid, #94a3b8); font-weight: 600; }
</style>
