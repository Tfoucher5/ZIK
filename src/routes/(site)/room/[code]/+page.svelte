<script>
  import JsonLd from '$lib/components/ui/JsonLd.svelte';
  import RoomJoinCard from '$lib/components/rooms/RoomJoinCard.svelte';
  import RoomHero from '$lib/components/rooms/RoomHero.svelte';
  import RoomInfo from '$lib/components/rooms/RoomInfo.svelte';

  let { data } = $props();
  const { room, trackCount, artists, leaderboard } = data;

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

  <RoomHero {room} />

  <!-- Join card -->
  <div class="room-join-wrap">
    <RoomJoinCard gameMode={room.game_mode || 'classic'} getCode={async () => room.code}>
      <p class="room-back-link">
        <a href="/rooms">← Voir toutes les rooms</a>
      </p>
    </RoomJoinCard>
  </div>

  <RoomInfo {room} {trackCount} {artists} {leaderboard} />

</main>

<style>
  .room-landing {
    min-height: 100vh;
    padding-top: var(--nav-h, 64px);
  }
  .room-back-wrap {
    padding: 16px clamp(16px, 5vw, 80px) 0;
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

</style>
