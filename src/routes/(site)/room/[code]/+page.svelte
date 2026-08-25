<script>
  import { onMount } from 'svelte';
  import { modeRules } from '$lib/rooms/room-content.js';

  let { data } = $props();
  const { room, trackCount, artists, leaderboard } = data;
  const mode = modeRules(room.game_mode);

  let loggedUser   = $state(null);
  let guestName    = $state('');
  let guestError   = $state('');
  let joining      = $state(false);

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

  onMount(() => {
    const uid   = sessionStorage.getItem('zik_uid');
    const uname = sessionStorage.getItem('zik_uname');
    if (uid && uname) loggedUser = { uid, uname };
  });

  function joinAsLogged() {
    if (!loggedUser) return;
    joining = true;
    const p = new URLSearchParams({ roomId: room.code, username: loggedUser.uname, userId: loggedUser.uid, isGuest: '0', gameMode: room.game_mode || 'classic' });
    window.location.href = `/game?${p}`;
  }

  function joinAsGuest() {
    const name = guestName.trim();
    if (!name) { guestError = 'Entre un pseudo pour jouer.'; return; }
    if (name.length < 2 || name.length > 20) { guestError = 'Le pseudo doit faire entre 2 et 20 caractères.'; return; }
    guestError = '';
    joining = true;
    localStorage.setItem('zik_guest', name);
    const uid = 'guest_' + Date.now();
    sessionStorage.setItem('zik_uid', uid);
    sessionStorage.setItem('zik_uname', name);
    const p = new URLSearchParams({ roomId: room.code, username: name, userId: uid, isGuest: '1', gameMode: room.game_mode || 'classic' });
    window.location.href = `/game?${p}`;
  }
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

  <script type="application/ld+json">{@html jsonLd}</script>

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
    <div class="room-join-card">
      <h2 class="room-join-title">Rejoindre la room</h2>

      {#if loggedUser}
        <p class="room-join-sub">Connecté en tant que <strong>{loggedUser.uname}</strong></p>
        <button class="btn-room-join" onclick={joinAsLogged} disabled={joining}>
          {joining ? 'Connexion…' : '▶ Jouer maintenant'}
        </button>
        <p class="room-join-or">ou jouer en tant qu'invité ↓</p>
      {/if}

      <div class="room-guest-form">
        {#if !loggedUser}
          <p class="room-join-sub">Aucune inscription requise — entre juste un pseudo !</p>
        {/if}
        <input
          type="text"
          class="room-guest-input"
          bind:value={guestName}
          placeholder="Ton pseudo…"
          maxlength="20"
          disabled={joining}
          onkeydown={e => { if (e.key === 'Enter') joinAsGuest(); }}
        >
        {#if guestError}
          <p class="room-guest-error">{guestError}</p>
        {/if}
        <button class="btn-room-guest" onclick={joinAsGuest} disabled={joining || !guestName.trim()}>
          {joining ? 'Connexion…' : '→ Jouer en invité'}
        </button>
      </div>

      <p class="room-back-link">
        <a href="/rooms">← Voir toutes les rooms</a>
      </p>
    </div>
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
  .room-join-card {
    background: var(--surface, rgb(var(--c-glass) / 0.04));
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 20px;
    padding: 32px;
    width: 100%;
    max-width: 420px;
    text-align: center;
  }
  .room-join-title {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 20px;
  }
  .room-join-sub {
    font-size: 0.85rem;
    color: var(--mid, #94a3b8);
    margin-bottom: 14px;
  }
  .room-join-or {
    font-size: 0.78rem;
    color: var(--dim, #64748b);
    margin: 12px 0 16px;
  }
  .btn-room-join {
    width: 100%;
    background: var(--accent);
    border: none;
    color: var(--on-accent);
    font-size: 1rem;
    font-weight: 700;
    padding: 13px;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s, filter 0.15s;
    margin-bottom: 4px;
  }
  .btn-room-join:hover:not(:disabled) { filter: brightness(1.08); }
  .btn-room-join:disabled { opacity: 0.5; cursor: not-allowed; }

  .room-guest-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .room-guest-input {
    width: 100%;
    background: rgb(var(--c-glass) / 0.05);
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 10px;
    color: var(--text, #f1f5f9);
    font-size: 0.95rem;
    font-family: inherit;
    padding: 11px 14px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .room-guest-input:focus {
    border-color: rgb(var(--accent-rgb) / 0.45);
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.1);
  }
  .room-guest-error {
    font-size: 0.78rem;
    color: var(--danger);
    margin: 0;
  }
  .btn-room-guest {
    width: 100%;
    background: rgb(var(--c-glass) / 0.06);
    border: 1px solid rgb(var(--c-glass) / 0.12);
    color: var(--text, #f1f5f9);
    font-size: 0.9rem;
    font-weight: 600;
    padding: 11px;
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .btn-room-guest:hover:not(:disabled) { background: rgb(var(--c-glass) / 0.1); }
  .btn-room-guest:disabled { opacity: 0.4; cursor: not-allowed; }

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
