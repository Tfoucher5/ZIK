<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { onMount } from "svelte";
  import { dicebear } from '$lib/utils.js';
  import HeroSection from '$lib/components/HeroSection.svelte';
  import GuestModal from '$lib/components/GuestModal.svelte';
  import TodayStrip from '$lib/components/TodayStrip.svelte';
  import { NEWS } from '$lib/news.js';

  let { data } = $props();

  const POSTER_COVERS = [
    'https://api.deezer.com/album/302127/image',
    'https://api.deezer.com/album/55483022/image',
    'https://api.deezer.com/album/526894/image',
    'https://api.deezer.com/album/1128639/image',
    'https://api.deezer.com/album/7290289/image',
    'https://api.deezer.com/album/141522612/image',
    'https://api.deezer.com/album/10088148/image',
    'https://api.deezer.com/album/527346/image',
    'https://api.deezer.com/album/41899162/image',
    'https://api.deezer.com/album/9769684/image',
  ];
  const COLLAGE_ROTS = [-2.5, 1.8, -1.2, 2.2, -0.8, 1.5, -3.1, 0.7, -1.8, 2.4];
  const COLLAGE_TY   = [0, -8, 5, -12, 7, -4, 2, 10, -6, 4];

  let rooms = $state(data.rooms ?? []);
  let totalOnline = $state(data.totalOnline ?? 0);
  let displayOnline = $state(0);
  let roomCodeVal = $state("");
  let roomCodeErr = $state("");
  let roomCodeLoading = $state(false);

  let roomsTab = $state('classic');
  let liveRooms = $derived([...rooms.filter(r => r.online > 0)].sort((a, b) => b.online - a.online));
  let tabRooms = $derived(rooms.filter(r => roomsTab === 'qcm' ? r.game_mode === 'qcm' : r.game_mode !== 'qcm'));
  let collageCards = $derived.by(() => {
    const sorted = [...tabRooms].sort((a, b) => (b.online || 0) - (a.online || 0));
    return sorted.slice(0, 10);
  });

  let eloLb = $state(data.eloLb ?? []);
  const weeklyChallenge = data.weeklyChallenge?.active ? data.weeklyChallenge : null;
  const latestNews = NEWS[0];
  let globalStats = $state(data.globalStats ?? { users: 0, gamesMonth: 0 });
  let guestOpen = $state(false);
  let pendingRoom = $state(null);
  let pendingGameMode = $state('classic');
  let _roomsTimer = null;

  $effect(() => {
    const target = totalOnline;
    if (target === 0) { displayOnline = 0; return; }
    let raf;
    const start = performance.now();
    const from = displayOnline;
    (function tick(now) {
      const p = Math.min((now - start) / 900, 1);
      displayOnline = Math.round(from + (target - from) * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    })(start);
    return () => cancelAnimationFrame(raf);
  });

  function reveal(node, delay = 0) {
    node.style.setProperty("--rd", `${delay}ms`);
    node.classList.add("will-reveal");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { node.classList.add("revealed"); io.disconnect(); }
      },
      { threshold: 0.07, rootMargin: "0px 0px -48px 0px" },
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  async function loadRooms() {
    clearTimeout(_roomsTimer);
    try {
      const res = await fetch("/api/rooms/official");
      const data = await res.json();
      rooms = data.rooms ?? data;
      totalOnline = data.totalOnline ?? rooms.reduce((s, r) => s + (r.online || 0), 0);
    } catch { rooms = []; }
    if (!document.hidden) _roomsTimer = setTimeout(loadRooms, 30_000);
  }

  async function loadStats() {
    try {
      const r = await fetch("/api/stats/global", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        globalStats = {
          users: d.users ?? 0,
          gamesMonth: d.gamesMonth ?? 0,
        };
      }
    } catch { /* réseau */ }
  }

  async function joinByCode() {
    roomCodeErr = "";
    const code = roomCodeVal.trim().toUpperCase();
    if (code.length < 4) { roomCodeErr = "Code invalide."; return; }
    roomCodeLoading = true;
    try {
      const r = await fetch(`/api/rooms/custom/${code}`);
      if (!r.ok) {
        const r2 = await fetch(`/api/rooms/${code}`);
        if (!r2.ok) throw new Error("Partie introuvable ou expirée. Vérifie le code.");
      }
      navigateToGame(code);
    } catch (e) {
      roomCodeErr = e.message;
    } finally {
      roomCodeLoading = false;
    }
  }

  function joinRoom(roomId, gameMode = 'classic') {
    const userId = sessionStorage.getItem("zik_uid");
    const name = sessionStorage.getItem("zik_uname");
    if (userId && name) navigateToGame(roomId, name, userId, false, gameMode);
    else openGuestModal(roomId, gameMode);
  }

  function navigateToGame(roomId, username, userId, isGuest, gameMode = 'classic') {
    if (!username) { openGuestModal(roomId, gameMode); return; }
    const p = new URLSearchParams({ roomId, username, userId: userId || "", isGuest: isGuest ? "1" : "0", gameMode });
    window.location.href = `/game?${p}`;
  }

  function openGuestModal(roomId, gameMode = 'classic') {
    pendingRoom = roomId;
    pendingGameMode = gameMode;
    guestOpen = true;
  }

  function confirmGuest(name) {
    guestOpen = false;
    navigateToGame(pendingRoom, name, null, true, pendingGameMode);
  }

  const jsonLd = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": ["WebApplication", "VideoGame"],
      "name": "ZIK — Blind Test Musical",
      "url": "https://www.zik-music.fr/",
      "description": "Jeu de blind test musical multijoueur en ligne. Identifiez les chansons avant tout le monde, importez vos playlists Deezer, et grimpez au classement ELO. Gratuit, sans installation.",
      "applicationCategory": "GameApplication",
      "genre": ["Music", "Quiz", "Trivia"],
      "operatingSystem": "Any",
      "browserRequirements": "Navigateur web moderne (Chrome, Firefox, Safari, Edge)",
      "inLanguage": "fr-FR",
      "isAccessibleForFree": true,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
      "featureList": [
        "Blind test musical multijoueur en temps réel",
        "Import de playlists Deezer",
        "Mode Salon Kahoot-like (QCM sur smartphone)",
        "Classement ELO et statistiques joueur",
        "Rooms privées avec code partageable",
        "Mode invité sans inscription",
        "Playlists personnalisées partageables",
        "Détection intelligente des réponses (accents, fautes de frappe)"
      ],
      "screenshot": "https://www.zik-music.fr/og.png?v=3.12.0",
      "author": { "@type": "Organization", "name": "ZIK", "url": "https://www.zik-music.fr" }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "ZIK",
      "url": "https://www.zik-music.fr/",
      "description": "Le blind test musical multijoueur gratuit en ligne.",
      "inLanguage": "fr-FR",
      "potentialAction": {
        "@type": "SearchAction",
        "target": { "@type": "EntryPoint", "urlTemplate": "https://www.zik-music.fr/rooms?q={search_term_string}" },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "ZIK",
      "url": "https://www.zik-music.fr/",
      "logo": "https://www.zik-music.fr/og.png?v=3.12.0",
      "sameAs": ["https://github.com/Tfoucher5/ZIK"]
    }
  ]);

  const faqJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "C'est quoi ZIK ?",
        "acceptedAnswer": { "@type": "Answer", "text": "ZIK est un jeu de blind test musical multijoueur gratuit, accessible dans le navigateur. Les joueurs écoutent des extraits musicaux et doivent identifier le titre et l'artiste le plus rapidement possible." }
      },
      {
        "@type": "Question",
        "name": "ZIK est-il gratuit ?",
        "acceptedAnswer": { "@type": "Answer", "text": "Oui, ZIK est entièrement gratuit. Aucun abonnement, aucun achat dans l'application." }
      },
      {
        "@type": "Question",
        "name": "Faut-il créer un compte pour jouer ?",
        "acceptedAnswer": { "@type": "Answer", "text": "Non. Le mode invité permet de rejoindre une partie immédiatement avec un pseudo. La création de compte est optionnelle et permet de sauvegarder ses scores et son classement ELO." }
      },
      {
        "@type": "Question",
        "name": "Comment fonctionne le classement ELO sur ZIK ?",
        "acceptedAnswer": { "@type": "Answer", "text": "Le système ELO de ZIK attribue des points en fonction des adversaires battus. Battre un joueur mieux classé rapporte plus de points. Ce classement évolue uniquement en Mode Classique." }
      },
      {
        "@type": "Question",
        "name": "Quelle est la différence entre le Mode Classique et le Mode QCM ?",
        "acceptedAnswer": { "@type": "Answer", "text": "En Mode Classique, les joueurs saisissent librement le titre et l'artiste — c'est le mode compétitif avec classement ELO. En Mode QCM, quatre propositions sont affichées et il faut choisir la bonne — plus accessible, sans ELO." }
      },
      {
        "@type": "Question",
        "name": "Comment fonctionne le Mode Salon ?",
        "acceptedAnswer": { "@type": "Answer", "text": "En Mode Salon, un hôte lance une session depuis son ordinateur ou sa TV. Les invités rejoignent depuis leur smartphone en entrant un code ou en scannant un QR code. La musique est diffusée uniquement depuis l'écran de l'hôte." }
      },
      {
        "@type": "Question",
        "name": "Puis-je importer mes playlists Deezer ?",
        "acceptedAnswer": { "@type": "Answer", "text": "Oui. ZIK permet l'import direct de playlists publiques Deezer en quelques clics." }
      },
      {
        "@type": "Question",
        "name": "ZIK fonctionne-t-il sur mobile ?",
        "acceptedAnswer": { "@type": "Answer", "text": "Oui. ZIK est conçu mobile-first. Le Mode Salon est particulièrement adapté aux smartphones pour les joueurs invités." }
      },
      {
        "@type": "Question",
        "name": "C'est quoi Zikle ?",
        "acceptedAnswer": { "@type": "Answer", "text": "Zikle est le mini-jeu quotidien de ZIK : une chanson à deviner en 6 essais, la même pour tous les joueurs, jouable sans compte. Un extrait de plus en plus long est révélé à chaque erreur." }
      },
      {
        "@type": "Question",
        "name": "Comment fonctionne le défi communautaire hebdomadaire ?",
        "acceptedAnswer": { "@type": "Answer", "text": "Chaque semaine, ZIK propose un objectif collectif (bonnes réponses, parties jouées ou victoires Zikle cumulées par tous les joueurs). Si l'objectif est atteint avant la fin de la semaine, tous les participants débloquent un succès, et le joueur ayant le plus contribué devient le top contributeur de la semaine." }
      },
      {
        "@type": "Question",
        "name": "Comment fonctionnent les succès sur ZIK ?",
        "acceptedAnswer": { "@type": "Answer", "text": "ZIK propose des succès à débloquer (séries de victoires, score cumulé, défis communautaires) avec des paliers bronze/argent/or selon les cas, visibles sur le profil de chaque joueur." }
      }
    ]
  });

  onMount(() => {
    loadRooms();
    loadStats();
    const statsTimer = setInterval(() => { if (!document.hidden) loadStats(); }, 60_000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) loadRooms();
    });
    return () => clearInterval(statsTimer);
  });
