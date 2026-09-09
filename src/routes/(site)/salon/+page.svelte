<script>
  import { onMount } from 'svelte';
  import { createSupabaseClient } from '$lib/supabase.js';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import PlaylistPicker from '$lib/components/salon/PlaylistPicker.svelte';
  import { loadSalonPlaylists } from '$lib/salonPlaylists.js';

  const salonJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Mode Salon — Blind Test en Soirée | ZIK",
    "description": "Organisez un blind test en soirée avec le Mode Salon ZIK. Un hôte diffuse la musique sur grand écran, les joueurs répondent depuis leur smartphone.",
    "url": "https://www.zik-music.fr/salon",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.zik-music.fr/" },
        { "@type": "ListItem", "position": 2, "name": "Mode Salon", "item": "https://www.zik-music.fr/salon" }
      ]
    }
  });

  let { data } = $props();

  const sb = createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey);

  let user      = $state(null);
  let authReady = $state(false);
  let authOpen  = $state(false);
  let authView  = $state('login');

  // Paramètres du salon
  let maxRounds          = $state(10);
  let roundDuration      = $state(30);
  let answerMode         = $state('free');
  let manualNext         = $state(false);
  let showAnswerDuration = $state(7);

  // Playlist picker (multi-select)
  let allPlaylists = $state([]);
  let selectedIds  = $state([]);   // tableau d'IDs
  let creating     = $state(false);
  let error        = $state('');

  let totalTrackCount = $derived(
    allPlaylists
      .filter(p => selectedIds.includes(p.id))
      .reduce((s, p) => s + (p.trackCount || 0), 0)
  );

  function clamp(val, min, max) { return Math.min(max, Math.max(min, Number(val) || min)); }

  async function loadPlaylists() {
    if (!user) return;
    try {
      const flat = await loadSalonPlaylists(sb, user.id);
      allPlaylists = flat;
      if (selectedIds.length === 0 && flat.length > 0) selectedIds = [flat[0].id];
    } catch {
      error = 'Impossible de charger les playlists.';
    }
  }

  async function createSalon() {
    error = '';
    if (selectedIds.length === 0) { error = 'Sélectionne au moins une playlist.'; return; }
    creating = true;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error('Session expirée, reconnecte-toi.');
      const res = await fetch('/api/salon', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          playlistIds: selectedIds,
          settings: { maxRounds, roundDuration, answerMode, manualNext, showAnswerDuration },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erreur création salon');
      window.location.href = `/salon/host?code=${d.code}`;
    } catch (e) {
      error = e.message;
      creating = false;
    }
  }

  onMount(async () => {
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    user = session?.user ?? null;
    authReady = true;
    if (user) loadPlaylists();

    sb.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
      if (user) loadPlaylists();
    });
  });
</script>

<svelte:head>
  <title>Mode Salon — Blind Test en Soirée sur TV &amp; Smartphones | ZIK</title>
  <meta name="description" content="Organisez un blind test en soirée avec le Mode Salon ZIK. Un hôte diffuse la musique sur grand écran, les joueurs répondent depuis leur smartphone. Style Kahoot, avec vos musiques. Gratuit." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/salon" />

  <meta property="og:title" content="Mode Salon — Blind Test en Soirée | ZIK" />
  <meta property="og:description" content="Blind test en soirée : grand écran sur la TV, smartphones comme manettes. Style Kahoot avec vos playlists Spotify/Deezer. Gratuit, sans inscription." />
  <meta property="og:url" content="https://www.zik-music.fr/salon" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.8.1" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Mode Salon — Blind Test en Soirée | ZIK" />
  <meta name="twitter:description" content="Organisez un blind test sur TV + smartphones. Style Kahoot, avec vos musiques. Gratuit." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png?v=3.8.1" />

  <script type="application/ld+json">{@html salonJsonLd}</script>
</svelte:head>

<div class="salon-blob b1"></div>
<div class="salon-blob b2"></div>

