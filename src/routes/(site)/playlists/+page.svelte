<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { onMount, getContext } from 'svelte';
  import PlaylistHeader from '$lib/components/playlist/PlaylistHeader.svelte';
  import PlaylistNav from '$lib/components/playlist/PlaylistNav.svelte';
  import PlaylistTracks from '$lib/components/playlist/PlaylistTracks.svelte';
  import AddPanel from '$lib/components/playlist/AddPanel.svelte';
  import PlaylistFormModal from '$lib/components/playlist/PlaylistFormModal.svelte';
  import RoomLaunchModal from '$lib/components/playlist/RoomLaunchModal.svelte';
  import AnswersModal from '$lib/components/playlist/AnswersModal.svelte';
  import { PlaylistStore } from '$lib/components/playlist/playlistStore.svelte.js';
  import { handleSpotifyCallback } from '$lib/components/playlist/spotify.js';
  import { player } from '$lib/components/playlist/previewPlayer.svelte.js';
  import { toast } from '$lib/toast.svelte.js';
  import { breadcrumb } from '$lib/seo.js';

  const breadcrumbJsonLd = breadcrumb([{ name: 'Playlists', path: '/playlists' }]);
  const playlistsJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Playlists de Blind Test — ZIK",
    "description": "Créez vos playlists de blind test : recherche instantanée, collage d'une liste de titres, import Deezer, suggestions, écoute et choix de la version de chaque titre.",
    "url": "https://www.zik-music.fr/playlists",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" }
  });

  const _ctx = getContext('zik');
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);

  const store = new PlaylistStore(_ctx.sb, () => _ctx.user);

  let formOpen = $state(false);
  let formPlaylist = $state(null);
  let roomOpen = $state(false);
  let answersTrack = $state(null);
  let addOpen = $state(false);

  onMount(() => {
    handleSpotifyCallback(_ctx.spotifyClientId)
      .then((ok) => { if (ok) toast('Spotify connecté !', 'success'); })
      .catch((e) => toast('Erreur Spotify : ' + e.message, 'error'));
    return () => player.stop();
  });

  let loadedUid = null;
  $effect(() => {
    const uid = user?.id;
    if (uid && uid !== loadedUid) { loadedUid = uid; store.load(); }
    if (authReady && !uid) store.loading = false;
  });

  // Feuille d'ajout plein écran sur mobile : la page derrière ne défile plus.
  $effect(() => {
    if (!addOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  });

  function openForm(pl = null) {
    formPlaylist = pl;
    formOpen = true;
  }

  function openAdd() {
    store.sessionAdded = 0;
    addOpen = true;
    setTimeout(() => document.querySelector('.studio-add .add-input')?.focus(), 50);
  }
</script>

<svelte:head>
  <title>Playlists de Blind Test - Créer &amp; Importer depuis Deezer | ZIK</title>
  <meta name="description" content="Créez vos playlists de blind test en quelques secondes : recherche instantanée, collage d'une liste de titres, import Deezer, suggestions et choix de la version jouée. Gratuit." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/playlists" />

  <meta property="og:title" content="Playlists de Blind Test - Import Deezer | ZIK" />
  <meta property="og:description" content="Créez vos playlists de blind test : recherche instantanée, collage d'une liste, import Deezer et choix de la version de chaque titre. Gratuit." />
  <meta property="og:url" content="https://www.zik-music.fr/playlists" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Playlists de Blind Test | ZIK" />
  <meta name="twitter:description" content="Importez vos playlists Deezer et jouez au blind test avec vos musiques. Gratuit." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />

  <JsonLd json={playlistsJsonLd} />
  <JsonLd json={breadcrumbJsonLd} />
</svelte:head>

<header class="page-head compact">
  <div class="page-head-inner">
    <h1 class="page-head-title">Playlists</h1>
    <p class="page-head-sub">Tape un titre, colle une liste ou un lien Deezer : ta playlist de blind test se remplit en quelques secondes.</p>
  </div>
</header>

<div class="studio-wrap">
  {#if !user && !authReady}
    <p class="studio-msg">Chargement...</p>
  {:else if !user}
    <div class="studio-wall">
      <p>Connecte-toi pour créer tes playlists.</p>
      <div class="studio-wall-btns">
        <button class="btn-ghost" onclick={() => _ctx.openAuthModal('login')}>Se connecter</button>
        <button class="btn-accent" onclick={() => _ctx.openAuthModal('register')}>Créer un compte</button>
      </div>
    </div>
  {:else if store.loading}
    <p class="studio-msg">Chargement...</p>
  {:else if !store.playlists.length}
    <div class="studio-wall">
      <p>Pas encore de playlist. Donne-lui un nom, on s'occupe du reste.</p>
      <button class="btn-accent" onclick={() => openForm()}>Créer ma première playlist</button>
    </div>
  {:else}
    <div class="studio-shell">
      <div class="studio-nav">
        <PlaylistNav {store} onCreate={() => openForm()} />
      </div>
      <div class="studio-main">
        <PlaylistHeader {store} onSettings={() => openForm(store.current)} onLaunch={() => roomOpen = true} />
        <div class="studio">
          <div class="studio-tracks">
            <PlaylistTracks {store} onEditAnswers={(t) => answersTrack = t} />
          </div>
          <aside class="studio-add" class:open={addOpen} aria-label="Ajouter des titres">
            <AddPanel {store} onClose={() => { addOpen = false; player.stop(); }} />
          </aside>
        </div>
      </div>
    </div>

    {#if !addOpen}
      <button class="studio-fab" onclick={openAdd}>+ Ajouter des titres</button>
    {/if}
  {/if}
</div>

<PlaylistFormModal open={formOpen} playlist={formPlaylist} {store} onClose={() => formOpen = false} />
{#if store.current}
  <RoomLaunchModal open={roomOpen} playlist={store.current} tracks={store.tracks} {user} onClose={() => roomOpen = false} />
{/if}
<AnswersModal track={answersTrack} {store} onClose={() => answersTrack = null} />

<style>
  .page-head.compact { padding-bottom: 22px; }
  .compact .page-head-inner { max-width: 1840px; }
  .compact .page-head-title { font-size: clamp(2.4rem, 5vw, 3.6rem); letter-spacing: -1px; }
  .compact .page-head-sub { font-size: 0.9rem; }

  .studio-wrap { width: 100%; box-sizing: border-box; max-width: 1840px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 72px) 48px; }
  .studio-msg { padding: 40px 0; color: var(--dim); font-size: 0.85rem; }
  .studio-wall {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 64px 16px;
    text-align: center;
    color: var(--mid);
  }
  .studio-wall-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

  .studio-shell { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: clamp(20px, 2.5vw, 40px); }
  .studio-nav {
    position: sticky;
    top: var(--nav-h);
    height: calc(100vh - var(--nav-h));
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
    padding-right: 12px;
  }
  .studio-main { min-width: 0; }
  .studio {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: clamp(24px, 3.5vw, 64px);
    padding-top: 16px;
  }
  .studio-add {
    position: sticky;
    top: calc(var(--nav-h) + 16px);
    height: calc(100vh - var(--nav-h) - 32px);
    align-self: start;
  }
  .studio-fab { display: none; }

  @media (max-width: 1100px) {
    .studio-shell { grid-template-columns: minmax(0, 1fr); gap: 0; }
    .studio-nav { position: static; height: auto; border-right: none; padding-right: 0; }
  }

  @media (max-width: 900px) {
    .studio { grid-template-columns: 1fr; padding-top: 8px; }
    .studio-add {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 600;
      height: auto;
      align-self: stretch;
      padding: calc(16px + env(safe-area-inset-top)) 16px env(safe-area-inset-bottom);
      background: var(--bg);
    }
    .studio-add.open { display: block; }
    .studio-fab {
      display: block;
      position: fixed;
      left: 50%;
      bottom: calc(18px + env(safe-area-inset-bottom));
      transform: translateX(-50%);
      z-index: 50;
      padding: 14px 26px;
      border: none;
      border-radius: 999px;
      background: var(--accent);
      color: var(--on-accent);
      font-family: "Barlow Condensed", sans-serif;
      font-weight: 900;
      font-size: 0.95rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      box-shadow: 0 10px 30px rgb(var(--accent-rgb) / 0.4);
      cursor: pointer;
    }
    .studio-tracks { padding-bottom: 72px; }
  }

  /* Au-dessus de la barre de navigation du bas (58 px) */
  @media (max-width: 768px) {
    .studio-fab { bottom: calc(58px + 14px + env(safe-area-inset-bottom)); }
    .studio-tracks { padding-bottom: 140px; }
  }
</style>