</script>

<svelte:head>
  <title>ZIK - Blind test en soirée sur la TV et multijoueur en ligne</title>
  <meta name="description" content="Le blind test de soirée : la TV diffuse la musique, chacun répond sur son téléphone, en solo ou en équipes. Aussi en ligne, avec tes playlists Deezer. Gratuit, sans appli." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/" />
  <meta property="og:title" content="ZIK - Le blind test de soirée sur la TV" />
  <meta property="og:description" content="La TV diffuse, les téléphones répondent. Équipes, classement en direct, podium, vos playlists Deezer. Aussi en ligne. Gratuit, sans appli." />
  <meta property="og:url" content="https://www.zik-music.fr/" />
  <meta name="twitter:title" content="ZIK - Le blind test de soirée sur la TV" />
  <meta name="twitter:description" content="La TV diffuse, les téléphones répondent. En équipes, avec vos playlists. Aussi en ligne. Gratuit, sans appli." />
  <JsonLd json={jsonLd} />
  <JsonLd json={faqJsonLd} />
</svelte:head>

<!-- ══════════════════════════════ HERO ══════════════════════════════ -->
<HeroSection
  badge={displayOnline > 0 ? `${displayOnline} joueurs en ligne` : null}
  gamesMonth={globalStats.gamesMonth}
  userCount={globalStats.users}