<div class="salon-setup">
  <a class="salon-back" href="/">← Accueil du site</a>

  <div class="salon-hero">
    <div class="salon-hero-kicker">Mode soirée — TV + smartphones</div>
    <h1 class="salon-setup-logo">ZIK <span>Salon</span></h1>
    <p class="salon-setup-sub">La TV diffuse, les téléphones répondent. Comme Kahoot, avec ta musique.</p>
    <div class="salon-hero-steps">
      <span class="salon-hero-step"><i>1</i>Configure</span>
      <span class="salon-hero-step"><i>2</i>Partage le code</span>
      <span class="salon-hero-step"><i>3</i>Jouez !</span>
    </div>
  </div>

  {#if !authReady}
    <div class="salon-card" style="text-align:center;color:var(--mid)">Chargement…</div>

  {:else if !user}
    <div class="salon-card salon-card-guest">
      <p class="salon-guest-txt">
        Tu es invité à une soirée ? Rejoins le salon avec le code de l'hôte —
        <b>pas besoin de compte</b>.
      </p>
      <a href="/salon/play" class="btn-salon-create salon-guest-join">Rejoindre un salon →</a>
      <p class="salon-guest-sub">Pour <b>créer</b> un salon en revanche, il faut être connecté.</p>
      <button type="button" class="salon-join-link" onclick={() => { authView = 'login'; authOpen = true; }}>Se connecter →</button>
    </div>

  {:else}
    <div class="salon-setup-grid">

      <!-- Colonne gauche : paramètres -->
      <div class="salon-card salon-card-params">
        <div class="salon-card-kicker"><b>01</b> Paramètres</div>

        <div class="salon-field">
          <label>Nombre de manches</label>
          <div class="salon-range-row">
            <input type="range" min="5" max="20" step="1" bind:value={maxRounds}
              style="--p:{((maxRounds - 5) / 15) * 100}%">
            <input type="number" min="5" max="20" step="1" class="salon-range-num" bind:value={maxRounds}
              onchange={() => maxRounds = clamp(maxRounds, 5, 20)}>
          </div>
        </div>

        <div class="salon-field">
          <label>Durée par manche</label>
          <div class="salon-range-row">
            <input type="range" min="15" max="60" step="5" bind:value={roundDuration}
              style="--p:{((roundDuration - 15) / 45) * 100}%">
            <input type="number" min="15" max="60" step="5" class="salon-range-num" bind:value={roundDuration}
              onchange={() => roundDuration = clamp(roundDuration, 15, 60)}>
            <span class="salon-range-unit">s</span>
          </div>
        </div>

        <div class="salon-divider"></div>

        <div class="salon-field">
          <label>Mode réponse</label>
          <div class="salon-mode-btns">
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div class="salon-mode-btn {answerMode === 'free' ? 'selected' : ''}" onclick={() => answerMode = 'free'}>
              <span class="salon-mode-led"></span>
              <span class="mode-icon">⌨️</span>
              <div class="mode-name">Texte libre</div>
              <div class="mode-desc">Pur savoir, aucun hasard</div>
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div class="salon-mode-btn {answerMode === 'multiple' ? 'selected' : ''}" onclick={() => answerMode = 'multiple'}>
              <span class="salon-mode-led"></span>
              <span class="mode-icon">🎯</span>
              <div class="mode-name">Choix multiples</div>
              <div class="mode-desc">4 options, une seule bonne</div>
            </div>
          </div>
        </div>

        <div class="salon-divider"></div>

        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="salon-field">
          <div class="salon-toggle-row" onclick={() => manualNext = !manualNext}>
            <div>
              <div class="salon-toggle-label">Avancer manuellement</div>
              <div class="salon-toggle-desc">L'hôte clique pour passer à la manche suivante</div>
            </div>
            <div class="salon-toggle {manualNext ? 'on' : ''}"></div>
          </div>
        </div>

        {#if !manualNext}
          <div class="salon-field">
            <label>Durée d'affichage de la réponse</label>
            <div class="salon-range-row">
              <input type="range" min="3" max="15" step="1" bind:value={showAnswerDuration}
                style="--p:{((showAnswerDuration - 3) / 12) * 100}%">
              <input type="number" min="3" max="15" step="1" class="salon-range-num" bind:value={showAnswerDuration}
                onchange={() => showAnswerDuration = clamp(showAnswerDuration, 3, 15)}>
              <span class="salon-range-unit">s</span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Colonne droite : sélection playlists (multi) -->
      <div class="salon-card salon-card-playlist">
        <div class="salon-card-kicker"><b>02</b> Playlists</div>

        <PlaylistPicker playlists={allPlaylists} bind:selectedIds />
      </div>

    </div>

    {#if error}
      <p class="salon-error" style="margin-top:12px">{error}</p>
    {/if}
  {/if}
</div>

{#if authReady && user}
  <div class="salon-actionbar">
    <div class="salon-actionbar-in">
      <div class="salon-recap">
        <div><div class="n">{selectedIds.length}</div><div class="l">Playlist{selectedIds.length > 1 ? 's' : ''}</div></div>
        <div class="sep"></div>
        <div><div class="n">{totalTrackCount}</div><div class="l">Titres</div></div>
        <div class="sep"></div>
        <div><div class="n">{maxRounds}</div><div class="l">Manches</div></div>
      </div>
      <a href="/salon/play" class="salon-join-link">Pas l'hôte ? Rejoindre un salon →</a>
      <button class="btn-salon-create" onclick={createSalon} disabled={creating || selectedIds.length === 0}>
        {creating ? 'Création…' : 'Créer le salon →'}
      </button>
    </div>
  </div>
{/if}

<AuthModal {sb} open={authOpen} bind:view={authView} onClose={() => (authOpen = false)} onSuccess={() => (authOpen = false)} />