>
  <a href="/salon" class="btn-accent hero-cta">🎉 Organiser une soirée</a>
  <button class="btn-ghost hero-cta hero-online" onclick={() => document.getElementById('rooms')?.scrollIntoView({behavior:'smooth'})}>Jouer en ligne</button>
</HeroSection>

<!-- ══════════════════════════════ AUJOURD'HUI ══════════════════════════════ -->
<TodayStrip challenge={weeklyChallenge} onResume={(room) => joinRoom(room.id, room.gameMode)} />

<!-- ══════════════════════════════ COLLAGE — ROOMS ══════════════════════════════ -->
<section class="poster-wall" id="rooms">

  {#if liveRooms.length > 0}
    <div class="live-strip">
      <div class="live-strip-head">
        <h2 class="live-strip-title"><span class="live-strip-dot"></span>En direct</h2>
        <span class="live-strip-sub">{totalOnline} joueur{totalOnline > 1 ? 's' : ''} en ligne — rejoins une partie en cours</span>
      </div>
      <div class="live-strip-row">
        {#each liveRooms.slice(0, 6) as room, i (room.id)}
          <button
            class="live-card"
            class:featured={i === 0}
            onclick={() => joinRoom(room.id, room.game_mode)}
          >
            <div class="live-card-img" style="background-image:url('{room.cover_url ?? POSTER_COVERS[i % POSTER_COVERS.length]}')"></div>
            <div class="live-card-body">
              <span class="live-card-mode">{room.game_mode === 'qcm' ? 'QCM' : 'Classique'}</span>
              <span class="live-card-name">{room.emoji} {room.name}</span>
              <span class="live-card-count"><i></i>{room.online} joueur{room.online > 1 ? 's' : ''} en jeu</span>
            </div>
            <span class="live-card-join">Rejoindre →</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="pw-head">
    <div class="pw-head-left">
      <h2 class="pw-title">Jouer <em>en ligne</em></h2>
      {#if totalOnline > 0 && liveRooms.length === 0}
        <span class="pw-live">● {totalOnline} en ligne</span>
      {/if}
      <p class="pw-sub">Choisis une room par thème et joue contre les autres joueurs, sans inscription.</p>
    </div>
    <div class="pw-mode">
      <div class="pw-tabs" role="tablist" aria-label="Mode de jeu">
        <button role="tab" aria-selected={roomsTab === 'classic'} class:active={roomsTab === 'classic'} onclick={() => roomsTab = 'classic'}>Classique</button>
        <button role="tab" aria-selected={roomsTab === 'qcm'} class:active={roomsTab === 'qcm'} onclick={() => roomsTab = 'qcm'}>QCM</button>
      </div>
      <p class="pw-mode-help">
        {roomsTab === 'qcm' ? 'QCM : choisis parmi 4 réponses.' : 'Classique : tape le titre ou l’artiste.'}
      </p>
    </div>
  </div>

  {#if tabRooms.length > 0}
    <div class="collage-grid">
      {#each collageCards as room, i (room.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
        <div
          class="cc"
          class:cc--live={room.online > 0}
          style="--rot:{COLLAGE_ROTS[i % COLLAGE_ROTS.length]}deg; --ty:{COLLAGE_TY[i % COLLAGE_TY.length]}px"
          role="button"
          tabindex="0"
          onclick={() => joinRoom(room.id, room.game_mode)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && joinRoom(room.id, room.game_mode)}
          use:reveal={i * 50}
        >
          <div class="cc-img" style="background-image:url('{room.cover_url ?? POSTER_COVERS[i % POSTER_COVERS.length]}')">
            {#if room.online > 0}
              <span class="cc-live-badge">● Live</span>
            {/if}
          </div>
          <div class="cc-info">
            <div class="cc-name">{room.emoji} {room.name}</div>
            <div class="cc-status" class:cc-status--live={room.online > 0}>
              {room.online > 0 ? `${room.online} joueur${room.online > 1 ? 's' : ''} en jeu` : 'Lance la partie →'}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="collage-empty"><p>{rooms.length === 0 ? 'Chargement des rooms…' : 'Aucune room dans ce mode pour le moment.'}</p></div>
  {/if}

  <div class="pw-cta-wrap">
    <a href="/rooms" class="pw-cta">Voir toutes les rooms →</a>
  </div>
</section>


<!-- ══════════════════════════════ TICKET — CODE PRIVÉ ══════════════════════════════ -->
<section class="ticket-section" use:reveal>
  <div class="ticket-left">
    <span class="ticket-kicker">Partie privée en ligne</span>
    <h2 class="ticket-title">T'as un code&nbsp;?<br>Entre-le.</h2>
    <p class="ticket-hint">Code affiché sur une TV&nbsp;? C'est une soirée : <a href="/salon/play">rejoindre une soirée →</a></p>
    <div class="quick-links">
      <a href="/rooms" class="ql">Rooms</a>
      <a href="/classements" class="ql">Classements</a>
      <a href="/playlists" class="ql">Playlists</a>
      <a href="/salon" class="ql">Mode Salon</a>
      <a href="https://discord.gg/Xkr9aUEKYf" target="_blank" rel="noopener noreferrer" class="ql ql-discord">Discord</a>
    </div>
  </div>

  <div class="ticket">
    <div class="stub">
      <span class="stub-logo">ZIK<em>.</em></span>
      <span class="stub-label">Billet d'entrée</span>
    </div>
    <div class="ticket-main">
      <div class="ticket-event">Blind Test</div>
      <div class="ticket-venue">ZIK · Partie en ligne</div>
      <label class="ticket-code-label" for="ticket-code-input">Code de partie en ligne</label>
      <div class="ticket-row">
        <input
          id="ticket-code-input"
          class="ticket-input"
          type="text"
          bind:value={roomCodeVal}
          placeholder="ABC123"
          maxlength="6"
          autocomplete="off"
          spellcheck="false"
          oninput={(e) => { roomCodeVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); }}
          onkeypress={(e) => { if (e.key === 'Enter') joinByCode(); }}
        />
        <button class="ticket-go" onclick={joinByCode} disabled={roomCodeLoading} >
          {#if roomCodeLoading}…{:else}Rejoindre →{/if}
        </button>
      </div>
      {#if roomCodeErr}<p class="ticket-err">{roomCodeErr}</p>{/if}
    </div>
  </div>
</section>

<!-- ══════════════════════════════ FEATURES ══════════════════════════════ -->
<section class="features" use:reveal>
  <h2 class="feat-title">Tout <em>ZIK</em>, en un coup d'œil</h2>
  <div class="feat-grid">
    <a href="/salon" class="feat-item">
      <span class="feat-tag">Grand écran + téléphones</span>
      <div class="feat-name">Mode Salon</div>
      <p class="feat-desc">La musique passe sur la TV, chaque invité répond depuis son téléphone. Sans appli, sans compte pour les joueurs.</p>
      <span class="feat-go">Organiser une soirée →</span>
    </a>
    <a href="/zikle" class="feat-item">
      <span class="feat-tag">Chaque jour · Sans compte</span>
      <div class="feat-name">Zikle</div>
      <p class="feat-desc">Une chanson du jour à deviner en 6 essais, la même pour tout le monde. Enchaîne les jours pour faire grimper ta série.</p>
      <span class="feat-go">Jouer au Zikle →</span>
    </a>
    <a href="/playlists" class="feat-item">
      <span class="feat-tag">Deezer</span>
      <div class="feat-name">Tes playlists</div>
      <p class="feat-desc">Importe tes playlists Deezer ou pioche dans celles de la communauté, puis lance une partie avec.</p>
      <span class="feat-go">Voir les playlists →</span>
    </a>
    <a href="/classements" class="feat-item">
      <span class="feat-tag">Classement · Défi · Succès</span>
      <div class="feat-name">Progresse</div>
      <p class="feat-desc">Avec un compte gratuit : classement ELO, défi collectif chaque semaine, succès à débloquer et amis à défier.</p>
      <span class="feat-go">Voir les classements →</span>
    </a>
  </div>
</section>

<!-- ══════════════════════════════ CHART — TOP JOUEURS ══════════════════════════════ -->
<section class="chart" id="leaderboards" use:reveal>
  <div class="chart-head">
    <div>
      <h2 class="chart-h">Top Joueurs</h2>
      <span class="chart-sub">Niveau ELO actuel · Rooms en ligne</span>
    </div>
  </div>

  {#if eloLb.length === 0}
    <p class="chart-empty">Chargement…</p>
  {:else}
    {#each eloLb.slice(0, 5) as p, i (p.username)}
      <a href="/user/{p.username}" class="chart-row">
        <span class="chart-pos" class:top3={i < 3}>{i + 1}</span>
        <img class="chart-avatar" src={p.avatar_url || dicebear(p.username)} alt={p.username} width="32" height="32" loading="lazy" decoding="async" />
        <div class="chart-info">
          <div class="c-nm">{p.username}</div>
          <div class="c-sb">{p.games_played} partie{p.games_played !== 1 ? 's' : ''}</div>
        </div>
        <div class="chart-elo">{p.elo}<small title="Score de niveau : il monte quand tu bats des joueurs mieux classés">pts ELO ⓘ</small></div>
      </a>
    {/each}
  {/if}

  <div class="chart-cta-wrap">
    <a href="/classements" class="chart-cta">Classement complet →</a>
  </div>
</section>

<!-- ══════════════════════════════ NOUVEAUTÉS TEASER ══════════════════════════════ -->
{#if latestNews}
<a href="/nouveautes" class="news-teaser" use:reveal>
  <span class="news-teaser-badge"><span class="news-teaser-dot" aria-hidden="true"></span>Quoi de neuf</span>
  <span class="news-teaser-title">{latestNews.title}</span>
  <span class="news-teaser-cta">Voir les nouveautés →</span>
</a>
{/if}

<!-- ══════════════════════════════ FAQ ══════════════════════════════ -->
<section class="faq-section" id="faq" use:reveal>
  <h2 class="faq-title">Questions fréquentes</h2>
  <div class="faq-list">
    <details class="faq-item">
      <summary class="faq-q">C'est quoi ZIK ?</summary>
      <p class="faq-a">ZIK est un jeu de blind test musical multijoueur gratuit, accessible dans le navigateur. Les joueurs écoutent des extraits musicaux et doivent identifier le titre et l'artiste le plus rapidement possible.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">ZIK est-il gratuit ?</summary>
      <p class="faq-a">Oui, ZIK est entièrement gratuit. Aucun abonnement, aucun achat dans l'application.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Faut-il créer un compte pour jouer ?</summary>
      <p class="faq-a">Non. Le mode invité permet de rejoindre une partie immédiatement avec un pseudo. La création de compte est optionnelle et permet de sauvegarder ses scores et son classement ELO.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Comment fonctionne le classement ELO sur ZIK ?</summary>
      <p class="faq-a">Le système ELO de ZIK attribue des points en fonction des adversaires battus. Battre un joueur mieux classé rapporte plus de points. Ce classement évolue uniquement en Mode Classique.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Quelle est la différence entre le Mode Classique et le Mode QCM ?</summary>
      <p class="faq-a">En Mode Classique, les joueurs saisissent librement le titre et l'artiste — c'est le mode compétitif avec classement ELO. En Mode QCM, quatre propositions sont affichées et il faut choisir la bonne — plus accessible, sans ELO.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Comment fonctionne le Mode Salon ?</summary>
      <p class="faq-a">En Mode Salon, un hôte lance une session depuis son ordinateur ou sa TV. Les invités rejoignent depuis leur smartphone en entrant un code ou en scannant un QR code. La musique est diffusée uniquement depuis l'écran de l'hôte.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Puis-je importer mes playlists Deezer ?</summary>
      <p class="faq-a">Oui. ZIK permet l'import direct de playlists publiques Deezer en quelques clics. Il est aussi possible de créer des playlists manuellement sur le site.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">ZIK fonctionne-t-il sur mobile ?</summary>
      <p class="faq-a">Oui. ZIK est conçu mobile-first. Le Mode Salon est particulièrement adapté aux smartphones pour les joueurs invités.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">C'est quoi Zikle ?</summary>
      <p class="faq-a">Zikle est le mini-jeu quotidien de ZIK : une chanson à deviner en 6 essais, la même pour tous les joueurs, jouable sans compte. Un extrait de plus en plus long est révélé à chaque erreur.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Comment fonctionne le défi communautaire hebdomadaire ?</summary>
      <p class="faq-a">Chaque semaine, ZIK propose un objectif collectif (bonnes réponses, parties jouées ou victoires Zikle cumulées par tous les joueurs). Si l'objectif est atteint avant la fin de la semaine, tous les participants débloquent un succès, et le joueur ayant le plus contribué devient le top contributeur de la semaine.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Comment fonctionnent les succès sur ZIK ?</summary>
      <p class="faq-a">ZIK propose des succès à débloquer (séries de victoires, score cumulé, défis communautaires) avec des paliers bronze/argent/or selon les cas, visibles sur le profil de chaque joueur.</p>
    </details>
  </div>
</section>


<!-- ══════════════════════════════ GUEST MODAL ══════════════════════════════ -->
<GuestModal open={guestOpen} onClose={() => guestOpen = false} onConfirm={confirmGuest} />

<style>
  /* ════════════════════════════ HERO ════════════════════════════ */
  .hero-cta { padding: 14px 26px; font-size: 0.95rem; }
  .hero-online { color: var(--text); border: 2px solid var(--text); }

  /* ════════════════════════════ POSTER WALL ════════════════════════════ */
  .poster-wall {
    padding: 72px 0 80px;
    background: var(--bg);
    position: relative;
  }

  /* ── Live strip — rooms en cours ── */
  .live-strip {
    margin: 0 48px 56px;
    border: 1px solid rgb(var(--accent-rgb) / 0.3);
    background:
      radial-gradient(ellipse at 0% 0%, rgb(var(--accent-rgb) / 0.08) 0%, transparent 55%),
      var(--bg2);
    padding: 24px 24px 28px;
    position: relative;
  }
  .live-strip::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent);
  }
  .live-strip-head {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .live-strip-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.6rem, 3.5vw, 2.4rem);
    text-transform: uppercase;
    letter-spacing: -0.5px;
    line-height: 1;
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .live-strip-dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    background: var(--accent);
    animation: live-pulse 1.6s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes live-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgb(var(--accent-rgb) / 0.5); }
    50%      { box-shadow: 0 0 0 8px rgb(var(--accent-rgb) / 0); }
  }
  .live-strip-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--mid);
  }
  .live-strip-row {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    padding-bottom: 6px;
    scrollbar-width: thin;
  }
  .live-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 18px 12px 12px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    cursor: pointer;
    flex-shrink: 0;
    min-width: 260px;
    text-align: left;
    color: var(--text);
    transition: border-color 0.15s, background 0.15s, transform 0.15s;
  }
  .live-card:hover {
    border-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.07);
    transform: translateY(-3px);
  }
  .live-card.featured {
    border-width: 2px;
    border-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.06);
    min-width: 300px;
  }
  .live-card-img {
    width: 58px; height: 58px;
    background: #222;
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
  }
  .live-card.featured .live-card-img { width: 72px; height: 72px; }
  .live-card-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .live-card-mode {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.52rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--dim);
  }
  .live-card-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: -0.2px;
    line-height: 1.05;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .live-card.featured .live-card-name { font-size: 1.3rem; }
  .live-card-count {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .live-card-count i {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: live-pulse 1.6s ease-in-out infinite;
  }
  .live-card-join {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--on-accent);
    background: var(--accent);
    padding: 7px 14px;
    margin-left: auto;
    flex-shrink: 0;
  }

  /* ── Onglets Classique / QCM ── */
  .pw-tabs {
    display: inline-flex;
    border: 1px solid rgb(var(--c-glass) / 0.18);
  }
  .pw-tabs button {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    padding: 10px 26px;
    background: none;
    border: none;
    color: var(--dim);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .pw-tabs button.active {
    background: var(--accent);
    color: var(--on-accent);
  }
  .pw-tabs button:not(.active):hover { color: var(--text); }
  .pw-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 48px;
    margin-bottom: 48px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .pw-head-left { display: flex; align-items: baseline; gap: 8px 16px; flex-wrap: wrap; }
  .pw-sub { flex-basis: 100%; font-size: 1rem; color: var(--mid); }
  .pw-mode { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
  .pw-mode-help { font-size: 0.9rem; color: var(--mid); }
  .pw-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    text-transform: uppercase;
    letter-spacing: -1px;
    line-height: 1;
  }
  .pw-title em {
    -webkit-text-stroke: 2px var(--text);
    color: transparent;
    font-style: normal;
  }
  .pw-live {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--accent);
  }

  /* ── Collage grid ── */
  .collage-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 24px;
    padding: 16px 56px 32px;
  }
  .collage-empty {
    padding: 40px 48px;
    color: var(--mid);
    font-size: 0.85rem;
  }

  .cc {
    transform: rotate(var(--rot, 0deg)) translateY(var(--ty, 0px));
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    cursor: pointer;
    background: #fafafa;
    box-shadow: 4px 8px 24px rgba(0,0,0,0.3);
    position: relative;
    z-index: 1;
  }
  .cc:hover {
    transform: rotate(0deg) translateY(-6px) scale(1.05);
    z-index: 10;
    box-shadow: 6px 14px 36px rgba(0,0,0,0.4);
  }
  .cc--live {
    box-shadow: 0 0 0 2px var(--accent), 4px 8px 24px rgba(0,0,0,0.3);
  }
  .cc--live:hover {
    box-shadow: 0 0 0 2px var(--accent), 6px 14px 36px rgb(var(--accent-rgb) / 0.25);
  }
  .cc-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    background: #222;
    background-size: cover;
    background-position: center;
    position: relative;
    display: block;
  }
  .cc-live-badge {
    position: absolute;
    top: 8px; left: 8px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.5rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 3px 8px;
  }

  .cc-info {
    background: #fafafa;
    padding: 9px 11px 12px;
    border-top: 2px solid #080808;
  }
  .cc-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: -0.2px;
    line-height: 1.05;
    color: #080808;
  }
  .cc-status {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(0,0,0,0.62);
    margin-top: 4px;
  }
  .cc-status--live { color: #a21caf; }

  .pw-cta-wrap {
    padding: 40px 48px 0;
    display: flex;
    justify-content: center;
  }
  .pw-cta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--on-accent);
    background: var(--accent);
    border: 2px solid var(--accent);
    padding: 14px 48px;
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
    display: inline-block;
  }
  .pw-cta:hover { background: transparent; color: var(--accent); }

  /* ════════════════════════════ FEATURES ════════════════════════════ */
  .features {
    padding: 72px 48px;
    background: var(--bg);
    border-top: 1px solid rgb(var(--c-glass) / 0.05);
  }
  .feat-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2rem, 4vw, 3rem);
    text-transform: uppercase;
    letter-spacing: -1px;
    margin-bottom: 48px;
  }
  .feat-title em { color: var(--accent); font-style: normal; }
  .feat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 2px;
  }
  .feat-item {
    display: flex;
    flex-direction: column;
    padding: 28px 24px;
    border: 1px solid rgb(var(--c-glass) / 0.1);
    transition: border-color 0.15s, background 0.15s;
  }
  .feat-item:hover {
    border-color: rgb(var(--accent-rgb) / 0.45);
    background: rgb(var(--accent-rgb) / 0.04);
  }
  .feat-desc {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--mid);
    margin-top: 10px;
    flex: 1;
  }
  .feat-go {
    margin-top: 16px;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--accent);
  }
  .feat-item:hover .feat-go { text-decoration: underline; text-underline-offset: 3px; }
  .feat-tag {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--accent);
    display: block;
    margin-bottom: 8px;
  }
  .feat-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    text-transform: uppercase;
    letter-spacing: -0.2px;
    line-height: 1.05;
  }

  /* ════════════════════════════ CHART ════════════════════════════ */
  .chart {
    padding: 72px 48px;
    background: var(--bg);
    border-top: 1px solid rgb(var(--c-glass) / 0.04);
    position: relative;
    overflow: hidden;
  }
  .chart::before {
    content: 'ZIK.';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-8deg);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 28vw;
    color: transparent;
    -webkit-text-stroke: 2px rgb(var(--accent-rgb) / 0.14);
    pointer-events: none;
    letter-spacing: -0.04em;
    line-height: 1;
    white-space: nowrap;
  }
  .chart-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 4px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .chart-h {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2rem, 5vw, 3.5rem);
    text-transform: uppercase;
    letter-spacing: -1px;
  }
  .chart-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--accent);
    margin-bottom: 36px;
    display: block;
  }
  .chart-empty { color: var(--mid); font-size: 0.85rem; padding: 24px 0; }

  .chart-cta-wrap {
    padding: 40px 0 0;
    display: flex;
    justify-content: center;
  }
  .chart-cta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text);
    background: transparent;
    border: 2px solid rgb(var(--c-glass) / 0.25);
    padding: 14px 48px;
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    display: inline-block;
    position: relative;
    z-index: 1;
  }
  .chart-cta:hover { border-color: var(--accent); color: var(--accent); }
  .chart-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    background: #222;
    flex-shrink: 0;
  }
  .chart-row {
    display: grid;
    grid-template-columns: 56px 36px 1fr 110px;
    gap: 16px;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid rgb(var(--c-glass) / 0.05);
    cursor: pointer;
    position: relative;
    text-decoration: none;
    color: inherit;
    transition: color 0.15s;
  }
  .chart-row::after {
    content: '';
    position: absolute;
    left: 0; bottom: 0; right: 0; height: 1px;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.25s;
  }
  .chart-row:hover::after { transform: scaleX(1); }
  .chart-pos {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2.8rem;
    line-height: 1;
    color: rgb(var(--c-glass) / 0.5);
    letter-spacing: -1px;
  }
  .top3 { color: var(--accent) !important; }
  .chart-info { min-width: 0; }
  .c-nm {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.25rem;
    text-transform: uppercase;
    letter-spacing: -0.2px;
  }
  .c-sb {
    font-size: 0.8rem;
    color: var(--mid);
  }
  .chart-elo {
    text-align: right;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.8rem;
    letter-spacing: -0.5px;
  }
  .chart-elo small {
    font-size: 0.72rem;
    color: var(--mid);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    display: block;
    cursor: help;
  }

  /* ════════════════════════════ TICKET ════════════════════════════ */
  .ticket-section {
    padding: 72px 48px;
    background: var(--bg);
    border-top: 1px solid rgb(var(--c-glass) / 0.04);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 72px;
    align-items: center;
  }
  .ticket-left {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .ticket-kicker {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: var(--accent);
    display: block;
  }
  .ticket-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.2rem, 5vw, 4.5rem);
    text-transform: uppercase;
    letter-spacing: -1.5px;
    line-height: 0.9;
  }
  .ticket-hint { font-size: 0.95rem; color: var(--mid); }
  .ticket-hint a { color: var(--accent); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .quick-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ql {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgb(var(--c-glass) / 0.75);
    text-decoration: none;
    border: 1px solid rgb(var(--c-glass) / 0.2);
    padding: 8px 18px;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    background: rgb(var(--c-glass) / 0.03);
  }
  .ql:hover { color: var(--text); border-color: rgb(var(--c-glass) / 0.5); background: rgb(var(--c-glass) / 0.07); }
  .ql-discord { color: #7289da; border-color: rgba(114,137,218,0.4); background: rgba(114,137,218,0.06); }
  .ql-discord:hover { color: var(--text); border-color: rgba(114,137,218,0.8); background: rgba(114,137,218,0.15); }
  .ticket {
    background: var(--bg2);
    border: 1px solid rgb(var(--c-glass) / 0.1);
    position: relative;
    overflow: hidden;
  }
  .ticket::before {
    content: '';
    position: absolute;
    top: 0; left: 172px; bottom: 0; width: 1px;
    background: repeating-linear-gradient(
      to bottom,
      rgb(var(--c-glass) / 0.12) 0, rgb(var(--c-glass) / 0.12) 5px,
      transparent 5px, transparent 11px
    );
  }
  .stub {
    position: absolute;
    top: 0; left: 0; bottom: 0; width: 172px;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 20px;
  }
  .stub-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2rem;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    letter-spacing: 0.1em;
  }
  .stub-logo em { color: var(--accent); font-style: normal; }
  .stub-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.52rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--dim);
    writing-mode: vertical-rl;
  }
  .ticket-main { padding: 28px 28px 28px 200px; }
  .ticket-event {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.8rem;
    text-transform: uppercase;
    letter-spacing: -0.3px;
    margin-bottom: 2px;
  }
  .ticket-venue {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--mid);
    margin-bottom: 22px;
  }
  .ticket-code-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--accent);
    display: block;
    margin-bottom: 5px;
  }
  .ticket-row { display: flex; }
  .ticket-input {
    flex: 1;
    background: transparent;
    border: 1px solid rgb(var(--c-glass) / 0.12);
    border-right: none;
    padding: 12px 16px;
    color: var(--text);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    outline: none;
    transition: border-color 0.2s;
  }
  .ticket-input:focus { border-color: rgb(var(--accent-rgb) / 0.5); }
  .ticket-input::placeholder { color: var(--dim); }
  .ticket-go {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--on-accent);
    background: var(--accent);
    border: none;
    padding: 12px 20px;
    white-space: nowrap;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .ticket-go:disabled { opacity: 0.5; cursor: not-allowed; }
  .ticket-err { font-size: 0.72rem; color: var(--danger); margin-top: 6px; }

  /* ════════════════════════════ NOUVEAUTÉS TEASER ════════════════════════════ */
  .news-teaser {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin: 40px 48px 0;
    padding: 20px 24px;
    border: 1px solid rgb(var(--c-glass) / 0.1);
    background: rgb(var(--c-glass) / 0.02);
    transition: border-color 0.15s, background 0.15s;
  }
  .news-teaser:hover {
    border-color: rgb(var(--accent-rgb) / 0.3);
    background: rgb(var(--accent-rgb) / 0.03);
  }
  .news-teaser-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent);
    flex-shrink: 0;
  }
  .news-teaser-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }
  .news-teaser-title {
    font-weight: 600;
    font-size: 0.92rem;
    flex: 1;
    min-width: 0;
  }
  .news-teaser-cta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--mid);
    flex-shrink: 0;
  }
  .news-teaser:hover .news-teaser-cta { color: var(--accent); }

  /* ════════════════════════════ FAQ ════════════════════════════ */
  .faq-section {
    padding: 72px clamp(20px, 5vw, 72px);
    /* width explicite : flex item (body) + margin auto ⇒ sinon largeur au contenu, les encadrés bougent à l'ouverture */
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
  }
  .faq-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
    text-transform: uppercase;
    letter-spacing: -0.5px;
    margin-bottom: 32px;
  }
  .faq-list { display: flex; flex-direction: column; gap: 8px; }
  .faq-item {
    background: rgb(var(--c-glass) / 0.02);
    border: 1px solid var(--border);
    overflow: hidden;
    transition: border-color 0.15s;
  }
  .faq-item[open] { border-color: var(--border2); }
  .faq-q {
    font-size: 0.9rem;
    font-weight: 700;
    padding: 16px 20px;
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .faq-q::after { content: '+'; font-size: 1.1rem; color: var(--accent); flex-shrink: 0; }
  .faq-item[open] .faq-q::after { content: '−'; }
  .faq-a { font-size: 0.84rem; color: var(--mid); line-height: 1.65; padding: 0 20px 16px; margin: 0; }


  /* ════════════════════════════ RESPONSIVE ════════════════════════════ */
  @media (max-width: 900px) {
    .pw-head { padding: 0 24px; }
    .live-strip { margin: 0 24px 44px; padding: 20px 16px 22px; }
    .collage-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px 24px 24px; }
    .pw-cta-wrap { padding: 28px 24px 0; }
    .features { padding: 48px 24px; }
    .feat-grid { grid-template-columns: repeat(2, 1fr); }
    .chart { padding: 48px 24px; }
    .ticket-section { padding: 48px 24px; grid-template-columns: 1fr; gap: 36px; }
    .news-teaser { margin: 32px 24px 0; }
    .faq-section { padding: 48px 24px; }
  }

  @media (max-width: 600px) {
    .pw-head { padding: 0 16px; }
    .live-strip { margin: 0 16px 40px; }
    .live-card, .live-card.featured { min-width: min(86vw, 320px); }
    .pw-mode { width: 100%; align-items: stretch; }
    .pw-tabs { width: 100%; }
    .pw-tabs button { flex: 1; padding: 12px 0; }
    .collage-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; padding: 14px 16px 28px; }
    .cc { --rot: 0deg; --ty: 0px; }
    .pw-cta-wrap { padding: 32px 16px 0; }
    .pw-cta { width: 100%; text-align: center; }
    .features { padding: 60px 16px; }
    .feat-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .feat-name { font-size: 1.1rem; }
    .chart { padding: 60px 16px; }
    .chart-row { grid-template-columns: 40px 28px 1fr 80px; gap: 10px; padding: 18px 0; }
    .chart-avatar { width: 28px; height: 28px; }
    .ticket-section { padding: 60px 16px; }
    .ticket::before { display: none; }
    .ticket-main { padding: 20px; }
    .stub { display: none; }
    .ticket-row { flex-direction: column; gap: 10px; }
    .ticket-input { border-right: 1px solid rgb(var(--c-glass) / 0.12); text-align: center; }
    .ticket-go { padding: 14px 20px; }
    .faq-section { padding: 60px 16px; }
    .faq-list { gap: 10px; }
    .faq-a { line-height: 1.75; }
  }

  @media (max-width: 380px) {
    .collage-grid { grid-template-columns: 1fr; gap: 10px; }
  }
</style>
